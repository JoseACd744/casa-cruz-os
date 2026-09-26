import type { Rol } from "./types";

/**
 * Roles.
 *
 * Cada rol incluye lo que puede ver el anterior. La API decide con esto qué
 * devuelve y qué permite; la web lo usa sólo para no mostrar botones que el
 * servidor va a rechazar.
 */

export const NIVEL_ROL: Record<Rol, number> = {
  cliente: 0,
  cerrador: 1,
  gerente: 2,
  corporativo: 3,
};

export function alcanza(rol: Rol, minimo: Rol): boolean {
  return NIVEL_ROL[rol] >= NIVEL_ROL[minimo];
}

export const etiquetaRol: Record<Rol, string> = {
  cliente: "Cliente",
  cerrador: "Cerrador certificado",
  gerente: "Gerente de plaza",
  corporativo: "Corporativo",
};
