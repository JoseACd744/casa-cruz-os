"use client";

import { useEffect } from "react";
import { Isotipo } from "@/components/Marca";

/**
 * Cuando la API falla, se dice: la web nunca rellena con datos de demostración,
 * que en producción parecerían inventario real.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ground px-6 text-center md:px-8">
      <Isotipo className="h-13" />
      <h1 className="text-[28px] font-extrabold tracking-[-0.015em]">
        No pudimos consultar la Base Maestra
      </h1>
      <p className="max-w-120 text-[13.5px] leading-relaxed text-ink-2">
        El servicio de datos no respondió como esperábamos. No se muestra información incompleta
        para no enviar nada equivocado a un cliente. Intenta de nuevo en un momento.
      </p>
      {error.digest ? (
        <span className="font-mono text-[11px] text-muted">Referencia {error.digest}</span>
      ) : null}
      <button
        type="button"
        onClick={() => retry()}
        className="flex h-11.5 items-center rounded-[3px] bg-ink px-5 text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
      >
        INTENTAR DE NUEVO
      </button>
    </div>
  );
}
