"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Dot, Eyebrow, Foto } from "@/components/ui";
import { Isotipo } from "./Marca";

export interface Recomendacion {
  id: string;
  nombre: string;
  zona: string;
  precio: string;
  razon: string;
  fuente: string;
  tono: "ok" | "warn" | "alert";
}

export interface Respuesta {
  pregunta: string;
  intro: string;
  recomendaciones?: Recomendacion[];
  puntos?: string[];
  aviso?: string;
  fuentes: { registro: string; detalle: string }[];
}

export function AsistenteIA({ respuestas }: { respuestas: Respuesta[] }) {
  const [indice, setIndice] = useState(0);
  const r = respuestas[indice];

  return (
    <div className="flex flex-col gap-5 overflow-auto p-4 app:flex-row app:items-stretch app:gap-6 app:p-7">
      <Card className="flex w-full flex-col gap-4.5 p-4 app:w-235 app:min-w-0 app:shrink app:p-6">
        <div className="flex justify-end">
          <div className="max-w-140 rounded-[4px] rounded-br-none bg-ink px-4.5 py-4">
            <span className="text-[13.5px] leading-relaxed text-white">{r.pregunta}</span>
          </div>
        </div>

        <div className="flex gap-3.5">
          <Isotipo className="h-9 self-start" titulo="Casa Cruz OS" />
          <div className="flex min-w-0 grow flex-col gap-3.5">
            <p className="text-[13.5px] leading-relaxed">{r.intro}</p>

            {r.recomendaciones ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {r.recomendaciones.map((c) => (
                  <div key={c.id + c.razon} className="overflow-hidden rounded-[3px] border border-line">
                    <Foto className="h-19 rounded-none" />
                    <div className="flex flex-col gap-1.5 p-3.5">
                      <Link
                        href={`/propiedades/${c.id}`}
                        className="text-[14px] font-bold hover:text-tan-deep"
                      >
                        {c.nombre}
                      </Link>
                      <span className="text-[10.5px] font-semibold tracking-[0.04em] text-muted uppercase">
                        {c.zona}
                      </span>
                      <span className="text-[17px] font-extrabold tracking-[-0.01em]">{c.precio}</span>
                      <span className="text-[11.5px] leading-snug text-ink-2">{c.razon}</span>
                      <div className="flex items-center gap-2 border-t border-line pt-2.5">
                        <Dot tono={c.tono} />
                        <span className="text-[10.5px] text-muted">{c.fuente}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {r.puntos ? (
              <div className="flex flex-col gap-2.5">
                {r.puntos.map((p) => (
                  <div key={p} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-tan" />
                    <span className="text-[13px] leading-relaxed">{p}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {r.recomendaciones ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/propuestas/nueva"
                  className="flex min-h-11 items-center gap-2.5 rounded-[3px] bg-tan px-4 py-2 text-[11px] font-bold tracking-[0.1em] text-ink"
                >
                  GENERAR PROPUESTA CON ESTAS
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1C1B19" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/comparar"
                  className="flex h-11 items-center rounded-[3px] border border-[#C9C1B6] px-4.5 text-[11px] font-bold tracking-[0.08em]"
                >
                  COMPARARLAS
                </Link>
              </div>
            ) : null}

            {r.aviso ? (
              <div className="flex items-start gap-2.5 rounded-[3px] border border-warn/40 bg-warn-soft p-3.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A6B22" strokeWidth="1.8" className="mt-0.5 shrink-0">
                  <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.9 17a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
                </svg>
                <span className="text-[11.5px] leading-relaxed text-ink-2">{r.aviso}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grow" />

        <div className="flex flex-wrap gap-2.5">
          {respuestas.map((x, i) => (
            <button
              key={x.pregunta}
              type="button"
              onClick={() => setIndice(i)}
              className={`min-h-10 rounded-full border px-3.5 py-1.5 text-left text-[11.5px] font-semibold app:h-9 app:min-h-0 app:py-0 ${
                i === indice
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-2 hover:border-[#C9C1B6]"
              }`}
            >
              {x.pregunta.length > 58 ? `${x.pregunta.slice(0, 58)}…` : x.pregunta}
            </button>
          ))}
        </div>

        <div className="flex h-14 items-center gap-3 rounded-[3px] border border-[#C9C1B6] px-4">
          <label htmlFor="pregunta" className="sr-only">
            Escribe tu pregunta
          </label>
          <input
            id="pregunta"
            disabled
            placeholder="La pregunta libre llega con la capa de IA. Por ahora, elige una de las de arriba."
            className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            aria-label="Enviar pregunta"
            className="flex size-11 shrink-0 items-center justify-center rounded-[3px] bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </Card>

      <div className="flex w-full grow flex-col gap-5 app:w-auto">
        <div className="flex flex-col gap-3.5 rounded-card bg-ink p-5.5">
          <span className="text-[10px] font-bold tracking-[0.16em] text-tan">
            REGLAS DE LA CAPA DE IA
          </span>
          {[
            "Sólo consulta registros en estado Aprobado o Publicado.",
            "No inventa precios, fechas ni disponibilidad: si el dato no existe, lo dice.",
            "Respeta el rol: a un cerrador no le muestra márgenes ni convenios.",
            "Cita el registro y la fecha de última validación en cada respuesta.",
            "Advierte cuando un dato lleva demasiado tiempo sin confirmarse.",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A98D6F" strokeWidth="2.2" className="mt-0.5 shrink-0">
                <path d="M4 12.5l5.5 5.5L20 7" />
              </svg>
              <span className="text-[12px] leading-snug text-ground">{t}</span>
            </div>
          ))}
        </div>

        <Card className="flex grow flex-col gap-3.5 p-5.5">
          <Eyebrow>De dónde salió esta respuesta</Eyebrow>
          {r.fuentes.map((f) => (
            <div key={f.registro} className="flex flex-col gap-1 border-b border-line pb-3">
              <span className="text-[12px] font-bold">{f.registro}</span>
              <span className="text-[11px] text-muted">{f.detalle}</span>
            </div>
          ))}
          <div className="grow" />
          <span className="text-[11px] leading-relaxed text-ink-2">
            La IA nunca es la fuente de verdad: consulta, compara y presenta lo que ya aprobó Casa
            Cruz.
          </span>
        </Card>
      </div>
    </div>
  );
}
