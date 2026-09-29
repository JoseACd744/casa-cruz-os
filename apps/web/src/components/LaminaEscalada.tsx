"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Las láminas de documento (ficha, PDF, presentación) miden lo mismo en toda
 * pantalla: se hacen para imprimirse. En el teléfono se reducen para que
 * quepan completas a lo ancho, sin scroll lateral; desde app (1280 px) se ven como siempre
 * (el `zoom` de `.doc-fit` sigue mandando) y al imprimir no se toca nada.
 */
export function LaminaEscalada({
  ancho,
  alto,
  children,
}: {
  /** Medidas naturales de la lámina, en px. */
  ancho: number;
  alto: number;
  children: ReactNode;
}) {
  const marco = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);

  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    const medir = () => setK(Math.min(1, el.clientWidth / ancho));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [ancho]);

  const estilo = { "--k": k, "--alto": `${alto}px` } as CSSProperties;

  return (
    <div
      ref={marco}
      style={estilo}
      className="w-full max-app:h-[calc(var(--alto)*var(--k))] max-app:overflow-hidden app:w-auto print:h-auto print:overflow-visible"
    >
      <div className="origin-top-left max-app:[transform:scale(var(--k))] print:transform-none">
        {children}
      </div>
    </div>
  );
}
