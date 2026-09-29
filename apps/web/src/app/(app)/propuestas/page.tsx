import Link from "next/link";
import { BotonAccion } from "@/components/BotonAccion";
import { Tabla } from "@/components/Tabla";
import { Badge, Card, Eyebrow } from "@/components/ui";
import { marcarEnviada } from "@/lib/acciones/comercial";
import { etiquetaEstadoPropuesta, etiquetaFormato, tonoEstadoPropuesta } from "@/lib/etiquetas";
import { listarClientes, listarDesarrollos, listarPropuestas } from "@/lib/repo";

export default async function PropuestasPage() {
  const [propuestas, clientes, desarrollos] = await Promise.all([
    listarPropuestas(),
    listarClientes(),
    listarDesarrollos(),
  ]);

  const filas = propuestas.map((p) => ({
    propuesta: p,
    cliente: clientes.find((c) => c.id === p.clienteId),
    propiedades: p.items
      .map((i) => desarrollos.find((d) => d.id === i.desarrolloId)?.nombre)
      .filter(Boolean)
      .join(" · "),
  }));

  const vistas = propuestas.filter((p) => p.vistas > 0).length;

  return (
    <div className="flex flex-col gap-5 overflow-auto p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[24px] font-extrabold tracking-[-0.015em] md:text-[30px]">Propuestas</h1>
          <p className="text-[13px] text-ink-2">
            {propuestas.length} propuestas generadas · {vistas} abiertas por el cliente
          </p>
        </div>
        <div className="hidden grow md:block" />
        <Link
          href="/propuestas/nueva"
          className="flex h-12 items-center justify-center gap-2.5 md:h-11.5 md:justify-start rounded-[3px] bg-ink px-5 text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          NUEVA PROPUESTA
        </Link>
      </div>

      <Card className="p-3 md:overflow-hidden md:p-0">
        <Tabla
          columnas={[
            { titulo: "Cliente", ancho: "md:w-65", principal: true },
            { titulo: "Propiedades" },
            { titulo: "Formato", ancho: "md:w-40" },
            { titulo: "Enviada", ancho: "md:w-40" },
            { titulo: "Vistas", ancho: "md:w-22" },
            { titulo: "Estado", ancho: "md:w-48" },
            { titulo: "", ancho: "md:w-60" },
          ]}
          filas={filas.map(({ propuesta: p, cliente, propiedades }) => ({
            clave: p.id,
            celdas: [
              <Link key="c" href={`/clientes/${p.clienteId}`} className="font-bold hover:text-tan-deep">
                {cliente?.nombre ?? "[CLIENTE]"}
              </Link>,
              <span key="p" className="text-[12px] text-ink-2">
                {propiedades}
              </span>,
              <span key="f" className="text-[12px] text-ink-2">
                {etiquetaFormato[p.formato]}
              </span>,
              p.enviadaEl ? (
                <span key="e" className="text-[12px] text-ink-2">
                  {p.enviadaEl}
                </span>
              ) : (
                <BotonAccion
                  key="e"
                  accion={marcarEnviada.bind(null, p.slug)}
                  className="tocable flex items-center rounded-[3px] border border-[#C9C1B6] px-2.5 text-[9.5px] font-bold tracking-[0.06em] hover:bg-surface md:h-8"
                >
                  MARCAR ENVIADA
                </BotonAccion>
              ),
              <span key="v" className="text-[13px] font-bold">
                {p.vistas || "—"}
              </span>,
              <Badge key="s" tono={tonoEstadoPropuesta[p.estado]}>
                {etiquetaEstadoPropuesta[p.estado]}
              </Badge>,
              <div key="a" className="flex gap-2">
                {[
                  ["WEB", `/p/${p.slug}`],
                  ["PDF", `/doc/pdf/${p.slug}`],
                  ["DECK", `/doc/presentacion/${p.slug}`],
                ].map(([texto, href]) => (
                  <Link
                    key={texto}
                    href={href}
                    target="_blank"
                    className="flex h-10 flex-1 items-center justify-center rounded-[3px] border border-[#C9C1B6] px-3 text-[10px] font-bold tracking-[0.06em] hover:bg-surface md:h-8.5 md:flex-none"
                  >
                    {texto}
                  </Link>
                ))}
              </div>,
            ],
          }))}
        />
      </Card>

      <Card className="flex items-start gap-4 p-5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.7" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Cómo se cuentan las vistas</Eyebrow>
          <span className="text-[12.5px] leading-relaxed text-ink-2">
            Cada propuesta vive en su propio enlace. Cuando el cliente lo abre, el sistema registra
            la visita y la escribe en el lead de Kommo, para que el cerrador sepa cuándo dar
            seguimiento y qué propiedad miró más.
          </span>
        </div>
      </Card>
    </div>
  );
}
