import Link from "next/link";
import { fechaDocumento, type EstadoPlaza } from "@casacruz/core";
import { BotonAccion } from "@/components/BotonAccion";
import { ListaPreparacion } from "@/components/Capacitacion";
import { Badge, Barra, Card, Seccion } from "@/components/ui";
import { completarModulo } from "@/lib/acciones/capacitacion";
import { usandoApi } from "@/lib/api";
import { listarDesarrollos, listarPlazas, obtenerCapacitacion } from "@/lib/repo";

const BIBLIOTECA = [
  { titulo: "Guion de primera llamada", meta: "Metodología" },
  { titulo: "Cómo explicar el due diligence de Casa Cruz", meta: "Argumentos" },
  { titulo: "Clientes que viven en Estados Unidos", meta: "Casos" },
  { titulo: "Comparables por plaza", meta: "Producto" },
  { titulo: "Certificaciones y respaldo de la empresa", meta: "Institucional" },
];

const ESTADO: Record<EstadoPlaza["estado"], { texto: string; tono: "ok" | "warn" | "alert" | "neutral" }> = {
  certificado: { texto: "CERTIFICADO", tono: "ok" },
  en_progreso: { texto: "EN PROGRESO", tono: "warn" },
  vencido: { texto: "VENCIDO", tono: "alert" },
  no_iniciado: { texto: "NO INICIADO", tono: "neutral" },
};

function detalleDe(p: EstadoPlaza): string {
  const hechos = p.modulos.filter((m) => m.completado).length;
  switch (p.estado) {
    case "certificado":
      return p.venceIso ? `Vigente hasta ${fechaDocumento(new Date(p.venceIso))}` : "Sin vencimiento";
    case "vencido":
      return `Venció el ${fechaDocumento(new Date(p.venceIso!))}: presenta la evaluación de nuevo`;
    case "en_progreso":
      return `${hechos} de ${p.modulos.length} módulos · falta la evaluación`;
    case "no_iniciado":
      return "Puedes consultar la plaza, no venderla";
  }
}

export default async function CapacitacionPage({
  searchParams,
}: {
  searchParams: Promise<{ plaza?: string; desarrollo?: string }>;
}) {
  const { plaza: plazaElegida, desarrollo: desarrolloElegido } = await searchParams;
  const [capacitacion, plazas, desarrollos] = await Promise.all([
    obtenerCapacitacion(),
    listarPlazas(),
    listarDesarrollos(),
  ]);
  const nombrePlaza = (id: string) => plazas.find((p) => p.id === id)?.nombre ?? id;

  const actual =
    capacitacion.plazas.find((p) => p.plazaId === plazaElegida) ??
    capacitacion.plazas.find((p) => p.estado === "en_progreso") ??
    capacitacion.plazas[0];

  // "Antes de vender": sólo lo que ya puede proponer (publicado y en sus plazas).
  const certificadas = capacitacion.plazas.filter((p) => p.estado === "certificado").map((p) => p.plazaId);
  const vendibles = desarrollos.filter((d) => d.estatus === "publicado" && certificadas.includes(d.plazaId));
  const desarrollo = vendibles.find((d) => d.id === desarrolloElegido) ?? vendibles[0];
  const hechos = capacitacion.preparacion.find((p) => p.desarrolloId === desarrollo?.id)?.items ?? [];

  return (
    <div className="flex flex-col gap-5 overflow-auto p-4 app:p-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[24px] font-extrabold app:text-[28px] tracking-[-0.015em]">Capacitación y certificaciones</h1>
        <span className="text-[13px] text-ink-2">
          La tecnología no sustituye la capacitación: sólo puedes vender las plazas en las que estás
          certificado. La certificación dura un año.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-4 app:gap-4">
        {capacitacion.plazas.map((p) => {
          const e = ESTADO[p.estado];
          return (
            <Link
              key={p.plazaId}
              href={`/capacitacion?plaza=${p.plazaId}`}
              className={`flex flex-col gap-3 rounded-card border bg-panel p-4.5 hover:border-[#C9C1B6] ${
                p.plazaId === actual?.plazaId ? "border-ink" : "border-line"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold">{nombrePlaza(p.plazaId)}</span>
                <div className="grow" />
                <Badge tono={e.tono}>{e.texto}</Badge>
              </div>
              <Barra valor={p.avance} tono={e.tono} />
              <span className="text-[11.5px] text-muted">{detalleDe(p)}</span>
            </Link>
          );
        })}
        {plazas
          .filter((p) => !p.activa)
          .map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-4.5 opacity-70">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold">{p.nombre}</span>
                <div className="grow" />
                <Badge>PRÓXIMAMENTE</Badge>
              </div>
              <Barra valor={0} tono="neutral" />
              <span className="text-[11.5px] text-muted">Plaza en apertura</span>
            </Card>
          ))}
      </div>

      <div className="flex flex-col gap-5 app:flex-row app:items-start">
        {actual ? (
          <Seccion
            titulo={`Ruta de certificación · ${nombrePlaza(actual.plazaId)}`}
            className="app:w-175 app:shrink-0"
            accion={
              <span className={`text-[11.5px] font-bold ${actual.estado === "certificado" ? "text-ok-ink" : "text-warn-ink"}`}>
                {actual.avance}%
              </span>
            }
          >
            <div className="flex flex-col gap-3">
              {actual.modulos.map(({ modulo: m, completado }) => (
                <div key={m.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[3px] border border-line p-3.5">
                  <span
                    className={`flex size-7.5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      completado ? "bg-ink text-white" : "bg-[#EFEAE2] text-muted"
                    }`}
                  >
                    {m.orden}
                  </span>
                  <div className="flex min-w-0 grow basis-40 flex-col gap-1">
                    <span className="text-[13.5px] font-bold">{m.titulo}</span>
                    <span className="text-[11.5px] text-muted">
                      {m.detalle}
                      {m.ejemplo ? " · contenido de ejemplo" : ""}
                    </span>
                  </div>
                  <Badge tono={completado ? "ok" : "neutral"}>{completado ? "visto" : "pendiente"}</Badge>
                  {m.url ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener"
                      className="flex h-11 items-center rounded-[3px] border border-[#C9C1B6] px-3.5 text-[10.5px] font-bold tracking-[0.06em] hover:bg-surface app:h-8.5"
                    >
                      {completado ? "REPASAR" : "EMPEZAR"}
                    </a>
                  ) : null}
                  {!completado && usandoApi ? (
                    <BotonAccion
                      accion={completarModulo.bind(null, m.id)}
                      className="h-11 rounded-[3px] bg-ink px-3.5 text-[10.5px] font-bold tracking-[0.06em] text-white hover:brightness-125 app:h-8.5"
                    >
                      MARCAR COMO VISTO
                    </BotonAccion>
                  ) : null}
                </div>
              ))}

              <div
                className={`flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[3px] border p-3.5 ${
                  actual.estado === "certificado" ? "border-ok/30 bg-ok-soft" : "border-line"
                }`}
              >
                <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-tan text-[12px] font-bold text-ink">
                  ✓
                </span>
                <div className="flex min-w-0 grow basis-40 flex-col gap-1">
                  <span className="text-[13.5px] font-bold">Evaluación de certificación</span>
                  <span className="text-[11.5px] text-muted">
                    {actual.estado === "certificado"
                      ? detalleDe(actual)
                      : actual.ultimoIntento
                        ? `Último intento: ${actual.ultimoIntento.aciertos} de ${actual.ultimoIntento.total}${
                            actual.ultimoIntento.aprobado ? " · aprobada" : " · se aprueba con 80 %"
                          }`
                        : "Se aprueba con 80 % · certifica por un año"}
                  </span>
                </div>
                {actual.estado === "certificado" ? (
                  <Badge tono="ok">certificado</Badge>
                ) : actual.puedeEvaluarse ? (
                  <Link
                    href={`/capacitacion/${actual.plazaId}/evaluacion`}
                    className="flex h-11 items-center rounded-[3px] bg-tan px-3.5 text-[10.5px] font-bold tracking-[0.06em] text-ink hover:brightness-105 app:h-8.5"
                  >
                    PRESENTAR EVALUACIÓN
                  </Link>
                ) : (
                  <span className="text-[11px] text-muted app:w-40 app:text-right">Termina los módulos para presentarla</span>
                )}
              </div>
            </div>
          </Seccion>
        ) : null}

        <div className="flex w-full grow flex-col gap-5 app:w-auto">
          <Seccion titulo={desarrollo ? `Antes de vender ${desarrollo.nombre}` : "Antes de vender"}>
            {desarrollo ? (
              <>
                {vendibles.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {vendibles.map((d) => (
                      <Link
                        key={d.id}
                        href={`/capacitacion?${new URLSearchParams({
                          ...(actual ? { plaza: actual.plazaId } : {}),
                          desarrollo: d.id,
                        })}`}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                          d.id === desarrollo.id ? "border-ink bg-ink text-white" : "border-line text-ink-2"
                        }`}
                      >
                        {d.nombre}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {usandoApi ? (
                  <ListaPreparacion
                    key={desarrollo.id}
                    desarrolloId={desarrollo.id}
                    lista={capacitacion.listaPreparacion}
                    hechos={hechos}
                  />
                ) : (
                  <span className="text-[12px] text-muted">Se marca con la API conectada.</span>
                )}
              </>
            ) : (
              <span className="text-[12.5px] text-muted">
                Cuando te certifiques en una plaza, aquí aparecen sus desarrollos publicados.
              </span>
            )}
          </Seccion>

          <Seccion titulo="Biblioteca comercial">
            <div className="flex flex-col gap-3">
              {BIBLIOTECA.map((b) => (
                <div key={b.titulo} className="flex items-center gap-3 border-b border-line pb-3 last:border-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.7">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
                  </svg>
                  <span className="grow text-[12.5px] font-semibold">{b.titulo}</span>
                  <span className="text-[11px] text-muted">{b.meta} · próximamente</span>
                </div>
              ))}
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );
}
