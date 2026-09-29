import Link from "next/link";
import { BotonAccion } from "@/components/BotonAccion";
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
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[30px] font-extrabold tracking-[-0.015em]">Propuestas</h1>
          <p className="text-[13px] text-ink-2">
            {propuestas.length} propuestas generadas · {vistas} abiertas por el cliente
          </p>
        </div>
        <div className="grow" />
        <Link
          href="/propuestas/nueva"
          className="flex h-11.5 items-center gap-2.5 rounded-[3px] bg-ink px-5 text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          NUEVA PROPUESTA
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="flex bg-surface">
          {[
            ["CLIENTE", "w-65"],
            ["PROPIEDADES", "grow"],
            ["FORMATO", "w-40"],
            ["ENVIADA", "w-40"],
            ["VISTAS", "w-22"],
            ["ESTADO", "w-48"],
            ["", "w-60"],
          ].map(([t, w], i) => (
            <span
              key={i}
              className={`${w} px-4 py-3 text-[9.5px] font-bold tracking-[0.12em] text-muted`}
            >
              {t}
            </span>
          ))}
        </div>

        {filas.map(({ propuesta: p, cliente, propiedades }) => (
          <div key={p.id} className="flex items-center border-t border-line">
            <Link
              href={`/clientes/${p.clienteId}`}
              className="w-65 px-4 py-3.5 text-[13px] font-bold hover:text-tan-deep"
            >
              {cliente?.nombre ?? "[CLIENTE]"}
            </Link>
            <span className="grow px-4 py-3.5 text-[12px] text-ink-2">{propiedades}</span>
            <span className="w-40 px-4 py-3.5 text-[12px] text-ink-2">
              {etiquetaFormato[p.formato]}
            </span>
            <span className="w-40 px-4 py-3.5 text-[12px] text-ink-2">
              {p.enviadaEl ?? (
                <BotonAccion
                  accion={marcarEnviada.bind(null, p.slug)}
                  className="flex h-8 items-center rounded-[3px] border border-[#C9C1B6] px-2.5 text-[9.5px] font-bold tracking-[0.06em] hover:bg-surface"
                >
                  MARCAR ENVIADA
                </BotonAccion>
              )}
            </span>
            <span className="w-22 px-4 py-3.5 text-[13px] font-bold">{p.vistas || "—"}</span>
            <span className="w-48 px-4 py-3.5">
              <Badge tono={tonoEstadoPropuesta[p.estado]}>{etiquetaEstadoPropuesta[p.estado]}</Badge>
            </span>
            <span className="flex w-60 gap-2 px-4 py-3.5">
              {[
                ["WEB", `/p/${p.slug}`],
                ["PDF", `/doc/pdf/${p.slug}`],
                ["DECK", `/doc/presentacion/${p.slug}`],
              ].map(([texto, href]) => (
                <Link
                  key={texto}
                  href={href}
                  target="_blank"
                  className="flex h-8.5 items-center rounded-[3px] border border-[#C9C1B6] px-3 text-[10px] font-bold tracking-[0.06em] hover:bg-surface"
                >
                  {texto}
                </Link>
              ))}
            </span>
          </div>
        ))}
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
