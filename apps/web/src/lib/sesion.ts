import { cookies } from "next/headers";

/**
 * Sesión de la web.
 *
 * El token lo emite la API y vive en una cookie httpOnly: el navegador nunca lo
 * lee, y cada petición al servidor lo reenvía.
 */

export const COOKIE_SESION = "cc-sesion";

export async function tokenDeSesion(): Promise<string | null> {
  const almacen = await cookies();
  return almacen.get(COOKIE_SESION)?.value ?? null;
}

/** Con API configurada y sin token, la app exige entrar. */
export async function haySesion(): Promise<boolean> {
  if (!process.env.API_URL) return true; // modo demostración, sin backend
  return (await tokenDeSesion()) !== null;
}
