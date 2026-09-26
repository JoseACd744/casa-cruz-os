import type { FastifyInstance } from "fastify";
import { construirServidor } from "./server";

/**
 * Utilidades para probar la API sin red: `app.inject()` arma la petición en
 * memoria. Las mismas pruebas corren contra el mock o contra Postgres según
 * exista DATABASE_URL.
 */

process.env.LOG_LEVEL ??= "silent";

let servidor: FastifyInstance | null = null;

export async function servidorDePrueba(): Promise<FastifyInstance> {
  if (!servidor) {
    servidor = await construirServidor();
    await servidor.ready();
  }
  return servidor;
}

export const CORREOS = {
  cerrador: "jorge.diaz@casacruz.mx",
  otroCerrador: "mariana.ruiz@casacruz.mx",
  cerradorPuebla: "luis.ortega@casacruz.mx",
  gerente: "gerente.rivieramaya@casacruz.mx",
  corporativo: "direccion@casacruz.mx",
} as const;

/** Encabezados con la sesión del usuario (clave de demostración). */
export async function entrar(
  app: FastifyInstance,
  correo: string,
  contrasena = "casacruz",
): Promise<Record<string, string>> {
  const r = await app.inject({ method: "POST", url: "/sesion", payload: { correo, contrasena } });
  if (r.statusCode !== 200) throw new Error(`No se pudo entrar como ${correo}: ${r.body}`);
  return { authorization: `Bearer ${r.json().token as string}` };
}

/** Cuerpo multipart con un solo archivo en el campo `archivo`. */
export function multipart(
  nombreArchivo: string,
  tipo: string,
  contenido: Buffer,
): { payload: Buffer; headers: Record<string, string> } {
  const limite = `----casacruz${Math.random().toString(16).slice(2)}`;
  const cabecera =
    `--${limite}\r\nContent-Disposition: form-data; name="archivo"; filename="${nombreArchivo}"\r\n` +
    `Content-Type: ${tipo}\r\n\r\n`;
  return {
    payload: Buffer.concat([Buffer.from(cabecera), contenido, Buffer.from(`\r\n--${limite}--\r\n`)]),
    headers: { "content-type": `multipart/form-data; boundary=${limite}` },
  };
}
