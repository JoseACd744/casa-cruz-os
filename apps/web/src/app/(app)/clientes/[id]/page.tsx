import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonAccion } from "@/components/BotonAccion";
import { FormCliente } from "@/components/FormCliente";
import { Badge, Card, Campo, Eyebrow, Seccion } from "@/components/ui";
import { moneyCorto } from "@casacruz/core";
import { marcarEnviada } from "@/lib/acciones/comercial";
import { usandoApi } from "@/lib/api";
import { etiquetaEstadoPropuesta, etiquetaFormato, tonoEstadoPropuesta } from "@/lib/etiquetas";
import {
  listarPlazas,
  listarPropuestas,
  listarUsuarios,
  obtenerCliente,
  obtenerIntegraciones,
  obtenerUsuarioActual,
} from "@/lib/repo";

const OBJETIVO: Record<string, string> = { vivienda: "Para vivir", inversion: "Inversión", retiro: "Retiro" };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cliente, todas, plazas, integraciones, actual, equipo] = await Promise.all([
    obtenerCliente(id),
    listarPropuestas(),
    listarPlazas(),
    obtenerIntegraciones(),
    obtenerUsuarioActual(),
    listarUsuarios(),
  ]);
  if (!cliente) notFound();
  const propuestas = todas.filter((p) => p.clienteId === cliente.id);
  const plazasInteres = cliente.plazasInteres.map((p) => plazas.find((x) => x.id === p)?.nombre ?? p);
  const responsable =
    cliente.responsableId === actual.id
      ? actual.nombre
      : (equipo.find((u) => u.id === cliente.responsableId)?.nombre ?? "[SIN ASIGNAR]");

  return (
    <div className="flex flex-col gap-5 overflow-auto p-4 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
            Clientes / {cliente.nombre}
          </span>
          <h1 className="text-[24px] font-extrabold tracking-[-0.015em] md:text-[30px]">{cliente.nombre}</h1>
          <span className="text-[12.5px] text-ink-2">
            {cliente.ciudadResidencia ?? "[CIUDAD DE RESIDENCIA]"} ·{" "}
            {cliente.telefono ?? "[TELÉFONO]"} · {cliente.correo ?? "[CORREO]"}
          </span>
        </div>
        <div className="hidden grow md:block" />
        <Link
          href={`/propuestas/nueva?cliente=${encodeURIComponent(cliente.id)}`}
          className="flex h-12 items-center justify-center gap-2.5 rounded-[3px] bg-ink px-5 text-[11.5px] md:h-11.5 md:justify-start font-bold tracking-[0.1em] text-white hover:brightness-125"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          NUEVA PROPUESTA
        </Link>
      </div>

      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="flex w-full flex-col gap-5 md:w-185 md:shrink-0">
          <Seccion titulo="Qué nos compartió el cliente">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Campo label="Presupuesto">
                {moneyCorto(cliente.presupuestoMin)} – {moneyCorto(cliente.presupuestoMax)}
              </Campo>
              <Campo label="Recámaras">{cliente.recamaras ?? "[ ]"}</Campo>
              <Campo label="Objetivo">{cliente.objetivo ? OBJETIVO[cliente.objetivo] : "[ ]"}</Campo>
              <Campo label="Plazas">{plazasInteres.join(" · ") || "[ ]"}</Campo>
            </div>
            <div className="h-px bg-line" />
            <div className="flex flex-col gap-1.5">
              <Eyebrow>Notas del asesor</Eyebrow>
              <p className="text-[12.5px] leading-relaxed">
                {cliente.notas ?? "[SIN NOTAS]"}
              </p>
            </div>
            {usandoApi ? (
              <details className="group rounded-[3px] border border-line">
                <summary className="cursor-pointer list-none px-4 py-3 text-[10.5px] font-bold tracking-[0.1em] text-ink-2 hover:text-ink">
                  EDITAR LO QUE BUSCA EL CLIENTE
                </summary>
                <div className="border-t border-line p-4">
                  <FormCliente cliente={cliente} plazas={plazas} />
                </div>
              </details>
            ) : null}
          </Seccion>

          <Seccion
            titulo="Propuestas enviadas"
            accion={
              <span className="text-[11px] text-muted">
                La analítica se activa cuando el cliente abre el enlace
              </span>
            }
          >
            <div className="flex flex-col gap-3.5">
              {propuestas.length === 0 ? (
                <p className="text-[12.5px] text-muted">Todavía no se le ha enviado ninguna.</p>
              ) : null}
              {propuestas.map((p) => (
                <div key={p.id} className="flex flex-col gap-3.5 rounded-[3px] border border-line p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-[14px] font-bold">
                      Propuesta · {p.items.length} propiedades
                    </span>
                    <Badge tono={tonoEstadoPropuesta[p.estado]}>{etiquetaEstadoPropuesta[p.estado]}</Badge>
                    <div className="grow" />
                    <span className="font-mono text-[11px] text-muted">/{p.slug}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
                    <Campo label="Enviada">{p.enviadaEl ?? "sin enviar"}</Campo>
                    <Campo label="Vistas">{p.vistas || "—"}</Campo>
                    <Campo label="Formato">{etiquetaFormato[p.formato]}</Campo>
                    <div className="hidden grow md:block" />
                    {p.estado === "borrador" ? (
                      <BotonAccion
                        accion={marcarEnviada.bind(null, p.slug)}
                        enCurso="…"
                        className="flex h-11 items-center rounded-[3px] bg-ink px-3.5 text-[10.5px] font-bold tracking-[0.06em] text-white md:h-9"
                      >
                        MARCAR ENVIADA
                      </BotonAccion>
                    ) : null}
                    {[
                      ["MICROSITIO", `/p/${p.slug}`],
                      ["PDF", `/doc/pdf/${p.slug}`],
                      ["DECK", `/doc/presentacion/${p.slug}`],
                    ].map(([texto, href]) => (
                      <Link
                        key={texto}
                        href={href}
                        target="_blank"
                        className="flex h-11 items-center rounded-[3px] border border-[#C9C1B6] px-3.5 text-[10.5px] font-bold tracking-[0.06em] hover:bg-surface md:h-9"
                      >
                        {texto}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        </div>

        <div className="flex w-full grow flex-col gap-5 md:w-auto">
          <Card className="flex flex-col gap-3.5 p-5.5">
            <div className="flex items-center gap-2.5">
              <span className={`size-2 rounded-full ${integraciones.kommo && cliente.kommoLeadId ? "bg-ok" : "bg-faint"}`} />
              <Eyebrow>{integraciones.kommo ? "Kommo" : "Kommo sin conectar"}</Eyebrow>
            </div>
            {[
              ["Lead", cliente.kommoLeadId ? `#${cliente.kommoLeadId}` : "sin lead"],
              ["Etapa del pipeline", cliente.kommoEtapa ?? "—"],
              ["Responsable", responsable],
              ["Último movimiento", cliente.actividad[0]?.fecha ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[12.5px]">
                <span className="text-ink-2">{k}</span>
                <span className="font-bold">{v}</span>
              </div>
            ))}
            <div className="h-px bg-line" />
            <span className="text-[11.5px] leading-relaxed text-muted">
              Al generar una propuesta se escriben en el lead: la fecha, las propiedades
              presentadas, el enlace y la siguiente acción.
            </span>
            {cliente.kommoUrl ? (
              <a
                href={cliente.kommoUrl}
                target="_blank"
                rel="noopener"
                className="flex h-11 items-center justify-center rounded-[3px] border border-line bg-surface text-[10.5px] font-bold tracking-[0.08em] hover:border-[#C9C1B6]"
              >
                ABRIR EN KOMMO
              </a>
            ) : (
              <span className="text-[11px] text-muted">
                {cliente.kommoLeadId
                  ? "Cuando se conecte la cuenta de Kommo, aquí se abre el lead."
                  : "Escribe su número de lead para ligarlo con Kommo."}
              </span>
            )}
          </Card>

          <Card className="flex flex-col gap-3.5 p-5.5">
            <Eyebrow>Actividad</Eyebrow>
            {cliente.actividad.length === 0 ? <span className="text-[12px] text-muted">Sin movimientos.</span> : null}
            {cliente.actividad.map((a) => (
              <div key={a.fecha + a.texto} className="flex gap-3">
                <span className="w-16 shrink-0 font-mono text-[10.5px] text-muted uppercase">
                  {a.fecha}
                </span>
                <span className="text-[12px] leading-relaxed">{a.texto}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
