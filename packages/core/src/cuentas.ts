/**
 * Cuentas del equipo.
 *
 * Una cuenta nueva nace con una clave temporal que sólo sirve para entrar y
 * cambiarla. La clave definitiva la elige la persona, y aquí está la regla.
 */

export const LARGO_MINIMO_CLAVE = 10;

/** Por qué la clave no sirve, o null si sirve. */
export function motivoClaveDebil(clave: string, persona: { correo: string; nombre: string }): string | null {
  if (clave.length < LARGO_MINIMO_CLAVE) return `Usa al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
  if (!/[a-zA-ZñÑ]/.test(clave) || !/\d/.test(clave)) return "Combina letras y números.";

  const minusculas = clave.toLowerCase();
  const usuario = persona.correo.split("@")[0].toLowerCase();
  if (usuario.length >= 4 && minusculas.includes(usuario)) return "No uses tu correo en la clave.";
  const nombres = persona.nombre
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length >= 4 && !p.startsWith("["));
  if (nombres.some((n) => minusculas.includes(n))) return "No uses tu nombre en la clave.";
  if (minusculas.includes("casacruz") || minusculas.includes("casa cruz")) return "No uses el nombre de la empresa.";
  return null;
}
