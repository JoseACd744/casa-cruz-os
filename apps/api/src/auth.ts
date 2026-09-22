import "@fastify/jwt";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Rol } from "@casacruz/core";

/**
 * Sesión y permisos.
 *
 * El rol no es decorativo: decide qué campos se devuelven y qué operaciones se
 * permiten. La regla del documento —"no todos deben ver todo"— se aplica aquí,
 * no en la interfaz.
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

/** Jerarquía: cada rol incluye lo que puede ver el anterior. */
const nivel: Record<Rol, number> = {
  cliente: 0,
  cerrador: 1,
  gerente: 2,
  corporativo: 3,
};

export function alcanza(rol: Rol, minimo: Rol): boolean {
  return nivel[rol] >= nivel[minimo];
}

/**
 * Exige sesión, y opcionalmente un rol mínimo.
 *
 *   { preHandler: exigir("gerente") }
 */
export function exigir(minimo: Rol = "cerrador") {
  return async function guardia(peticion: FastifyRequest, respuesta: FastifyReply) {
    try {
      await peticion.jwtVerify();
    } catch {
      return respuesta.code(401).send({ error: "Falta iniciar sesión" });
    }

    if (!alcanza(peticion.user.rol, minimo)) {
      return respuesta.code(403).send({
        error: `Esta operación es para ${minimo} o superior; tu rol es ${peticion.user.rol}.`,
      });
    }
    return undefined;
  };
}

/** Sesión si el token viene, sin exigirlo (rutas públicas que cambian según quién mira). */
export async function sesionOpcional(peticion: FastifyRequest): Promise<Sesion | null> {
  try {
    await peticion.jwtVerify();
    return peticion.user;
  } catch {
    return null;
  }
}
