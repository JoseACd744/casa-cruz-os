import Link from "next/link";
import {
  completitud,
  etiquetaEstatus,
  motivoParaNoMover,
  requisitosParaPublicar,
  transicionesDe,
  type Desarrollo,
  type EstatusListing,
  type Rol,
} from "@casacruz/core";
import { BotonAccion } from "@/components/BotonAccion";
import { Barra, Card, Eyebrow } from "@/components/ui";
import { cambiarEstatus } from "@/lib/acciones/desarrollos";

const FLUJO: { estatus: EstatusListing; quien: string }[] = [
  { estatus: "borrador", quien: "Cerrador" },
  { estatus: "revision", quien: "Gerente de plaza" },
  { estatus: "due_diligence", quien: "Corporativo" },
  { estatus: "aprobado", quien: "Corporativo" },
  { estatus: "publicado", quien: "Corporativo" },
];

/**
 * Lo que dice el servidor del desarrollo: cuánto está capturado, qué le falta
 * para publicarse y qué paso del flujo puede dar quien está mirando.
 */
export function ColumnaAlta({
  desarrollo: d,
  rol,
  base,
}: {
  desarrollo: Desarrollo | null;
  rol: Rol;
  base: string | null;
}) {
  const estado = d ? completitud(d) : null;
  const requisitos = d
    ? requisitosParaPublicar(d)
    : requisitosParaPublicar({
        tipologias: [],
        multimedia: [],
        condiciones: { enganchePct: null },
        comercial: { argumentos: [], objeciones: [] },
        interna: { dueDiligence: "pendiente" },
      }).map((r) => ({ ...r, cumple: false }));
  const actual = d?.estatus ?? "borrador";

  return (
    <>
      <Card className="flex flex-col gap-3.5 p-5.5">
        <div className="flex items-baseline">
          <Eyebrow>Completitud</Eyebrow>
          <div className="grow" />
          <span className="text-[24px] font-extrabold">{estado?.porcentaje ?? 0}%</span>
        </div>
        <Barra
          valor={estado?.porcentaje ?? 0}
          tono={(estado?.porcentaje ?? 0) >= 85 ? "ok" : (estado?.porcentaje ?? 0) >= 50 ? "warn" : "alert"}
        />
        {(estado?.secciones ?? []).map((s, i) => {
          const ok = s.faltan.length === 0;
          const fila = (
            <>
              <span
                className={`flex size-4.5 shrink-0 items-center justify-center rounded-[3px] border ${
                  ok ? "border-ok bg-ok" : "border-[#C9C1B6] bg-panel"
                }`}
              >
                {ok ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6">
                    <path d="M4 12.5l5.5 5.5L20 7" />
                  </svg>
                ) : null}
              </span>
              <span className="grow text-[12px]">{s.nombre}</span>
              <span className="max-w-40 truncate text-right text-[11px] text-muted" title={s.faltan.join(", ")}>
                {ok ? "completa" : s.faltan.length === 1 ? s.faltan[0] : `${s.faltan.length} por capturar`}
              </span>
            </>
          );
          return base ? (
            <Link key={s.seccion} href={`${base}?paso=${i + 1}`} className="flex items-center gap-2.5 hover:text-tan-deep">
              {fila}
            </Link>
          ) : (
            <div key={s.seccion} className="flex items-center gap-2.5">
              {fila}
            </div>
          );
        })}
        {!estado ? (
          <span className="text-[11.5px] text-muted">Se calcula en cuanto guardes la identificación.</span>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3 p-5.5">
        <Eyebrow>Para poder publicar</Eyebrow>
        {requisitos.map((r) => (
          <div key={r.clave} className="flex items-start gap-2.5">
            <span className={`mt-1.5 size-1.75 shrink-0 rounded-full ${r.cumple ? "bg-ok" : "bg-alert"}`} />
            <span className={`text-[12px] leading-snug ${r.cumple ? "text-muted line-through" : ""}`}>{r.texto}</span>
          </div>
        ))}
      </Card>

      <div className="flex flex-col gap-3.5 rounded-card bg-ink p-5.5">
        <span className="text-[10px] font-bold tracking-[0.16em] text-tan">FLUJO DE ALTA</span>
        {FLUJO.map((f) => {
          const ahora = f.estatus === actual;
          return (
            <div key={f.estatus} className="flex items-center gap-3">
              <span className={`size-2.5 rounded-full ${ahora ? "bg-tan" : "bg-[#4A463F]"}`} />
              <span className={`text-[12.5px] ${ahora ? "font-bold text-white" : "text-[#B8B1A7]"}`}>
                {etiquetaEstatus[f.estatus]}
              </span>
              <div className="grow" />
              <span className="text-[10.5px] text-[#A09991]">{f.quien}</span>
            </div>
          );
        })}

        {d ? (
          <div className="flex flex-col gap-2.5 border-t border-[#35322E] pt-3.5">
            {transicionesDe(d.estatus).map((t) => {
              const motivo = motivoParaNoMover(d, t.hacia, rol);
              if (motivo?.codigo === 403) return null; // No es su paso: no se le ofrece.
              const avanza = FLUJO.findIndex((f) => f.estatus === t.hacia) > FLUJO.findIndex((f) => f.estatus === d.estatus);
              return (
                <div key={t.hacia} className="flex flex-col gap-1.5">
                  <BotonAccion
                    accion={cambiarEstatus.bind(null, d.id, t.hacia)}
                    enCurso="…"
                    bloque
                    confirmar={avanza ? undefined : `¿${t.accion}? El desarrollo deja de estar ${etiquetaEstatus[d.estatus].toLowerCase()}.`}
                    className={`h-10.5 w-full rounded-[3px] px-4 text-[10.5px] font-bold tracking-[0.1em] uppercase ${
                      avanza ? "bg-tan text-ink hover:brightness-105" : "border border-[#55504A] text-ground hover:bg-[#2E2C28]"
                    }`}
                  >
                    {t.accion}
                  </BotonAccion>
                  {motivo ? (
                    <span className="text-[10.5px] leading-snug whitespace-pre-line text-[#D9B38C]">
                      {motivo.detalle?.length ? `Falta: ${motivo.detalle.join(" · ")}` : motivo.mensaje}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
        <span className="text-[11px] leading-relaxed text-[#B8B1A7]">
          Al publicar, el desarrollo aparece en el portal y en los filtros, y queda disponible para
          fichas y propuestas.
        </span>
      </div>
    </>
  );
}
