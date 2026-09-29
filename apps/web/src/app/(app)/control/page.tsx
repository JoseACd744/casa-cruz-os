import Link from "next/link";
import { BotonAccion } from "@/components/BotonAccion";
import { Badge, Seccion } from "@/components/ui";
import {
  alcanza,
  CAMPOS,
  confiabilidad,
  estadoValidaciones,
  motivoParaNoAprobar,
  type EstadoValidacion,
} from "@casacruz/core";
import { resolverCambio } from "@/lib/acciones/gobierno";
import { etiquetaEstatus, etiquetaFuente } from "@casacruz/core";
import {
  conteoPipeline,
  listarCambios,
  listarDesarrollos,
  listarUsuarios,
  obtenerUsuarioActual,
} from "@/lib/repo";

const PERMISOS: { campo: string; celdas: ("V" | "E" | "A" | "—")[] }[] = [
  { campo: "Precio y multimedia", celdas: ["V", "E", "E", "E"] },
  { campo: "Disponibilidad", celdas: ["—", "E", "E", "E"] },
  { campo: "Argumentos y objeciones", celdas: ["—", "E", "E", "E"] },
  { campo: "Comisiones", celdas: ["—", "A", "E", "E"] },
  { campo: "Entrega contractual", celdas: ["V", "A", "E", "E"] },
  { campo: "Convenios y márgenes", celdas: ["—", "—", "V", "E"] },
  { campo: "Trazabilidad y auditoría", celdas: ["—", "V", "V", "E"] },
];

const estiloCelda: Record<string, string> = {
  V: "bg-[#F2EFE9] text-ink-2",
  E: "bg-tan-soft text-ink",
  A: "bg-warn-soft text-warn-ink",
  "—": "text-faint",
};

const estiloEstado: Record<EstadoValidacion, string> = {
  vigente: "bg-ok-soft text-ok-ink",
  por_vencer: "bg-warn-soft text-warn-ink",
  vencido: "bg-alert-soft text-alert-ink",
  sin_validar: "bg-alert-soft text-alert-ink",
};

const textoEstado: Record<EstadoValidacion, string> = {
  vigente: "AL DÍA",
  por_vencer: "POR VENCER",
  vencido: "VENCIDO",
  sin_validar: "SIN VALIDAR",
};

export default async function ControlPage() {
  const actual = await obtenerUsuarioActual();
  const esGerente = alcanza(actual.rol, "gerente");
  const [pipeline, pendientes, desarrollos, equipo] = await Promise.all([
    conteoPipeline(),
    listarCambios("pendiente"),
    listarDesarrollos(),
    esGerente ? listarUsuarios() : Promise.resolve([actual]),
  ]);
  // Un cerrador ve su propia fila; el gerente, a todo su equipo.
  const usuarios = esGerente ? equipo.filter((u) => u.rol === "cerrador") : equipo;

  const responsables = usuarios.map((u) => {
    const mios = desarrollos.filter((d) => d.responsableId === u.id);
    const scores = mios.map(confiabilidad);
    const promedio = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const peorPorCampo = CAMPOS.map((c) => {
      const estados = mios.map(
        (d) => estadoValidaciones(d).find((e) => e.campo === c.campo)!.estado,
      );
      const orden: EstadoValidacion[] = ["sin_validar", "vencido", "por_vencer", "vigente"];
      return estados.length
        ? estados.reduce((peor, e) => (orden.indexOf(e) < orden.indexOf(peor) ? e : peor), "vigente" as EstadoValidacion)
        : ("sin_validar" as EstadoValidacion);
    });

    return { usuario: u, cantidad: mios.length, promedio, peorPorCampo };
  });

  return (
    <>
      <header className="encabezado">
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">CONTROL DEL DATO</span>
        <div className="grow" />
        {esGerente ? (
          <Link
            href="/control/usuarios"
            className="text-[11px] font-semibold tracking-[0.08em] text-tan-deep hover:text-ink"
          >
            USUARIOS Y PERMISOS
          </Link>
        ) : null}
      </header>

      <div className="flex flex-col gap-5 overflow-auto p-4 md:p-7">
        <Seccion titulo="Flujo de alta de un listing">
          <div className="flex gap-2.5">
            {(Object.keys(pipeline) as (keyof typeof pipeline)[]).map((k) => {
              const publicado = k === "publicado";
              return (
                <div
                  key={k}
                  className={`flex grow flex-col gap-2.5 rounded-[3px] border p-4.5 ${
                    publicado ? "border-ink bg-ink" : "border-line bg-surface"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold tracking-[0.14em] uppercase ${
                      publicado ? "text-tan" : "text-muted"
                    }`}
                  >
                    {etiquetaEstatus[k]}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-[26px] font-extrabold tracking-[-0.02em] ${
                        publicado ? "text-white" : ""
                      }`}
                    >
                      {pipeline[k]}
                    </span>
                    <span className={`text-[11px] ${publicado ? "text-[#A09991]" : "text-muted"}`}>
                      desarrollos
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Seccion>

        <div className="flex items-start gap-5">
          <Seccion
            titulo={`Cambios pendientes de aprobación`}
            className="w-203"
            accion={<Badge tono="warn">{pendientes.length}</Badge>}
          >
            <div className="flex flex-col gap-2.5">
              {pendientes.length === 0 ? (
                <p className="py-4 text-[12.5px] text-muted">No hay cambios esperando aprobación.</p>
              ) : null}
              {pendientes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4.5 rounded-[3px] border border-line px-4 py-3.5"
                >
                  <div className="flex w-54 flex-col gap-1">
                    <Link
                      href={`/propiedades/${c.desarrolloId}`}
                      className="text-[13.5px] font-bold hover:text-tan-deep"
                    >
                      {c.desarrolloNombre}
                    </Link>
                    <span className="text-[11px] text-muted">{c.campo}</span>
                  </div>
                  <div className="flex w-47 flex-col gap-1">
                    <span className="text-[12px] text-muted line-through">{c.valorAnterior}</span>
                    <span className="text-[14px] font-bold">{c.valorNuevo}</span>
                  </div>
                  <div className="flex grow flex-col gap-1">
                    <span className="text-[11px] font-semibold text-ink-2">
                      {c.usuario} · {c.fecha}
                    </span>
                    <span
                      className={`text-[11px] ${c.evidencia ? "text-tan-deep" : "text-alert"}`}
                    >
                      {etiquetaFuente[c.fuente]}
                      {c.evidencia && /^https?:\/\//.test(c.evidencia) ? (
                        <>
                          {" · "}
                          <a href={c.evidencia} target="_blank" rel="noopener" className="underline hover:text-ink">
                            ver evidencia
                          </a>
                        </>
                      ) : c.evidencia ? (
                        ` · ${c.evidencia}`
                      ) : (
                        " · sin evidencia"
                      )}
                    </span>
                  </div>
                  {(() => {
                    const motivo = motivoParaNoAprobar(c, actual);
                    if (motivo) {
                      return (
                        <span className="w-44 text-right text-[10.5px] leading-snug text-muted">
                          {c.usuarioId === actual.id ? "Tu cambio: lo valida otro gerente" : motivo.mensaje}
                        </span>
                      );
                    }
                    return (
                      <>
                        <BotonAccion
                          accion={resolverCambio.bind(null, c.id, "aprobar")}
                          enCurso="APROBANDO…"
                          className="h-9 rounded-[3px] bg-ink px-3.5 text-[10.5px] font-bold tracking-[0.08em] text-white hover:brightness-125"
                        >
                          APROBAR
                        </BotonAccion>
                        <BotonAccion
                          accion={resolverCambio.bind(null, c.id, "rechazar")}
                          enCurso="…"
                          confirmar={`¿Rechazar el cambio de ${c.campo} en ${c.desarrolloNombre}? El valor actual se queda como está.`}
                          className="h-9 rounded-[3px] border border-[#C9C1B6] px-3.5 text-[10.5px] font-bold tracking-[0.08em] text-alert-ink hover:bg-alert-soft"
                        >
                          RECHAZAR
                        </BotonAccion>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion titulo="Quién ve y quién edita" className="grow">
            <div className="flex">
              <span className="w-39.5" />
              {["CLI", "CER", "GER", "CORP"].map((h) => (
                <span
                  key={h}
                  className="grow text-center text-[9.5px] font-bold tracking-[0.08em] text-muted"
                >
                  {h}
                </span>
              ))}
            </div>
            {PERMISOS.map((p) => (
              <div key={p.campo} className="flex items-center border-t border-line py-2.5">
                <span className="w-39.5 text-[11.5px]">{p.campo}</span>
                {p.celdas.map((c, i) => (
                  <span key={i} className="grow text-center">
                    <span
                      className={`inline-block w-6.5 rounded-[2px] py-1 text-[10.5px] font-bold ${estiloCelda[c]}`}
                    >
                      {c}
                    </span>
                  </span>
                ))}
              </div>
            ))}
            <div className="flex gap-3.5 pt-1">
              <span className="text-[10px] text-muted">V ver</span>
              <span className="text-[10px] text-muted">E editar</span>
              <span className="text-[10px] text-muted">A requiere aprobación</span>
            </div>
          </Seccion>
        </div>

        <Seccion
          titulo="Responsabilidad de actualización por cerrador"
          accion={<span className="text-[11px] text-muted">Validación semanal · rotación mensual</span>}
        >
          <div className="flex rounded-[3px] bg-surface">
            <span className="w-50 px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">
              RESPONSABLE
            </span>
            <span className="w-33 px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">
              A SU CARGO
            </span>
            {CAMPOS.map((c) => (
              <span
                key={c.campo}
                className="grow px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted uppercase"
              >
                {c.etiqueta}
              </span>
            ))}
            <span className="w-33 px-3.5 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted">
              CONFIABILIDAD
            </span>
          </div>
          {responsables.map((e) => (
            <div key={e.usuario.id} className="flex items-center border-b border-line">
              <span className="w-50 px-3.5 py-3 text-[13px] font-semibold">{e.usuario.nombre}</span>
              <span className="w-33 px-3.5 py-3 text-[12px] text-ink-2">
                {e.cantidad} desarrollos
              </span>
              {e.peorPorCampo.map((estado, i) => (
                <span key={i} className="grow px-3.5 py-3">
                  <span
                    className={`rounded-[2px] px-2 py-1.5 text-[10px] font-bold tracking-[0.08em] ${estiloEstado[estado]}`}
                  >
                    {textoEstado[estado]}
                  </span>
                </span>
              ))}
              <span className="w-33 px-3.5 py-3">
                <span
                  className={`text-[15px] font-extrabold ${
                    e.promedio >= 85 ? "text-ok-ink" : e.promedio >= 65 ? "text-warn-ink" : "text-alert-ink"
                  }`}
                >
                  {e.promedio}%
                </span>
              </span>
            </div>
          ))}
        </Seccion>
      </div>
    </>
  );
}
