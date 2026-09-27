"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { AccionDeInteres, Cliente, Propuesta } from "@casacruz/core";
import { enviar } from "@/lib/api";
import { numero, opcional, texto, type EstadoAccion } from "./tipos";

/** Clientes y propuestas desde la web. */

function datosDeCliente(datos: FormData): { ok: true; cuerpo: Record<string, unknown> } | { ok: false; error: string } {
  const min = numero(texto(datos, "presupuestoMin"));
  const max = numero(texto(datos, "presupuestoMax"));
  if (min === undefined || max === undefined) return { ok: false, error: "Revisa el presupuesto: debe ser un número." };
  if (min !== null && max !== null && min > max) {
    return { ok: false, error: "El presupuesto mínimo no puede ser mayor que el máximo." };
  }
  return {
    ok: true,
    cuerpo: {
      nombre: texto(datos, "nombre"),
      correo: opcional(texto(datos, "correo")),
      telefono: opcional(texto(datos, "telefono")),
      ciudadResidencia: opcional(texto(datos, "ciudadResidencia")),
      presupuestoMin: min,
      presupuestoMax: max,
      recamaras: opcional(texto(datos, "recamaras")),
      objetivo: texto(datos, "objetivo") || null,
      plazasInteres: datos.getAll("plazasInteres").map(String),
      kommoLeadId: opcional(texto(datos, "kommoLeadId")),
      notas: opcional(texto(datos, "notas")),
    },
  };
}

export async function crearCliente(_previo: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const d = datosDeCliente(datos);
  if (!d.ok) return { error: d.error };
  const r = await enviar<Cliente>("POST", "/clientes", d.cuerpo);
  if (!r.ok) return { error: r.error };
  redirect(`/clientes/${encodeURIComponent(r.datos.id)}`);
}

export async function actualizarCliente(id: string, _previo: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const d = datosDeCliente(datos);
  if (!d.ok) return { error: d.error };
  const r = await enviar<Cliente>("PATCH", `/clientes/${encodeURIComponent(id)}`, d.cuerpo);
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Guardado." };
}

export interface NuevaPropuesta {
  clienteId: string;
  formato: Propuesta["formato"];
  enviar: boolean;
  opciones: Propuesta["opciones"];
  items: { desarrolloId: string; tipologiaId: string | null; nivel: string | null; razon: string | null }[];
}

/**
 * Se llama directo desde el constructor (no es un formulario): la selección vive
 * en el navegador y hay que limpiarla cuando la API confirme.
 */
export async function crearPropuesta(entrada: NuevaPropuesta): Promise<{ error: string } | { slug: string }> {
  const r = await enviar<Propuesta>("POST", "/propuestas", entrada);
  if (!r.ok) {
    return {
      error: Array.isArray(r.detalle) && r.detalle.length ? `${r.error}:\n· ${r.detalle.join("\n· ")}` : r.error,
    };
  }
  refresh();
  return { slug: r.datos.slug };
}

export async function marcarEnviada(slug: string): Promise<EstadoAccion> {
  const r = await enviar("POST", `/propuestas/${encodeURIComponent(slug)}/enviar`);
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Enviada." };
}

// ── Desde el micrositio (el cliente, sin sesión) ─────────────────────────

export async function registrarVista(slug: string): Promise<void> {
  await enviar("POST", `/propuestas/${encodeURIComponent(slug)}/vista`);
}

export async function registrarInteres(
  slug: string,
  accion: AccionDeInteres,
  desarrolloId: string | null,
): Promise<{ mensaje: string; whatsapp: string | null } | { error: string }> {
  const r = await enviar<{ mensaje: string; whatsapp: string | null }>(
    "POST",
    `/propuestas/${encodeURIComponent(slug)}/interes`,
    { accion, desarrolloId },
  );
  if (!r.ok) return { error: "No pudimos avisar a tu asesor. Intenta de nuevo en un momento." };
  return r.datos;
}
