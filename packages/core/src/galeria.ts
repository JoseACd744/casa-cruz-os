import type { Multimedia } from "./types";

/**
 * Qué imagen va en cada lugar.
 *
 * La ficha, el análisis, el micrositio y el portal leen la misma lista: la
 * primera foto o render es la fachada, las siguientes acompañan, y los planos,
 * el video y el brochure no se confunden con fotos.
 */

export interface Galeria {
  /** Fachada o render principal. */
  principal: string | null;
  /** Amenidades, interiores y demás, en orden. */
  secundarias: string[];
  planos: string[];
  video: string | null;
  brochure: string | null;
}

export function galeria(d: { multimedia?: Multimedia[] }): Galeria {
  // El orden es estable: con el mismo número, manda el orden de carga.
  const lista = [...(d.multimedia ?? [])].sort((a, b) => a.orden - b.orden);
  const imagenes = lista.filter((m) => m.tipo === "foto" || m.tipo === "render").map((m) => m.url);

  return {
    principal: imagenes[0] ?? null,
    secundarias: imagenes.slice(1),
    planos: lista.filter((m) => m.tipo === "plano").map((m) => m.url),
    video: lista.find((m) => m.tipo === "video")?.url ?? null,
    brochure: lista.find((m) => m.tipo === "brochure")?.url ?? null,
  };
}

/** El plano propio de la tipología o, si no tiene, el plano cargado en su misma posición. */
export function planoDe(
  d: { multimedia?: Multimedia[]; tipologias: { id: string; planoUrl: string | null }[] },
  tipologiaId: string,
): string | null {
  const i = d.tipologias.findIndex((t) => t.id === tipologiaId);
  if (i < 0) return null;
  return d.tipologias[i].planoUrl ?? galeria(d).planos[i] ?? null;
}
