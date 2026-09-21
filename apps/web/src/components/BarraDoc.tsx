"use client";

import Link from "next/link";

export function BarraDoc({
  titulo,
  volverHref,
  volverTexto,
  pdfUrl,
}: {
  titulo: string;
  volverHref: string;
  volverTexto: string;
  /** Endpoint de la API que genera el PDF. Sin él, se usa la impresión del navegador. */
  pdfUrl?: string | null;
}) {
  const estiloBoton =
    "flex h-10 items-center gap-2.5 rounded-[3px] bg-tan px-4.5 text-[10.5px] font-bold tracking-[0.1em] text-ink hover:brightness-105";
  const icono = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1C1B19" strokeWidth="1.8">
      <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" />
    </svg>
  );
  return (
    <div className="flex h-15 shrink-0 items-center gap-3.5 bg-ink px-6 print:hidden">
      <Link
        href={volverHref}
        className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-[#B8B1A7] uppercase hover:text-white"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        {volverTexto}
      </Link>
      <span className="text-[11.5px] text-[#55504A]">/</span>
      <span className="text-[11.5px] font-semibold tracking-[0.06em] text-white uppercase">
        {titulo}
      </span>
      <div className="grow" />
      <span className="text-[11px] text-[#A09991]">
        Generado automáticamente desde la Base Maestra
      </span>
      {pdfUrl ? (
        <a href={pdfUrl} target="_blank" rel="noopener" className={estiloBoton}>
          {icono}
          DESCARGAR PDF
        </a>
      ) : (
        <button type="button" onClick={() => window.print()} className={estiloBoton}>
          {icono}
          DESCARGAR PDF
        </button>
      )}
    </div>
  );
}
