import type { FuenteTipo } from "./types";
import { fuenteAdmiteEvidencia } from "./format";

/**
 * Reglas de gobierno del dato. Viven aquí para que la web y la API apliquen
 * exactamente el mismo criterio: la interfaz avisa, la API decide.
 */

/** Campos que nunca se publican sin que un gerente o corporativo los valide. */
export const CAMPOS_SENSIBLES = ["comision", "entrega", "esquema", "rendimiento"] as const;

export function esCampoSensible(campo: string): boolean {
  const c = campo.toLowerCase();
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
