import {
  cambios,
  clientes,
  desarrollos,
  novedades,
  plazas,
  propuestas,
  usuarios,
} from "@/lib/mock/data";
import { confiabilidad } from "@/lib/confiabilidad";
import type {
  Cambio,
  Cliente,
  Desarrollo,
  EstatusListing,
  FiltrosInventario,
  Propuesta,
  Tipologia,
  Usuario,
} from "@/lib/types";

/**
 * Capa de acceso a datos.
 *
 * Hoy lee del arreglo en memoria de `mock/data.ts`. Cuando exista la Base
 * Maestra real, sólo se reescriben estas funciones (Airtable, Postgres o lo que
 * se elija): las pantallas no cambian porque sólo hablan con este módulo.
 */

// ── Derivados de producto ────────────────────────────────────────────────

export function preciosDe(d: Desarrollo): number[] {
  return d.tipologias
    .flatMap((t) => t.niveles.map((n) => n.precioVenta))
    .filter((p): p is number => p !== null);
}

export function precioDesde(d: Desarrollo): number | null {
  const precios = preciosDe(d);
  return precios.length ? Math.min(...precios) : null;
}

export function precioHasta(d: Desarrollo): number | null {
  const precios = preciosDe(d);
  return precios.length ? Math.max(...precios) : null;
}

export function rangoRecamaras(d: Desarrollo): string | null {
  const valores = d.tipologias
    .map((t) => t.recamaras)
    .filter((r): r is number => r !== null);
  if (!valores.length) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return min === max ? `${min}` : `${min} – ${max}`;
}

export function rangoBanos(d: Desarrollo): string | null {
  const valores = d.tipologias.map((t) => t.banos).filter((b): b is number => b !== null);
  if (!valores.length) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return min === max ? `${min}` : `${min} – ${max}`;
}

export function rangoM2(d: Desarrollo): string | null {
  const valores = d.tipologias
    .map((t) => t.m2Construccion)
    .filter((m): m is number => m !== null);
  if (!valores.length) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return min === max ? `${min} m²` : `${min} – ${max} m²`;
}

export function precioPorM2(t: Tipologia): number | null {
  const precios = t.niveles.map((n) => n.precioVenta).filter((p): p is number => p !== null);
  if (!precios.length || !t.m2Construccion) return null;
  return Math.round(Math.min(...precios) / t.m2Construccion);
}

export function tipologiaMasBarata(d: Desarrollo): Tipologia | null {
  let mejor: Tipologia | null = null;
  let mejorPrecio = Infinity;
  for (const t of d.tipologias) {
    for (const n of t.niveles) {
      if (n.precioVenta !== null && n.precioVenta < mejorPrecio) {
        mejorPrecio = n.precioVenta;
        mejor = t;
      }
    }
  }
  return mejor;
}

// ── Consultas ────────────────────────────────────────────────────────────

export async function listarPlazas() {
  return plazas;
}

export async function listarDesarrollos(filtros: FiltrosInventario = {}): Promise<Desarrollo[]> {
  let out = [...desarrollos];

  if (filtros.soloPublicados) {
    out = out.filter((d) => d.estatus === "publicado");
  }
  if (filtros.ciudad) {
    out = out.filter((d) => d.ciudad === filtros.ciudad);
  }
  if (filtros.q) {
    const q = filtros.q.toLowerCase();
    out = out.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        d.ciudad.toLowerCase().includes(q) ||
        (d.zona ?? "").toLowerCase().includes(q),
    );
  }
  if (filtros.recamaras) {
    out = out.filter((d) =>
      d.tipologias.some((t) => t.recamaras !== null && t.recamaras >= filtros.recamaras!),
    );
  }
  if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
    const min = filtros.precioMin ?? 0;
    const max = filtros.precioMax ?? Infinity;
    out = out.filter((d) => {
      const desde = precioDesde(d);
      // Un desarrollo sin precio capturado no se descarta: se muestra marcado
      // como dato faltante, que es justamente lo que hay que corregir.
      if (desde === null) return true;
      return desde >= min && desde <= max;
    });
  }

  return out.sort((a, b) => (precioDesde(a) ?? Infinity) - (precioDesde(b) ?? Infinity));
}

export async function obtenerDesarrollo(id: string): Promise<Desarrollo | undefined> {
  return desarrollos.find((d) => d.id === id);
}

export async function obtenerDesarrollos(ids: string[]): Promise<Desarrollo[]> {
  return ids
    .map((id) => desarrollos.find((d) => d.id === id))
    .filter((d): d is Desarrollo => Boolean(d));
}

export async function obtenerUsuarioActual(): Promise<Usuario> {
  return usuarios[0];
}

export async function listarUsuarios(): Promise<Usuario[]> {
  return usuarios;
}

export async function obtenerCliente(id: string): Promise<Cliente | undefined> {
  return clientes.find((c) => c.id === id);
}

export async function listarClientes(): Promise<Cliente[]> {
  return clientes;
}

export async function obtenerPropuesta(slug: string): Promise<Propuesta | undefined> {
  return propuestas.find((p) => p.slug === slug);
}

export async function listarPropuestas(): Promise<Propuesta[]> {
  return propuestas;
}

export async function listarCambios(estado?: Cambio["estado"]): Promise<Cambio[]> {
  return estado ? cambios.filter((c) => c.estado === estado) : cambios;
}

export async function cambiosDe(desarrolloId: string): Promise<Cambio[]> {
  return cambios.filter((c) => c.desarrolloId === desarrolloId);
}

export async function listarNovedades() {
  return novedades;
}

export async function conteoPipeline(): Promise<Record<EstatusListing, number>> {
  const base: Record<EstatusListing, number> = {
    borrador: 4,
    revision: 0,
    due_diligence: 1,
    aprobado: 0,
    publicado: 0,
  };
  for (const d of desarrollos) base[d.estatus] += 1;
  return base;
}

/** Desarrollos a cargo del usuario que necesitan validación. */
export async function pendientesDeValidar(usuarioId: string) {
  const mios = desarrollos.filter((d) => d.responsableId === usuarioId);
  return mios
    .map((d) => ({ desarrollo: d, confiabilidad: confiabilidad(d) }))
    .filter((x) => x.confiabilidad < 85)
    .sort((a, b) => a.confiabilidad - b.confiabilidad);
}
