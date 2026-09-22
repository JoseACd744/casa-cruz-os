import type { FuenteTipo } from "./types";
import { fuenteAdmiteEvidencia } from "./format";

/**
 * Reglas de gobierno del dato. Viven aquí para que la web y la API apliquen
 * exactamente el mismo criterio: la interfaz avisa, la API decide.
 */

/** Campos que nunca se publican sin que un gerente o corporativo los valide. */
export const CAMPOS_SENSIBLES = ["comision", "entrega", "esquema", "rendimiento"] as const;

export function esCampoSensible(campo: string): boolean {
  // Sin acentos: el campo puede llegar como "comision" o como "Comisión autorizada".
  const c = campo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return CAMPOS_SENSIBLES.some((s) => c.includes(s));
}

/**
 * Un cambio se publica solo si el campo no es sensible y viene con una fuente
 * que admite evidencia documental. En cualquier otro caso queda pendiente.
 */
export function requiereAprobacion(campo: string, fuente: FuenteTipo, conEvidencia = true): boolean {
  if (esCampoSensible(campo)) return true;
  if (!fuenteAdmiteEvidencia[fuente]) return true;
  return !conEvidencia;
}

export interface Requisito {
  clave: string;
  texto: string;
  cumple: boolean;
}

/**
 * Qué le falta a un desarrollo para poder publicarse.
 *
 * La misma lista que muestra el asistente de alta en la web y que valida la API
 * antes de dejar publicar: la pantalla informa, el servidor decide.
 */
export function requisitosParaPublicar(d: {
  tipologias: { niveles: { precioVenta: number | null }[] }[];
  multimedia?: { tipo: string }[];
  condiciones: { enganchePct: number | null };
  comercial: { argumentos: string[]; objeciones: string[] };
  interna: { dueDiligence: string };
}): Requisito[] {
  const conPrecio = d.tipologias.some((t) => t.niveles.some((n) => n.precioVenta !== null));
  const fotos = (d.multimedia ?? []).filter((m) => m.tipo === "foto" || m.tipo === "render").length;

  return [
    { clave: "precio", texto: "Al menos una tipología con precio", cumple: conPrecio },
    {
      clave: "enganche",
      texto: "Esquema de pago capturado",
      cumple: d.condiciones.enganchePct !== null,
    },
    { clave: "multimedia", texto: "Al menos 3 fotos o renders", cumple: fotos >= 3 },
    {
      clave: "argumentos",
      texto: "Argumentos de venta y objeciones frecuentes",
      cumple: d.comercial.argumentos.length > 0 && d.comercial.objeciones.length > 0,
    },
    {
      clave: "due_diligence",
      texto: "Due diligence validado por corporativo",
      cumple: d.interna.dueDiligence === "validado",
    },
  ];
}

export function puedePublicarse(d: Parameters<typeof requisitosParaPublicar>[0]): boolean {
  return requisitosParaPublicar(d).every((r) => r.cumple);
}
