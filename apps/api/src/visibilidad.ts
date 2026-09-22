import type { Desarrollo, Rol } from "@casacruz/core";
import { alcanza } from "./auth";

/**
 * Qué puede ver cada quién.
 *
 * Del documento de Casa Cruz: el cliente ve precio, fotos, ubicación,
 * características, amenidades y formas de pago. Los argumentos, las objeciones y
 * todo lo interno son del cerrador para arriba. Filtrar aquí, en el servidor, es
 * lo único que garantiza que no se filtre por una pantalla mal hecha.
 */

const INTERNA_VACIA: Desarrollo["interna"] = {
  comisionPct: null,
  contactoComercial: null,
  convenioFirmado: null,
  dueDiligence: "pendiente",
  notasInternas: null,
  documentos: [],
};

const COMERCIAL_VACIA: Desarrollo["comercial"] = {
  buyerPersona: null,
  clienteIdeal: null,
  argumentos: [],
  diferenciadores: [],
  objeciones: [],
  comparables: [],
  noDeberiaComprarlo: [],
};

export function desarrolloSegunRol(d: Desarrollo, rol: Rol | null): Desarrollo {
  // Cerrador certificado y arriba: todo.
  if (rol && alcanza(rol, "cerrador")) return d;

  // Cliente o sin sesión: se va lo interno y el conocimiento comercial.
  // `aConsiderar` sí se queda: son las advertencias que el cliente debe conocer.
  return { ...d, interna: INTERNA_VACIA, comercial: COMERCIAL_VACIA };
}

export function desarrollosSegunRol(lista: Desarrollo[], rol: Rol | null): Desarrollo[] {
  if (rol && alcanza(rol, "cerrador")) return lista;
  return lista.map((d) => desarrolloSegunRol(d, rol));
}
