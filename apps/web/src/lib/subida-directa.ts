"use client";

import { prepararSubida, type SolicitudSubida } from "@/lib/acciones/subidas";
import type { EstadoAccion } from "@/lib/acciones/tipos";

const TIPOS: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", avif: "image/avif", mp4: "video/mp4", eml: "message/rfc822",
};

/** El File nunca se serializa a Next cuando hay bucket. Sólo viaja el ticket. */
export function conSubidaDirecta(
  accion: (previo: EstadoAccion, datos: FormData) => Promise<EstadoAccion>,
  campo: string, proposito: SolicitudSubida["proposito"], desarrolloId: string,
) {
  return async (previo: EstadoAccion, datos: FormData): Promise<EstadoAccion> => {
    const archivos = datos.getAll(campo).filter((a): a is File => a instanceof File && a.size > 0);
    const tickets: string[] = [];
    // Validar toda la selección antes de iniciar cualquier carga.
    for (const archivo of archivos) {
      const mime = archivo.type || TIPOS[archivo.name.split(".").pop()?.toLowerCase() ?? ""];
      if (!mime || !Object.values(TIPOS).includes(mime)) return { error: `Tipo no permitido: ${archivo.name}` };
      if (archivo.size > 15 * 1024 * 1024) return { error: `${archivo.name} pasa de 15 MB.` };
    }
    for (const archivo of archivos) {
      const mime = archivo.type || TIPOS[archivo.name.split(".").pop()?.toLowerCase() ?? ""];
      const r = await prepararSubida({
        proposito, desarrolloId, nombre: archivo.name, bytes: archivo.size, mime,
        tipo: String(datos.get("tipo") || (proposito === "multimedia" ? "foto" : "otro")),
        ...(datos.get("nombre") ? { titulo: String(datos.get("nombre")) } : {}),
      });
      if (!r.ok) return { error: r.error };
      if (r.datos.modo === "local") return accion(previo, datos);
      try {
        const subida = await fetch(r.datos.url, { method: "PUT", headers: r.datos.headers, body: archivo, credentials: "omit", signal: AbortSignal.timeout(180_000) });
        if (!subida.ok) return { error: `No se pudo subir ${archivo.name}. Intenta nuevamente.` };
      } catch {
        return { error: `No se pudo conectar al almacenamiento para subir ${archivo.name}. Revisa tu conexión e intenta nuevamente. Si continúa, avisa al administrador.` };
      }
      tickets.push(r.datos.ticket);
    }
    datos.delete(campo);
    for (const ticket of tickets) datos.append(`${campo}Ticket`, ticket);
    return accion(previo, datos);
  };
}
