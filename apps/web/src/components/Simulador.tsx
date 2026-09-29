"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, Eyebrow } from "@/components/ui";
import { money } from "@casacruz/core";

export interface OpcionPrecio {
  id: string;
  etiqueta: string;
  precio: number;
}

/** Pago mensual de una anualidad vencida. */
export function mensualidad(monto: number, tasaAnual: number, anios: number): number {
  const i = tasaAnual / 100 / 12;
  const n = anios * 12;
  if (i === 0) return monto / n;
  return (monto * i) / (1 - Math.pow(1 + i, -n));
}

export function Simulador({
  nombre,
  subtitulo,
  opciones,
  engancheSugerido,
  volverHref,
}: {
  nombre: string;
  subtitulo: string;
  opciones: OpcionPrecio[];
  engancheSugerido: number | null;
  volverHref: string;
}) {
  const [opcionId, setOpcionId] = useState(opciones[0]?.id ?? "");
  const [enganche, setEnganche] = useState(engancheSugerido ?? 10);
  const [plazo, setPlazo] = useState(20);
  const [tasa, setTasa] = useState(11.5);

  const precio = opciones.find((o) => o.id === opcionId)?.precio ?? 0;

  const calculo = useMemo(() => {
    const montoEnganche = (precio * enganche) / 100;
    const financiar = precio - montoEnganche;
    const pago = mensualidad(financiar, tasa, plazo);
    return {
      montoEnganche,
      financiar,
      pago,
      pagos: plazo * 12,
      total: montoEnganche + pago * plazo * 12,
      ingreso: pago / 0.3,
    };
  }, [precio, enganche, plazo, tasa]);

  const pill = (on: boolean) =>
    `h-11 flex-1 rounded-[3px] border px-3 text-[13px] font-bold md:flex-none md:px-5 ${
      on ? "border-ink bg-ink text-white" : "border-[#C9C1B6] bg-panel hover:bg-surface"
    }`;

  return (
    <div className="flex flex-col gap-5 overflow-auto p-4 md:flex-row md:items-start md:gap-6 md:p-7">
      <div className="flex w-full flex-col gap-4.5 md:w-175 md:shrink-0">
        <Card className="flex flex-col gap-4.5 p-4 md:p-5.5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-21.5 shrink-0 rounded-[3px] bg-placeholder" />
            <div className="flex flex-col gap-1">
              <span className="text-[18px] font-bold">{nombre}</span>
              <span className="text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                {subtitulo}
              </span>
            </div>
            <div className="grow" />
            <div className="flex flex-col items-end gap-1">
              <Eyebrow>Precio de venta</Eyebrow>
              <span className="text-[24px] font-extrabold tracking-[-0.02em]">{money(precio)}</span>
            </div>
          </div>

          <div className="h-px bg-line" />

          <div className="flex flex-col gap-2.5">
            <Eyebrow>Unidad</Eyebrow>
            <div className="flex flex-wrap gap-2.5">
              {opciones.map((o) => (
                <button key={o.id} type="button" onClick={() => setOpcionId(o.id)} className={pill(o.id === opcionId)}>
                  {o.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Eyebrow>Enganche</Eyebrow>
            <div className="flex gap-2.5">
              {[10, 20, 30].map((v) => (
                <button key={v} type="button" onClick={() => setEnganche(v)} className={pill(v === enganche)}>
                  {v}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Eyebrow>Plazo del crédito</Eyebrow>
            <div className="flex gap-2.5">
              {[10, 15, 20].map((v) => (
                <button key={v} type="button" onClick={() => setPlazo(v)} className={pill(v === plazo)}>
                  {v} años
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Eyebrow>Tasa anual de referencia</Eyebrow>
            <div className="flex gap-2.5">
              {[10.5, 11.5, 12.5].map((v) => (
                <button key={v} type="button" onClick={() => setTasa(v)} className={pill(v === tasa)}>
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex w-full grow flex-col gap-4.5 md:w-auto">
        <div className="flex flex-col gap-5 rounded-card bg-ink p-5 md:p-6.5">
          <span className="text-[10px] font-bold tracking-[0.18em] text-tan">
            MENSUALIDAD ESTIMADA
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[38px] font-extrabold md:text-[50px] tracking-[-0.03em] text-white">
              {money(calculo.pago)}
            </span>
            <span className="text-[14px] text-[#A09991]">MXN / mes</span>
          </div>
          <div className="h-px bg-[#35322E]" />
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {[
              ["ENGANCHE", money(calculo.montoEnganche)],
              ["A FINANCIAR", money(calculo.financiar)],
              ["PAGOS", String(calculo.pagos)],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <span className="text-[10px] tracking-[0.12em] text-[#A09991]">{k}</span>
                <span className="text-[18px] font-bold text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-3.5 p-5.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-2">Total pagado al final del crédito</span>
            <span className="text-[16px] font-bold">{money(calculo.total)}</span>
          </div>
          <div className="h-px bg-line" />
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-2">Ingreso familiar sugerido</span>
            <span className="text-[16px] font-bold">{money(calculo.ingreso)}</span>
          </div>
          <span className="text-[11px] leading-relaxed text-muted">
            Referencia: la mensualidad no debería superar el 30% del ingreso familiar.
          </span>
        </Card>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-12.5 grow rounded-[3px] border border-[#C9C1B6] text-[11px] font-bold tracking-[0.08em] hover:bg-surface print:hidden"
          >
            IMPRIMIR O GUARDAR PDF
          </button>
          <Link
            href="/propuestas/nueva"
            className="flex h-12.5 grow items-center justify-center rounded-[3px] bg-tan text-[11px] font-bold tracking-[0.08em] text-ink"
          >
            AGREGAR A LA PROPUESTA
          </Link>
        </div>

        <div className="flex gap-2.5 rounded-[3px] border border-line bg-surface p-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A6B22" strokeWidth="1.8" className="mt-0.5 shrink-0">
            <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.9 17a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
          </svg>
          <span className="text-[11px] leading-relaxed text-ink-2">
            Cálculo informativo. No es una oferta de crédito: la tasa, el plazo y el monto los define
            la institución financiera tras evaluar al cliente.
          </span>
        </div>

        <Link href={volverHref} className="text-center text-[11.5px] font-semibold text-tan-deep hover:text-ink">
          Volver a la propiedad
        </Link>
      </div>
    </div>
  );
}
