"use server";

import { refresh } from "next/cache";
import { enviar } from "@/lib/api";
import type { EstadoAccion } from "./tipos";

/** Capacitación desde la web: la API califica y certifica. */

export async function completarModulo(moduloId: string): Promise<EstadoAccion> {
  const r = await enviar("POST", `/capacitacion/modulos/${encodeURIComponent(moduloId)}/completar`);
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Visto." };
}

export interface ResultadoEvaluacion {
  aciertos: number;
  total: number;
  aprobado: boolean;
  fallidas: string[];
  certificadoHasta: string | null;
}

export async function presentarEvaluacion(
  plazaId: string,
  respuestas: Record<string, number>,
): Promise<ResultadoEvaluacion | { error: string }> {
  const r = await enviar<ResultadoEvaluacion>("POST", `/capacitacion/${encodeURIComponent(plazaId)}/evaluacion`, {
    respuestas,
  });
  if (!r.ok) return { error: r.error };
  // Sin refresh: si no, la página se recarga como "ya certificado" y se pierde el resultado.
  return r.datos;
}

export async function guardarPreparacion(
  desarrolloId: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const r = await enviar("PUT", `/capacitacion/preparacion/${encodeURIComponent(desarrolloId)}`, {
    items: datos.getAll("items").map(String),
  });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Guardado." };
}
