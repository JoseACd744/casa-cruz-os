import { ISOTIPO, LEMA, LOGOTIPO, PALABRA } from "@casacruz/core";

/**
 * La marca de Casa Cruz en SVG. Toma el color del texto (`currentColor`), así
 * que se pinta con las clases de siempre: `text-ground` sobre tinta, `text-ink`
 * sobre claro. El tamaño se da con el alto (`h-*`); el ancho sale solo.
 */

interface PropsMarca {
  className?: string;
  /** Nombre accesible. Con "" la marca es decorativa (hay texto al lado que ya lo dice). */
  titulo?: string;
}

function accesible(titulo: string) {
  return titulo === ""
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": titulo };
}

function Puntos() {
  return ISOTIPO.puntos.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />);
}

/** El isotipo: el marco con los trazos y los puntos. */
export function Isotipo({ className = "", titulo = "Casa Cruz" }: PropsMarca) {
  return (
    <svg
      viewBox={`0 0 ${ISOTIPO.ancho} ${ISOTIPO.alto}`}
      fill="currentColor"
      className={`w-auto shrink-0 ${className}`}
      {...accesible(titulo)}
    >
      <path fillRule="evenodd" d={ISOTIPO.d} />
      <Puntos />
    </svg>
  );
}

/** La palabra «casacruz» sola. */
export function Palabra({ className = "", titulo = "Casa Cruz" }: PropsMarca) {
  const { x, y, ancho, alto } = PALABRA.caja;
  return (
    <svg
      viewBox={`${x} ${y} ${ancho} ${alto}`}
      fill="currentColor"
      className={`w-auto shrink-0 ${className}`}
      {...accesible(titulo)}
    >
      <path fillRule="evenodd" d={PALABRA.d} />
    </svg>
  );
}

/** El logotipo completo: isotipo, palabra y lema «INVERSIONES INMOBILIARIAS». */
export function Logotipo({ className = "", titulo = "Casa Cruz, inversiones inmobiliarias" }: PropsMarca) {
  return (
    <svg
      viewBox={`0 0 ${LOGOTIPO.ancho} ${LOGOTIPO.alto}`}
      fill="currentColor"
      className={`w-auto shrink-0 ${className}`}
      {...accesible(titulo)}
    >
      <path fillRule="evenodd" d={ISOTIPO.d} />
      <Puntos />
      <path fillRule="evenodd" d={PALABRA.d} />
      <path d={LEMA.d} />
    </svg>
  );
}

/**
 * La marca del sistema: isotipo + palabra, con «OS» debajo en tan, igual que el
 * logotipo lleva el lema. Es la que va en el menú y en la entrada.
 */
export function MarcaOS({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`flex items-center ${grande ? "gap-3.5" : "gap-3"}`}>
      <Isotipo className={grande ? "h-11" : "h-9.5"} titulo="" />
      <span className={`flex flex-col ${grande ? "gap-2" : "gap-1.75"}`}>
        <Palabra className={grande ? "h-4" : "h-3.5"} titulo="Casa Cruz OS" />
        <span
          className={`font-semibold text-tan ${grande ? "text-[9.5px] tracking-[0.34em]" : "text-[9px] tracking-[0.3em]"}`}
          aria-hidden
        >
          OS
        </span>
      </span>
    </span>
  );
}
