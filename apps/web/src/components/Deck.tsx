"use client";

import { useRef, useState } from "react";
import { Foto } from "@/components/ui";
import { Isotipo, Logotipo, Palabra } from "./Marca";
import { LaminaEscalada } from "@/components/LaminaEscalada";

export type Slide =
  | { tipo: "portada"; cliente: string; fecha: string; asesor: string; titulo: string }
  | { tipo: "quienes"; puntos: { titulo: string; texto: string }[] }
  | {
      tipo: "propiedad";
      fotos: { principal: string | null; secundarias: string[] };
      orden: string;
      nombre: string;
      subtitulo: string;
      precio: string;
      precioFalta: boolean;
      rec: string;
      banos: string;
      m2: string;
      enganche: string;
      razon: string;
      aConsiderar: string | null;
    }
  | { tipo: "comparativo"; columnas: string[]; filas: { campo: string; valores: string[] }[] }
  | { tipo: "cierre"; asesor: string };

const NOMBRES: Record<Slide["tipo"], string> = {
  portada: "Portada",
  quienes: "Quiénes somos",
  propiedad: "Propiedad",
  comparativo: "Comparativo",
  cierre: "Siguiente paso",
};

function Lamina({ slide }: { slide: Slide }) {
  if (slide.tipo === "portada") {
    return (
      <div className="flex h-full flex-col justify-end bg-ink px-16 py-14 text-white">
        <Logotipo className="h-12 self-start" />
        <div className="grow" />
        <span className="text-[11px] font-bold tracking-[0.24em] text-tan">{slide.fecha}</span>
        <h1 className="pt-4 text-[54px] leading-none font-extrabold tracking-[-0.02em] whitespace-pre-line">
          {slide.titulo}
        </h1>
        <p className="pt-5 text-[18px] text-[#D4CEC6]">Preparada para {slide.cliente}</p>
        <p className="pt-10 text-[12px] tracking-[0.1em] text-[#A09991] uppercase">
          {slide.asesor} · Casa Cruz
        </p>
      </div>
    );
  }

  if (slide.tipo === "quienes") {
    return (
      <div className="flex h-full flex-col bg-[#F7F5F1] px-16 py-13">
        <span className="text-[11px] font-bold tracking-[0.24em] text-tan-deep">
          POR QUÉ CASA CRUZ
        </span>
        <h2 className="pt-4 text-[38px] leading-tight font-extrabold tracking-[-0.02em]">
          Acompañamos la compra completa,
          <br />
          no sólo la venta.
        </h2>
        <div className="grow" />
        <div className="grid grid-cols-3 gap-8">
          {slide.puntos.map((p) => (
            <div key={p.titulo} className="flex flex-col gap-2.5 border-t-2 border-ink pt-4">
              <span className="text-[17px] font-bold">{p.titulo}</span>
              <span className="text-[13px] leading-relaxed text-ink-2">{p.texto}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.tipo === "propiedad") {
    return (
      <div className="flex h-full flex-col bg-[#F7F5F1] px-11 py-9">
        <div className="flex items-center gap-3 border-b border-line-strong pb-4.5">
          <Isotipo className="h-8" titulo="" />
          <Palabra className="h-3" />
          <div className="grow" />
          <span className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
            {slide.subtitulo}
          </span>
        </div>

        <div className="flex grow gap-8 pt-6.5">
          <div className="flex w-150 shrink-0 flex-col gap-3">
            <Foto
              src={slide.fotos.principal}
              label="Render principal"
              className="min-h-0 w-full grow rounded-[2px]"
            />
            <div className="flex gap-3">
              <Foto src={slide.fotos.secundarias[0]} className="h-26 w-0 grow rounded-[2px]" />
              <Foto src={slide.fotos.secundarias[1]} className="h-26 w-0 grow rounded-[2px]" />
              <Foto label="Video" className="h-26 w-0 grow rounded-[2px]" dark />
            </div>
          </div>

          <div className="flex grow flex-col">
            <span className="text-[10px] font-bold tracking-[0.24em] text-tan-deep">
              {slide.orden}
            </span>
            <h2 className="pt-2.5 text-[46px] leading-none font-extrabold tracking-[-0.02em] uppercase">
              {slide.nombre}
            </h2>

            <div className="flex gap-6.5 pt-6">
              {[
                ["RECÁMARAS", slide.rec],
                ["BAÑOS", slide.banos],
                ["SUPERFICIE", slide.m2],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1.5">
                  <span className="text-[9.5px] font-bold tracking-[0.14em] text-muted">{k}</span>
                  <span className="text-[22px] font-bold">{v}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center bg-tan px-4.5 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9.5px] font-bold tracking-[0.14em] text-ink">
                  PRECIO DESDE
                </span>
                <span
                  className={`text-[26px] font-extrabold tracking-[-0.02em] ${
                    slide.precioFalta ? "text-alert-ink" : "text-ink"
                  }`}
                >
                  {slide.precio}
                </span>
              </div>
              <div className="grow" />
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9.5px] font-bold tracking-[0.14em] text-ink">ENGANCHE</span>
                <span className="text-[20px] font-extrabold text-ink">{slide.enganche}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-5.5">
              <span className="text-[10px] font-bold tracking-[0.16em] text-tan-deep">
                POR QUÉ LA SELECCIONAMOS
              </span>
              <span className="text-[13px] leading-relaxed">{slide.razon}</span>
              {slide.aConsiderar ? (
                <span className="text-[12px] leading-relaxed text-ink-2">
                  A considerar: {slide.aConsiderar}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slide.tipo === "comparativo") {
    return (
      <div className="flex h-full flex-col bg-[#F7F5F1] px-11 py-9">
        <h2 className="text-[30px] font-extrabold tracking-[-0.015em]">
          Comparativo de las opciones
        </h2>
        <div className="mt-6 flex flex-col overflow-hidden rounded-[2px] border border-line bg-white">
          <div className="flex bg-tan">
            <span className="w-46 px-4 py-3 text-[10px] font-bold tracking-[0.12em] text-ink">
              CRITERIO
            </span>
            {slide.columnas.map((c) => (
              <span
                key={c}
                className="grow px-4 py-3 text-[10px] font-bold tracking-[0.12em] text-ink uppercase"
              >
                {c}
              </span>
            ))}
          </div>
          {slide.filas.map((f, i) => (
            <div key={f.campo} className={`flex border-b border-line ${i % 2 ? "bg-[#FAF8F5]" : ""}`}>
              <span className="w-46 px-4 py-3 text-[10.5px] font-bold tracking-[0.06em] text-muted">
                {f.campo}
              </span>
              {f.valores.map((v, j) => (
                <span
                  key={j}
                  className={`grow px-4 py-3 text-[13px] font-semibold ${
                    v === "Consultar" || v === "Por confirmar" ? "text-alert" : ""
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center bg-ink px-16 text-white">
      <span className="text-[11px] font-bold tracking-[0.24em] text-tan">SIGUIENTE PASO</span>
      <h2 className="pt-5 text-[46px] leading-tight font-extrabold tracking-[-0.02em]">
        ¿Agendamos una videollamada
        <br />
        para revisarlas juntos?
      </h2>
      <p className="pt-6 text-[16px] text-[#D4CEC6]">
        {slide.asesor} · Cerrador certificado Riviera Maya
      </p>
      <p className="pt-2 text-[14px] text-[#A09991]">[TELÉFONO] · [CORREO]</p>
    </div>
  );
}

export function Deck({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const toque = useRef<number | null>(null);

  return (
    <div
      className="flex grow flex-col items-center gap-5 overflow-auto p-4 md:p-8 print:p-0"
      onTouchStart={(e) => {
        toque.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const inicio = toque.current;
        toque.current = null;
        const fin = e.changedTouches[0]?.clientX;
        if (inicio === null || fin === undefined || Math.abs(fin - inicio) < 60) return;
        setI((v) => (fin < inicio ? Math.min(slides.length - 1, v + 1) : Math.max(0, v - 1)));
      }}
    >
      <LaminaEscalada ancho={1280} alto={720}>
        <div className="doc-fit h-180 w-320 shrink-0 overflow-hidden bg-white shadow-2xl print:shadow-none">
          <Lamina slide={slides[i]} />
        </div>
      </LaminaEscalada>

      <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-3 print:hidden">
        <button
          type="button"
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[3px] border border-[#55504A] px-4 text-[11px] font-bold tracking-[0.08em] text-ground disabled:opacity-30 md:h-10 md:flex-none"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          ANTERIOR
        </button>

        <div className="hidden gap-1.5 md:flex">
          {slides.map((s, j) => (
            <button
              key={j}
              type="button"
              onClick={() => setI(j)}
              aria-label={`Ir a la lámina ${j + 1}: ${NOMBRES[s.tipo]}`}
              className={`h-2 rounded-full transition-all ${
                j === i ? "w-7 bg-tan" : "w-2 bg-[#55504A] hover:bg-[#7D766C]"
              }`}
            />
          ))}
        </div>

        <span className="order-first basis-full text-center text-[11px] md:order-none md:w-32 md:basis-auto font-semibold tracking-[0.08em] text-[#A09991] uppercase">
          {i + 1} / {slides.length} · {NOMBRES[slides[i].tipo]}
        </span>

        <button
          type="button"
          onClick={() => setI((v) => Math.min(slides.length - 1, v + 1))}
          disabled={i === slides.length - 1}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[3px] border border-[#55504A] px-4 text-[11px] font-bold tracking-[0.08em] text-ground disabled:opacity-30 md:h-10 md:flex-none"
        >
          SIGUIENTE
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
