"use client";

import Link from "next/link";
import { useSeleccion } from "@/components/Seleccion";

/** Agrega la propiedad a la propuesta en curso (la selección que se arma en el inventario). */
export function BotonAgregarPropuesta({ id }: { id: string }) {
  const { tiene, alternar, listo, ids } = useSeleccion();
  const estilo =
    "flex h-11.5 items-center justify-center gap-2.5 rounded-[3px] bg-tan text-[11.5px] font-bold tracking-[0.1em] text-ink hover:brightness-105";

  if (listo && tiene(id)) {
    return (
      <div className="flex gap-2">
        <Link href="/propuestas/nueva" className={`${estilo} grow`}>
          EN LA PROPUESTA ({ids.length}) · CONTINUAR
        </Link>
        <button
          type="button"
          onClick={() => alternar(id)}
          aria-label="Quitar de la propuesta"
          className="flex size-11.5 items-center justify-center rounded-[3px] border border-[#C9C1B6] hover:border-alert"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#96402F" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => alternar(id)} className={estilo}>
      AGREGAR A PROPUESTA
    </button>
  );
}
