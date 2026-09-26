import type { Desarrollo, EstatusListing, Rol, Tipologia } from "./types";
import { CAMPOS_CAMBIABLES, type CampoCambiable } from "./cambios";
import { requisitosParaPublicar } from "./reglas";
import { alcanza } from "./roles";

/**
 * Alta y edición de un desarrollo.
 *
 * Mientras se captura (borrador, revisión, due diligence) los datos se editan
 * libremente: todavía nadie los ha visto. Desde que se aprueba, lo que el
 * cliente puede ver —precio, disponibilidad, entrega, promoción, enganche—
 * sólo cambia con un cambio registrado, su fuente y, si toca, su aprobación.
 */

const PROTEGIDOS: CampoCambiable[] = ["precio", "disponibilidad", "promocion", "entrega", "enganche"];

export function camposProtegidos(estatus: EstatusListing): CampoCambiable[] {
  return estatus === "aprobado" || estatus === "publicado" ? PROTEGIDOS : [];
}

export function estaProtegido(estatus: EstatusListing, campo: CampoCambiable): boolean {
  // La comisión es sensible siempre: se registra como cambio desde el primer día.
  return campo === "comision" || camposProtegidos(estatus).includes(campo);
}

/** Parche de edición general, con la forma que recibe la API. */
export interface ParcheEdicion {
  entrega?: string | null;
  condiciones?: { promocionVigente?: string | null; enganchePct?: number | null };
  interna?: { comisionPct?: number | null };
}

/** Qué campos protegidos cambiaría este parche. Vacío si se puede aplicar. */
export function cambiosProtegidosEnParche(d: Desarrollo, parche: ParcheEdicion): string[] {
  const tocados: CampoCambiable[] = [];
  if (parche.entrega !== undefined && parche.entrega !== d.entrega) tocados.push("entrega");
  if (
    parche.condiciones?.promocionVigente !== undefined &&
    parche.condiciones.promocionVigente !== d.condiciones.promocionVigente
  ) {
    tocados.push("promocion");
  }
  if (
    parche.condiciones?.enganchePct !== undefined &&
    parche.condiciones.enganchePct !== d.condiciones.enganchePct
  ) {
    tocados.push("enganche");
  }
  if (parche.interna?.comisionPct !== undefined && parche.interna.comisionPct !== d.interna.comisionPct) {
    tocados.push("comision");
  }
  return tocados.filter((c) => estaProtegido(d.estatus, c)).map((c) => CAMPOS_CAMBIABLES[c].etiqueta);
}

/**
 * Qué cambiaría en precios o disponibilidad de una tipología que ya existe.
 * Una tipología nueva se puede agregar: es producto nuevo, con sus precios.
 */
export function cambiosProtegidosEnTipologia(
  d: Desarrollo,
  entrada: {
    id?: string;
    niveles: { nombre: string; precioVenta: number | null; disponibles?: number | null }[];
  },
): string[] {
  if (!camposProtegidos(d.estatus).length) return [];
  const existente = d.tipologias.find((t) => t.id === entrada.id);
  if (!existente) return [];

  const tocados: string[] = [];
  for (const nivel of existente.niveles) {
    const nuevo = entrada.niveles.find((n) => n.nombre === nivel.nombre);
    if (!nuevo) {
      tocados.push(`${nivel.nombre} (se quitaría)`);
      continue;
    }
    if (nuevo.precioVenta !== nivel.precioVenta) tocados.push(`Precio de ${nivel.nombre}`);
    const disponibles = nuevo.disponibles ?? null;
    if (disponibles !== nivel.disponibles) tocados.push(`Disponibilidad de ${nivel.nombre}`);
  }
  return tocados;
}

// ── Completitud ──────────────────────────────────────────────────────────

export type SeccionAlta = "identificacion" | "tipologias" | "condiciones" | "multimedia" | "comercial" | "interna";

export const PASOS_ALTA: { seccion: SeccionAlta; nombre: string }[] = [
  { seccion: "identificacion", nombre: "Identificación" },
  { seccion: "tipologias", nombre: "Producto y tipologías" },
  { seccion: "condiciones", nombre: "Condiciones comerciales" },
  { seccion: "multimedia", nombre: "Multimedia" },
  { seccion: "comercial", nombre: "Comercial Casa Cruz" },
  { seccion: "interna", nombre: "Interna y legal" },
];

export interface EstadoSeccion {
  seccion: SeccionAlta;
  nombre: string;
  total: number;
  faltan: string[];
}

function faltantesTipologia(t: Tipologia): string[] {
  const faltan: string[] = [];
  if (t.recamaras === null) faltan.push(`recámaras de ${t.nombre}`);
  if (t.banos === null) faltan.push(`baños de ${t.nombre}`);
  if (t.m2Construccion === null) faltan.push(`m² de ${t.nombre}`);
  if (!t.niveles.some((n) => n.precioVenta !== null)) faltan.push(`precio de ${t.nombre}`);
  if (t.niveles.every((n) => n.disponibles === null)) faltan.push(`disponibilidad de ${t.nombre}`);
  return faltan;
}

/** Qué falta por sección. Nunca se inventa: lo que está en null, falta. */
export function completitud(d: Desarrollo): { porcentaje: number; secciones: EstadoSeccion[] } {
  const hay = (v: unknown) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  const revisar = (campos: [string, unknown][]) => campos.filter(([, v]) => !hay(v)).map(([n]) => n);

  const imagenes = (d.multimedia ?? []).filter((m) => m.tipo === "foto" || m.tipo === "render").length;

  const secciones: EstadoSeccion[] = [
    {
      seccion: "identificacion",
      nombre: "Identificación",
      total: 6,
      faltan: revisar([
        ["zona", d.zona],
        ["dirección", d.direccion],
        ["ubicación en el mapa", d.lat !== null && d.lng !== null ? true : null],
        ["desarrollador", d.desarrollador],
        ["fecha de entrega", d.entrega],
        ["amenidades", d.amenidades],
      ]),
    },
    {
      seccion: "tipologias",
      nombre: "Producto y tipologías",
      total: Math.max(1, d.tipologias.length * 5),
      faltan: d.tipologias.length ? d.tipologias.flatMap(faltantesTipologia) : ["al menos una tipología"],
    },
    {
      seccion: "condiciones",
      nombre: "Condiciones comerciales",
      total: 5,
      faltan: revisar([
        ["enganche", d.condiciones.enganchePct],
        ["resto", d.condiciones.restoPct],
        ["formas de pago", d.condiciones.formasPago],
        ["promoción vigente", d.condiciones.promocionVigente],
        ["descuento por contado", d.condiciones.descuentoContado],
      ]),
    },
    {
      seccion: "multimedia",
      nombre: "Multimedia",
      total: 3,
      faltan: [
        ...(imagenes >= 3 ? [] : [`${3 - imagenes} ${3 - imagenes === 1 ? "foto o render" : "fotos o renders"}`]),
        ...((d.multimedia ?? []).some((m) => m.tipo === "video") ? [] : ["video"]),
        ...((d.multimedia ?? []).some((m) => m.tipo === "brochure") ? [] : ["brochure"]),
      ],
    },
    {
      seccion: "comercial",
      nombre: "Comercial Casa Cruz",
      total: 6,
      faltan: revisar([
        ["argumentos de venta", d.comercial.argumentos],
        ["objeciones frecuentes", d.comercial.objeciones],
        ["buyer persona", d.comercial.buyerPersona],
        ["cliente ideal", d.comercial.clienteIdeal],
        ["diferenciadores", d.comercial.diferenciadores],
        ["qué cliente no debería comprarlo", d.comercial.noDeberiaComprarlo],
      ]),
    },
    {
      seccion: "interna",
      nombre: "Interna y legal",
      total: 5,
      faltan: revisar([
        ["contacto comercial", d.interna.contactoComercial],
        ["convenio firmado", d.interna.convenioFirmado],
        ["comisión autorizada", d.interna.comisionPct],
        ["due diligence validado", d.interna.dueDiligence === "validado" ? true : null],
        ["documentación", d.interna.documentos],
      ]),
    },
  ];

  const total = secciones.reduce((a, s) => a + s.total, 0);
  const faltan = secciones.reduce((a, s) => a + Math.min(s.faltan.length, s.total), 0);
  return { porcentaje: Math.round(((total - faltan) / total) * 100), secciones };
}

// ── Flujo de estatus ─────────────────────────────────────────────────────

export interface Transicion {
  hacia: EstatusListing;
  accion: string;
  minimo: Rol;
}

/**
 * Borrador → Revisión (gerente de plaza) → Due diligence (corporativo) →
 * Aprobado → Publicado. Se puede regresar un paso para corregir.
 */
const TRANSICIONES: Record<EstatusListing, Transicion[]> = {
  borrador: [{ hacia: "revision", accion: "Enviar a revisión", minimo: "cerrador" }],
  revision: [
    { hacia: "due_diligence", accion: "Pasar a due diligence", minimo: "gerente" },
    { hacia: "borrador", accion: "Regresar a borrador", minimo: "cerrador" },
  ],
  due_diligence: [
    { hacia: "aprobado", accion: "Aprobar", minimo: "corporativo" },
    { hacia: "revision", accion: "Regresar a revisión", minimo: "corporativo" },
  ],
  aprobado: [
    { hacia: "publicado", accion: "Publicar", minimo: "corporativo" },
    { hacia: "due_diligence", accion: "Regresar a due diligence", minimo: "corporativo" },
  ],
  publicado: [{ hacia: "aprobado", accion: "Retirar del portal", minimo: "corporativo" }],
};

export function transicionesDe(estatus: EstatusListing): Transicion[] {
  return TRANSICIONES[estatus];
}

/**
 * Por qué no se puede mover el desarrollo a ese estatus, o null si se puede.
 * La API responde con el código; la web usa lo mismo para no ofrecer el botón.
 */
export function motivoParaNoMover(
  d: Desarrollo,
  hacia: EstatusListing,
  rol: Rol,
): { codigo: 403 | 409; mensaje: string; detalle?: string[] } | null {
  const transicion = TRANSICIONES[d.estatus].find((t) => t.hacia === hacia);
  if (!transicion) {
    return { codigo: 409, mensaje: `De ${d.estatus} no se pasa a ${hacia}: el alta va paso por paso.` };
  }
  if (!alcanza(rol, transicion.minimo)) {
    return { codigo: 403, mensaje: `“${transicion.accion}” es de ${transicion.minimo}; tu rol es ${rol}.` };
  }
  if (hacia === "aprobado" && d.interna.dueDiligence !== "validado") {
    return { codigo: 409, mensaje: "No se aprueba sin el due diligence validado." };
  }
  if (hacia === "publicado") {
    const faltan = requisitosParaPublicar(d).filter((r) => !r.cumple).map((r) => r.texto);
    if (faltan.length) {
      return { codigo: 409, mensaje: "El desarrollo no está listo para publicarse", detalle: faltan };
    }
  }
  return null;
}
