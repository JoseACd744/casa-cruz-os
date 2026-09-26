/**
 * Lo que devuelve un server action a su formulario: un error para mostrar o un
 * aviso de que salió bien. Vive aparte porque un archivo "use server" sólo
 * puede exportar funciones.
 */
export interface EstadoAccion {
  error?: string;
  ok?: string;
}

export const ESTADO_INICIAL: EstadoAccion = {};

export function texto(datos: FormData, campo: string): string {
  const valor = datos.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Número escrito en un formulario: "$2,800,000", "20 %", "88.5".
 * Vacío → null. Si no es número → undefined, para avisar en lugar de guardar basura.
 */
export function numero(textoLibre: string): number | null | undefined {
  const limpio = textoLibre.replace(/[$,%\s]|mxn/gi, "");
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) && valor >= 0 ? valor : undefined;
}

/** Una línea por elemento: argumentos, objeciones, amenidades. */
export function lineas(textoLibre: string): string[] {
  return textoLibre
    .split("\n")
    .map((l) => l.replace(/^[·•\-*]\s*/, "").trim())
    .filter(Boolean);
}

/** Texto opcional: vacío es null (todavía no capturado). */
export function opcional(textoLibre: string): string | null {
  return textoLibre.trim() || null;
}
