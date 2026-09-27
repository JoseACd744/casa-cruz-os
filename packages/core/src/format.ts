/** Formato de valores. Un `null` nunca se inventa: se muestra como [CAMPO]. */

export function money(valor: number | null | undefined, placeholder = "[PRECIO]"): string {
  if (valor === null || valor === undefined) return placeholder;
  return "$" + Math.round(valor).toLocaleString("en-US");
}

export function moneyCorto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "[ ]";
  return "$" + (valor / 1_000_000).toFixed(2).replace(/0$/, "") + " M";
}

export function dato(valor: string | number | null | undefined, placeholder: string): string {
  if (valor === null || valor === undefined || valor === "") return placeholder;
  return String(valor);
}

export function m2(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "[ m² ]";
  return `${valor} m²`;
}

export function pct(valor: number | null | undefined, placeholder = "[ % ]"): string {
  if (valor === null || valor === undefined) return placeholder;
  return `${valor}%`;
}

export function hace(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/** "Jorge Díaz" → "JD". Un marcador como "[NOMBRE]" no tiene iniciales. */
export function iniciales(nombre: string): string {
  if (nombre.startsWith("[")) return "··";
  return nombre
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/**
 * El nombre con el que se le habla al cliente, o null si todavía no se captura
 * (un lead recién llegado de Kommo trae "[NOMBRE EN KOMMO] · lead 4903"). Lo
 * que ve el cliente nunca lleva un marcador.
 */
export function nombreVisible(nombre: string | null | undefined): string | null {
  const limpio = nombre?.trim();
  return limpio && !limpio.startsWith("[") ? limpio : null;
}

/** true cuando el valor todavía no existe en la Base Maestra. */
export function faltante(valor: unknown): boolean {
  return valor === null || valor === undefined || valor === "";
}

export const etiquetaEstatus: Record<string, string> = {
  borrador: "Borrador",
  revision: "En revisión",
  due_diligence: "Due diligence",
  aprobado: "Aprobado",
  publicado: "Publicado",
};

export const etiquetaFuente: Record<string, string> = {
  lista_precios: "Lista de precios oficial",
  brochure: "Brochure actualizado",
  correo: "Correo del desarrollador",
  whatsapp: "WhatsApp oficial",
  convenio: "Convenio",
  llamada: "Llamada con representante",
  contrato: "Documento contractual",
  otro: "Otro",
};

/** Fuentes que exigen evidencia adjunta para publicarse sin aprobación. */
export const fuenteAdmiteEvidencia: Record<string, boolean> = {
  lista_precios: true,
  brochure: true,
  correo: true,
  whatsapp: true,
  convenio: true,
  contrato: true,
  llamada: false,
  otro: false,
};
