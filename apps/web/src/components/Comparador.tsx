"use client";

import Link from "next/link";
import { useState } from "react";
import { useSeleccion } from "@/components/Seleccion";
import { Foto } from "@/components/ui";
import { money } from "@casacruz/core";

export interface FilaComparable {
  id: string;
  nombre: string;
  foto: string | null;
  ciudad: string;
  precioDesde: number | null;
  precioM2: number | null;
  recamaras: number | null;
  banos: number | null;
  m2: number | null;
  entrega: string | null;
  enganchePct: number | null;
  aConsiderar: string;
  confiabilidad: number;
}

type Criterio = {
  campo: string;
  valor: (d: FilaComparable) => string;
  mejor?: (ds: FilaComparable[]) => number;
};

const CRITERIOS: Criterio[] = [
  {
    campo: "PRECIO DESDE",
    valor: (d) => (d.precioDesde === null ? "[PRECIO]" : money(d.precioDesde)),
    mejor: (ds) => indiceDe(ds, (d) => d.precioDesde, "min"),
  },
  {
    campo: "PRECIO POR M²",
    valor: (d) => (d.precioM2 === null ? "[ ]" : money(d.precioM2)),
    mejor: (ds) => indiceDe(ds, (d) => d.precioM2, "min"),
  },
  {
    campo: "RECÁMARAS",
    valor: (d) => (d.recamaras === null ? "[ ]" : String(d.recamaras)),
    mejor: (ds) => indiceDe(ds, (d) => d.recamaras, "max"),
  },
  {
    campo: "BAÑOS",
    valor: (d) => (d.banos === null ? "[ ]" : String(d.banos)),
    mejor: (ds) => indiceDe(ds, (d) => d.banos, "max"),
  },
  {
    campo: "SUPERFICIE",
    valor: (d) => (d.m2 === null ? "[ m² ]" : `${d.m2} m²`),
    mejor: (ds) => indiceDe(ds, (d) => d.m2, "max"),
  },
  { campo: "ENTREGA", valor: (d) => d.entrega ?? "[ENTREGA]" },
  {
    campo: "ENGANCHE",
    valor: (d) => (d.enganchePct === null ? "[ % ]" : `${d.enganchePct}%`),
    mejor: (ds) => indiceDe(ds, (d) => d.enganchePct, "min"),
  },
  {
    campo: "ENGANCHE EN PESOS",
    valor: (d) =>
      d.precioDesde === null || d.enganchePct === null
        ? "[ ]"
        : money((d.precioDesde * d.enganchePct) / 100),
    mejor: (ds) =>
      indiceDe(
        ds,
        (d) =>
          d.precioDesde === null || d.enganchePct === null
            ? null
            : (d.precioDesde * d.enganchePct) / 100,
        "min",
      ),
  },
  { campo: "A CONSIDERAR", valor: (d) => d.aConsiderar },
  {
    campo: "CONFIABILIDAD DEL DATO",
    valor: (d) => `${d.confiabilidad}%`,
    mejor: (ds) => indiceDe(ds, (d) => d.confiabilidad, "max"),
  },
];

function indiceDe(
  ds: FilaComparable[],
  get: (d: FilaComparable) => number | null,
  modo: "min" | "max",
): number {
  let indice = -1;
  let mejor = modo === "min" ? Infinity : -Infinity;
  ds.forEach((d, i) => {
    const v = get(d);
    if (v === null) return;
    if (modo === "min" ? v < mejor : v > mejor) {
      mejor = v;
      indice = i;
    }
  });
  return indice;
}

export function Comparador({ catalogo }: { catalogo: FilaComparable[] }) {
  const { ids, quitar, listo } = useSeleccion();
  const [resaltar, setResaltar] = useState(true);

  const cols = ids
    .map((id) => catalogo.find((c) => c.id === id))
    .filter((d): d is FilaComparable => Boolean(d));

  if (!listo) return null;

  if (cols.length < 2) {
    return (
      <div className="p-8">
        <p className="text-[13px] text-muted">
          Selecciona al menos dos propiedades en el{" "}
          <Link href="/propiedades" className="font-semibold text-tan-deep underline">
            inventario
          </Link>{" "}
          para compararlas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4.5 overflow-auto p-4 app:p-7">
      <div className="flex flex-wrap items-end gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[22px] font-extrabold app:text-[26px] tracking-[-0.015em]">
            Comparando {cols.length} propiedades
          </h1>
          <span className="text-[12.5px] text-ink-2">
            Para Berenice y Fabián · 2 o 3 habitaciones en Playa del Carmen
          </span>
        </div>
        <div className="hidden grow app:block" />
        <button
          type="button"
          onClick={() => setResaltar((v) => !v)}
          aria-pressed={resaltar}
          className={`flex h-10 items-center gap-2 rounded-full border px-3.5 text-[11.5px] font-semibold app:h-9.5 ${
            resaltar ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-2"
          }`}
        >
          {resaltar ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M4 12.5l5.5 5.5L20 7" />
            </svg>
          ) : null}
          Resaltar la mejor opción por criterio
        </button>
        <Link
          href="/propuestas/nueva"
          className="flex h-11 items-center rounded-[3px] bg-ink px-5 text-[11px] font-bold tracking-[0.1em] text-white app:h-10.5"
        >
          USAR EN PROPUESTA
        </Link>
      </div>

      <div
        data-scroll-x
        tabIndex={0}
        role="region"
        aria-label="Comparativo de propiedades; desliza para ver más opciones"
        className="shrink-0 overflow-x-auto rounded-card border border-line bg-panel app:overflow-hidden"
      >
        <div className="w-max min-w-full app:w-auto">
          <div className="flex border-b border-line">
            <div className="sticky left-0 z-10 w-28 shrink-0 bg-surface p-3 app:static app:w-57 app:p-4.5">
              <span className="eyebrow">Criterio</span>
            </div>
            {cols.map((d) => (
              <div
                key={d.id}
                className="flex w-64 shrink-0 flex-wrap gap-3.5 border-l border-line p-4.5 app:w-0 app:min-w-0 app:grow"
              >
                <Foto src={d.foto} className="h-17 w-23 shrink-0" />
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/propiedades/${d.id}`}
                    className="text-[17px] font-bold hover:text-tan-deep"
                  >
                    {d.nombre}
                  </Link>
                  <span className="text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    {d.ciudad}
                  </span>
                  <span
                    className={`text-[18px] font-extrabold tracking-[-0.01em] ${
                      d.precioDesde === null ? "text-alert" : ""
                    }`}
                  >
                    {d.precioDesde === null ? "[PRECIO]" : money(d.precioDesde)}
                  </span>
                </div>
                <div className="grow" />
                <button
                  type="button"
                  onClick={() => quitar(d.id)}
                  aria-label={`Quitar ${d.nombre} de la comparación`}
                  className="flex size-9 shrink-0 items-center justify-center self-start rounded-[3px] border border-line hover:border-alert app:size-7"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#96402F"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {CRITERIOS.map((c, fila) => {
            const mejor = resaltar && c.mejor ? c.mejor(cols) : -1;
            return (
              <div
                key={c.campo}
                className={`flex border-t border-line ${fila % 2 ? "bg-[#FCFBF9]" : ""}`}
              >
                <span
                  className={`sticky left-0 z-10 w-28 shrink-0 px-3 py-3.5 text-[11px] font-bold tracking-[0.08em] text-muted app:static app:w-57 app:px-4.5 ${fila % 2 ? "bg-[#FCFBF9]" : "bg-panel"}`}
                >
                  {c.campo}
                </span>
                {cols.map((d, i) => {
                  const v = c.valor(d);
                  const falta = v.startsWith("[");
                  return (
                    <span
                      key={d.id}
                      className={`w-64 shrink-0 border-l border-line px-4.5 py-3.5 text-[13px] app:w-0 app:min-w-0 app:grow ${
                        i === mejor ? "bg-tan-soft font-bold" : "font-medium"
                      } ${falta ? "text-alert" : ""}`}
                    >
                      {v}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B563E"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
        <span className="text-[11.5px] text-ink-2">
          El comparativo se arma con los datos aprobados de la Base Maestra. Lo que aparece [entre
          corchetes] no se envía al cliente.
        </span>
      </div>
    </div>
  );
}
