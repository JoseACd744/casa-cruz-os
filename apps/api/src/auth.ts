import "@fastify/jwt";
import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import { alcanza, type Rol, type Usuario } from "@casacruz/core";
import { fuente } from "./datos";

/**
 * Sesión y permisos.
 *
 * El rol no es decorativo: decide qué campos se devuelven y qué operaciones se
 * permiten. La regla del documento —"no todos deben ver todo"— se aplica aquí,
 * no en la interfaz.
 *
 * El token sólo dice quién es. El rol, las plazas y si sigue activo se leen de
 * la Base Maestra en cada petición (con un caché corto): desactivar a alguien o
 * cambiarle el rol surte efecto de inmediato, no cuando vence su token.
 */

export interface Sesion {
  id: string;
  nombre: string;
  rol: Rol;
  plazas: string[];
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: Sesion;
    user: Sesion;
  }
}

const scryptAsync = promisify(scrypt);

/** Hash de contraseña con scrypt (viene en Node, sin dependencias). */
export async function cifrarContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const derivada = (await scryptAsync(contrasena, sal, 64)) as Buffer;
  return `scrypt:${sal.toString("hex")}:${derivada.toString("hex")}`;
}

export async function verificarContrasena(contrasena: string, hash: string): Promise<boolean> {
  const [algoritmo, salHex, esperadoHex] = hash.split(":");
  if (algoritmo !== "scrypt" || !salHex || !esperadoHex) return false;
  const derivada = (await scryptAsync(contrasena, Buffer.from(salHex, "hex"), 64)) as Buffer;
  const esperado = Buffer.from(esperadoHex, "hex");
  return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
}

/** Clave temporal legible para dictarla o copiarla: sin 0/O ni 1/l/I. */
export function claveTemporal(): string {
  const alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bloque = () => Array.from({ length: 4 }, () => alfabeto[randomInt(alfabeto.length)]).join("");
  return `${bloque()}-${bloque()}-${bloque()}`;
}

// ── Usuario vigente ──────────────────────────────────────────────────────

const VIGENCIA_CACHE_MS = 30_000;
const cache = new Map<string, { usuario: Usuario | null; hasta: number }>();

/** El usuario tal como está hoy en la Base Maestra. */
export async function usuarioVigente(id: string): Promise<Usuario | null> {
  const guardado = cache.get(id);
  if (guardado && guardado.hasta > Date.now()) return guardado.usuario;
  const datos = await fuente();
  const usuario = await datos.obtenerUsuario(id);
  cache.set(id, { usuario, hasta: Date.now() + VIGENCIA_CACHE_MS });
  return usuario;
}

/** Tras editar a un usuario, que la próxima petición lo lea de nuevo. */
export function olvidarUsuario(id: string): void {
  cache.delete(id);
}

function sesionDe(usuario: Usuario): Sesion {
  return { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, plazas: usuario.plazasCertificadas };
}

/**
 * Exige sesión, y opcionalmente un rol mínimo.
 *
 *   { preHandler: exigir("gerente") }
 *
 * Quien entró con clave temporal sólo puede cambiarla: el resto responde 403
 * hasta que lo haga (`claveTemporal: true` abre la ruta para ese caso).
 */
export function exigir(minimo: Rol = "cerrador", opciones: { claveTemporal?: boolean } = {}) {
  return async function guardia(peticion: FastifyRequest, respuesta: FastifyReply) {
    try {
      await peticion.jwtVerify();
    } catch {
      return respuesta.code(401).send({ error: "Falta iniciar sesión" });
    }

    const usuario = await usuarioVigente(peticion.user.id);
    if (!usuario || !usuario.activo) {
      return respuesta.code(401).send({ error: "Tu acceso fue desactivado. Habla con corporativo." });
    }
    peticion.user = sesionDe(usuario);

    if (usuario.debeCambiarContrasena && !opciones.claveTemporal) {
      return respuesta.code(403).send({ error: "Cambia tu clave temporal para continuar." });
    }
    if (!alcanza(usuario.rol, minimo)) {
      return respuesta.code(403).send({
        error: `Esta operación es para ${minimo} o superior; tu rol es ${usuario.rol}.`,
      });
    }
    return undefined;
  };
}

/** Sesión si el token viene, sin exigirlo (rutas públicas que cambian según quién mira). */
export async function sesionOpcional(peticion: FastifyRequest): Promise<Sesion | null> {
  try {
    await peticion.jwtVerify();
  } catch {
    return null;
  }
  const usuario = await usuarioVigente(peticion.user.id);
  if (!usuario || !usuario.activo || usuario.debeCambiarContrasena) return null;
  return sesionDe(usuario);
}
