import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { tokenDeSesion } from "@/lib/sesion";

/**
 * Conversación con la API (apps/api, que puede vivir en otro servidor).
 *
 * Con `API_URL` todo sale de la API y un error se muestra como error: nunca se
 * cae a los datos de demostración, que en producción parecerían inventario
 * real. Sin `API_URL`, la web trabaja sola con esos datos (modo demostración).
 */

export const API = process.env.API_URL?.replace(/\/$/, "") || null;

export const usandoApi = API !== null;

export const SIN_API =
  "Modo demostración: sin la API conectada, los cambios no se guardan. Levanta la API y define API_URL.";

export class ErrorDeApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
    readonly detalle?: unknown,
  ) {
    super(mensaje);
  }
}

async function encabezados(): Promise<Headers> {
  const h = new Headers({ accept: "application/json" });
  const token = await tokenDeSesion();
  if (token) h.set("authorization", `Bearer ${token}`);
  // La IP del visitante, para que la API limite por persona y no por servidor.
  const entrantes = await headers();
  const ip = entrantes.get("x-forwarded-for") ?? entrantes.get("x-real-ip");
  if (ip) h.set("x-forwarded-for", ip);
  return h;
}

/**
 * La API no reconoce la sesión: al acceso. Si había token, es que venció y se
 * avisa; si no, simplemente falta entrar.
 */
async function alAcceso(): Promise<never> {
  redirect((await tokenDeSesion()) ? "/login?vencida=1" : "/login");
}

/** El mensaje que manda la API, o uno legible si no manda ninguno. */
async function errorDe(respuesta: Response): Promise<{ error: string; detalle?: unknown }> {
  try {
    const cuerpo = (await respuesta.json()) as {
      error?: string;
      message?: string;
      code?: string;
      detalle?: unknown;
    };
    // Las validaciones de Fastify traen el detalle en `message`.
    if (cuerpo.code === "FST_ERR_VALIDATION" && cuerpo.message) {
      return { error: `Revisa los datos: ${cuerpo.message}` };
    }
    return { error: cuerpo.error ?? cuerpo.message ?? respuesta.statusText, detalle: cuerpo.detalle };
  } catch {
    return { error: `La API respondió ${respuesta.status}` };
  }
}

/**
 * Lectura. Sólo se usa con API configurada.
 *
 * 404 → null · 401 → al acceso (la sesión venció) · 403 → `siProhibido` si se
 * da, si no error · cualquier otra falla → error, que muestra `error.tsx`.
 */
export async function pedir<T>(ruta: string, opciones: { siProhibido?: T } = {}): Promise<T | null> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}${ruta}`, { cache: "no-store", headers: await encabezados() });
  } catch {
    throw new ErrorDeApi(503, "No se pudo conectar con la Base Maestra.");
  }

  if (respuesta.status === 404) return null;
  if (respuesta.status === 401) await alAcceso();
  if (respuesta.status === 403 && "siProhibido" in opciones) return opciones.siProhibido as T;
  if (!respuesta.ok) {
    const { error, detalle } = await errorDe(respuesta);
    throw new ErrorDeApi(respuesta.status, error, detalle);
  }
  return (await respuesta.json()) as T;
}

export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; estado: number; error: string; detalle?: unknown };

/** Escritura, para los server actions. Nunca lanza: devuelve el error para mostrarlo. */
export async function enviar<T>(
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  ruta: string,
  cuerpo?: unknown,
): Promise<Resultado<T>> {
  if (!API) return { ok: false, estado: 503, error: SIN_API };

  const h = await encabezados();
  let body: BodyInit | undefined;
  if (cuerpo instanceof FormData) {
    body = cuerpo; // fetch pone el boundary del multipart
  } else if (cuerpo !== undefined) {
    h.set("content-type", "application/json");
    body = JSON.stringify(cuerpo);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}${ruta}`, { method: metodo, headers: h, body, cache: "no-store" });
  } catch {
    return { ok: false, estado: 503, error: "No se pudo conectar con la Base Maestra." };
  }

  if (respuesta.status === 401) await alAcceso();
  if (!respuesta.ok) return { ok: false, estado: respuesta.status, ...(await errorDe(respuesta)) };

  const texto = await respuesta.text();
  return { ok: true, datos: (texto ? JSON.parse(texto) : null) as T };
}

/**
 * Descarga de un archivo que la API genera (PDF, CSV) para devolverlo tal cual
 * desde un route handler: el navegador nunca ve el token.
 */
export async function reenviarArchivo(ruta: string): Promise<Response> {
  if (!API) return new Response("Sin API conectada", { status: 503 });

  const h = await encabezados();
  h.delete("accept");
  const respuesta = await fetch(`${API}${ruta}`, { cache: "no-store", headers: h }).catch(() => null);
  if (!respuesta) return new Response("No se pudo conectar con la Base Maestra.", { status: 503 });
  if (respuesta.status === 401) await alAcceso();
  if (!respuesta.ok) return new Response((await errorDe(respuesta)).error, { status: respuesta.status });

  const salida = new Headers();
  for (const nombre of ["content-type", "content-disposition", "content-length"]) {
    const valor = respuesta.headers.get(nombre);
    if (valor) salida.set(nombre, valor);
  }
  salida.set("cache-control", "private, no-store");
  return new Response(respuesta.body, { status: 200, headers: salida });
}
