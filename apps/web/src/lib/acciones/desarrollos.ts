"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { Desarrollo, EstatusListing } from "@casacruz/core";
import { enviar } from "@/lib/api";
import { confirmarSubida } from "./subidas";
import { conTipo } from "./archivos";
import { lineas, numero, opcional, texto, type EstadoAccion } from "./tipos";

/**
 * Alta y edición de desarrollos. Cada paso del asistente guarda lo suyo; la API
 * decide qué se puede tocar según el estatus y el rol.
 */

const GUARDADO: EstadoAccion = { ok: "Guardado." };

function ruta(id: string, resto = "") {
  return `/desarrollos/${encodeURIComponent(id)}${resto}`;
}

/** El error de la API, con la lista de lo que falta si la trae. */
function conDetalle(error: string, detalle: unknown): EstadoAccion {
  return Array.isArray(detalle) && detalle.length
    ? { error: `${error}:\n· ${detalle.join("\n· ")}` }
    : { error };
}

async function parchar(id: string, cuerpo: Record<string, unknown>): Promise<EstadoAccion> {
  const r = await enviar<Desarrollo>("PATCH", ruta(id), cuerpo);
  if (!r.ok) return conDetalle(r.error, r.detalle);
  refresh();
  return GUARDADO;
}

/** Lee números del formulario; si alguno no se entiende, devuelve cuál. */
function numeros<K extends string>(
  datos: FormData,
  campos: Record<K, string>,
): { ok: true; valores: Record<K, number | null> } | { ok: false; error: string } {
  const valores = {} as Record<K, number | null>;
  for (const [campo, etiqueta] of Object.entries(campos) as [K, string][]) {
    const valor = numero(texto(datos, campo));
    if (valor === undefined) return { ok: false, error: `Revisa “${etiqueta}”: debe ser un número.` };
    valores[campo] = valor;
  }
  return { ok: true, valores };
}

// ── Paso 1 · Identificación ─────────────────────────────────────────────

export async function crearDesarrollo(_previo: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const r = await enviar<Desarrollo>("POST", "/desarrollos", {
    nombre: texto(datos, "nombre"),
    plazaId: texto(datos, "plazaId"),
    ciudad: texto(datos, "ciudad"),
    tipo: texto(datos, "tipo"),
    zona: opcional(texto(datos, "zona")),
    entrega: opcional(texto(datos, "entrega")),
  });
  if (!r.ok) return { error: r.error };
  redirect(`/propiedades/${encodeURIComponent(r.datos.id)}/editar?paso=2`);
}

export async function guardarIdentificacion(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const coordenadas = numeros(datos, { lat: "Latitud", lng: "Longitud" });
  if (!coordenadas.ok) return { error: coordenadas.error };

  return parchar(id, {
    nombre: texto(datos, "nombre"),
    tipo: texto(datos, "tipo"),
    ciudad: texto(datos, "ciudad"),
    zona: opcional(texto(datos, "zona")),
    direccion: opcional(texto(datos, "direccion")),
    desarrollador: opcional(texto(datos, "desarrollador")),
    lat: coordenadas.valores.lat,
    lng: coordenadas.valores.lng,
    amenidades: lineas(texto(datos, "amenidades")),
    aConsiderar: lineas(texto(datos, "aConsiderar")),
    // Si el campo viene bloqueado (desarrollo aprobado), el formulario no lo manda.
    ...(datos.has("entrega") ? { entrega: opcional(texto(datos, "entrega")) } : {}),
  });
}

// ── Paso 2 · Tipologías ──────────────────────────────────────────────────

export async function guardarTipologia(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const medidas = numeros(datos, {
    recamaras: "Recámaras",
    banos: "Baños",
    m2Construccion: "m² de construcción",
    m2Terreno: "m² de terreno",
    estacionamientos: "Estacionamientos",
  });
  if (!medidas.ok) return { error: medidas.error };

  const nombres = datos.getAll("nivelNombre").map(String);
  const niveles = [];
  for (const [i, bruto] of nombres.entries()) {
    const nombre = bruto.trim();
    if (!nombre) continue;
    const precioVenta = numero(String(datos.getAll("nivelPrecio")[i] ?? ""));
    const precioLista = numero(String(datos.getAll("nivelLista")[i] ?? ""));
    const disponibles = numero(String(datos.getAll("nivelDisponibles")[i] ?? ""));
    if (precioVenta === undefined || precioLista === undefined || disponibles === undefined) {
      return { error: `Revisa los números del nivel “${nombre}”.` };
    }
    niveles.push({ nombre, precioVenta, precioLista: precioLista ?? precioVenta, disponibles });
  }
  if (!niveles.length) return { error: "Agrega al menos un nivel (planta baja, primer nivel…)." };

  const r = await enviar("PUT", ruta(id, "/tipologias"), {
    id: texto(datos, "tipologiaId") || undefined,
    nombre: texto(datos, "nombre"),
    planoUrl: opcional(texto(datos, "planoUrl")),
    ...medidas.valores,
    recamaras: medidas.valores.recamaras === null ? null : Math.round(medidas.valores.recamaras),
    estacionamientos:
      medidas.valores.estacionamientos === null ? null : Math.round(medidas.valores.estacionamientos),
    niveles: niveles.map((n) => ({
      ...n,
      disponibles: n.disponibles === null ? null : Math.round(n.disponibles),
    })),
  });
  if (!r.ok) return conDetalle(r.error, r.detalle);
  refresh();
  return GUARDADO;
}

export async function eliminarTipologia(id: string, tipologiaId: string): Promise<EstadoAccion> {
  const r = await enviar("DELETE", ruta(id, `/tipologias/${encodeURIComponent(tipologiaId)}`));
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Tipología eliminada." };
}

// ── Paso 3 · Condiciones ─────────────────────────────────────────────────

export async function guardarCondiciones(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const porcentajes = numeros(datos, { enganchePct: "Enganche", restoPct: "Resto" });
  if (!porcentajes.ok) return { error: porcentajes.error };

  return parchar(id, {
    condiciones: {
      ...(datos.has("enganchePct") ? { enganchePct: porcentajes.valores.enganchePct } : {}),
      restoPct: porcentajes.valores.restoPct,
      engancheNota: opcional(texto(datos, "engancheNota")),
      restoNota: opcional(texto(datos, "restoNota")),
      mensualidades: opcional(texto(datos, "mensualidades")),
      formasPago: datos.getAll("formasPago").map(String),
      ...(datos.has("promocionVigente")
        ? { promocionVigente: opcional(texto(datos, "promocionVigente")) }
        : {}),
      descuentoContado: opcional(texto(datos, "descuentoContado")),
    },
  });
}

// ── Paso 4 · Multimedia ──────────────────────────────────────────────────

export async function subirMultimedia(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const tickets = datos.getAll("archivosTicket").filter((t): t is string => typeof t === "string");
  if (tickets.length) {
    for (const ticket of tickets) {
      const r = await confirmarSubida(ticket, "multimedia", id);
      if (!r.ok) { refresh(); return { error: r.error }; }
    }
    refresh();
    return { ok: tickets.length === 1 ? "Archivo cargado." : `${tickets.length} archivos cargados.` };
  }
  const tipo = texto(datos, "tipo") || "foto";
  const archivos = datos.getAll("archivos").filter((a): a is File => a instanceof File && a.size > 0);
  if (!archivos.length) return { error: "Elige al menos un archivo." };

  for (const original of archivos) {
    const archivo = conTipo(original);
    const cuerpo = new FormData();
    cuerpo.append("archivo", archivo, archivo.name);
    const r = await enviar("POST", ruta(id, `/multimedia?tipo=${encodeURIComponent(tipo)}`), cuerpo);
    if (!r.ok) {
      refresh();
      return { error: `No se pudo subir ${archivo.name}: ${r.error}` };
    }
  }
  refresh();
  return { ok: archivos.length === 1 ? "Archivo cargado." : `${archivos.length} archivos cargados.` };
}

export async function quitarMultimedia(id: string, url: string): Promise<EstadoAccion> {
  const r = await enviar("DELETE", ruta(id, "/multimedia"), { url });
  if (!r.ok) return { error: r.error };
  refresh();
  return {};
}

export async function ordenarMultimedia(id: string, urls: string[]): Promise<EstadoAccion> {
  const r = await enviar("PUT", ruta(id, "/multimedia/orden"), { urls });
  if (!r.ok) return { error: r.error };
  refresh();
  return {};
}

// ── Paso 5 · Comercial ───────────────────────────────────────────────────

export async function guardarComercial(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  return parchar(id, {
    comercial: {
      buyerPersona: opcional(texto(datos, "buyerPersona")),
      clienteIdeal: opcional(texto(datos, "clienteIdeal")),
      argumentos: lineas(texto(datos, "argumentos")),
      diferenciadores: lineas(texto(datos, "diferenciadores")),
      objeciones: lineas(texto(datos, "objeciones")),
      comparables: lineas(texto(datos, "comparables")),
      noDeberiaComprarlo: lineas(texto(datos, "noDeberiaComprarlo")),
    },
  });
}

// ── Paso 6 · Interna y legal ─────────────────────────────────────────────

export async function guardarInterna(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const convenio = texto(datos, "convenioFirmado");
  return parchar(id, {
    interna: {
      contactoComercial: opcional(texto(datos, "contactoComercial")),
      convenioFirmado: convenio === "si" ? true : convenio === "no" ? false : null,
      notasInternas: opcional(texto(datos, "notasInternas")),
      ...(datos.has("dueDiligence") ? { dueDiligence: texto(datos, "dueDiligence") } : {}),
    },
  });
}

export async function subirDocumento(
  id: string,
  _previo: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  const ticket = texto(datos, "archivoTicket");
  if (ticket) {
    const r = await confirmarSubida(ticket, "documento", id);
    if (!r.ok) return { error: r.error };
    refresh();
    return { ok: "Documento cargado." };
  }
  const archivo = datos.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige el documento." };

  const cuerpo = new FormData();
  const conSuTipo = conTipo(archivo);
  cuerpo.append("archivo", conSuTipo, conSuTipo.name);
  const params = new URLSearchParams({ tipo: texto(datos, "tipo") || "otro" });
  const nombre = texto(datos, "nombre");
  if (nombre) params.set("nombre", nombre);

  const r = await enviar("POST", ruta(id, `/documentos?${params}`), cuerpo);
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Documento cargado." };
}

// ── Flujo de alta ────────────────────────────────────────────────────────

export async function cambiarEstatus(id: string, estatus: EstatusListing): Promise<EstadoAccion> {
  const r = await enviar<Desarrollo>("POST", ruta(id, "/estatus"), { estatus });
  if (!r.ok) return conDetalle(r.error, r.detalle);
  refresh();
  return {};
}
