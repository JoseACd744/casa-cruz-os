import type { Propuesta } from "@casacruz/core";

/** Cómo se nombra y se colorea cada estado en pantalla. */

export const tonoEstadoPropuesta = {
  borrador: "neutral",
  enviada: "warn",
  vista: "ok",
  negociacion: "ok",
  sin_respuesta: "alert",
} as const satisfies Record<Propuesta["estado"], string>;

export const etiquetaEstadoPropuesta: Record<Propuesta["estado"], string> = {
  borrador: "borrador",
  enviada: "enviada",
  vista: "vista por el cliente",
  negociacion: "en negociación",
  sin_respuesta: "sin respuesta",
};

export const etiquetaFormato: Record<Propuesta["formato"], string> = {
  ficha: "Ficha rápida",
  presentacion: "Presentación",
  web: "Propuesta web",
  pdf: "PDF comparativo",
};
