"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { enviar } from "@/lib/api";
import { subirSiViene } from "./archivos";
import { texto, type EstadoAccion } from "./tipos";

/**
 * Gobierno del dato desde la web. Las reglas las decide la API: aquí sólo se
 * arma la petición y se muestra lo que responda.
 */

export async function registrarCambio(_previo: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const desarrolloId = texto(datos, "desarrolloId");

  const evidencia = await subirSiViene(datos.get("evidencia"), "/archivos?proposito=evidencia");
  if (!evidencia.ok) return { error: evidencia.error };

  const r = await enviar<{ requiereAprobacion: boolean }>("POST", "/cambios", {
    desarrolloId,
    destino: {
      campo: texto(datos, "campo"),
      tipologiaId: texto(datos, "tipologiaId") || null,
      nivel: texto(datos, "nivel") || null,
    },
    valorNuevo: texto(datos, "valorNuevo"),
    fuente: texto(datos, "fuente"),
    evidenciaUrl: evidencia.url,
    nota: texto(datos, "nota") || null,
  });
  if (!r.ok) return { error: r.error };

  const resultado = r.datos.requiereAprobacion ? "pendiente" : "publicado";
  redirect(`/propiedades/${encodeURIComponent(desarrolloId)}?tab=trazabilidad&cambio=${resultado}`);
}

export async function resolverCambio(
  id: string,
  decision: "aprobar" | "rechazar",
): Promise<EstadoAccion> {
  const r = await enviar("POST", `/cambios/${encodeURIComponent(id)}/${decision}`);
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: decision === "aprobar" ? "Aprobado y aplicado." : "Rechazado." };
}

/** El cerrador confirma que un dato sigue igual: sube la confiabilidad sin cambiar nada. */
export async function confirmarVigencia(
  desarrolloId: string,
  campo: string,
): Promise<EstadoAccion> {
  const r = await enviar("POST", `/desarrollos/${encodeURIComponent(desarrolloId)}/validaciones`, {
    campo,
  });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Confirmado" };
}
