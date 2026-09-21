import {
  confiabilidad,
  filtrarDesarrollos,
  mock,
  type Cambio,
  type Cliente,
  type Desarrollo,
  type EstatusListing,
  type FiltrosInventario,
  type Propuesta,
  type Usuario,
} from "@casacruz/core";

/**
 * Acceso a datos de la web.
 *
 * Si existe `API_URL`, la web consume la API (apps/api, que puede vivir en otro
 * servidor). Si no, trabaja con los datos de demostración del núcleo, para que
 * el portal siga navegable sin backend levantado.
 *
 * Las pantallas sólo llaman a estas funciones: cambiar de origen de datos no
 * toca ni una vista.
 */

const API = process.env.API_URL?.replace(/\/$/, "");

export const usandoApi = Boolean(API);

async function pedir<T>(ruta: string): Promise<T | null> {
  if (!API) return null;
  try {
    const respuesta = await fetch(`${API}${ruta}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!respuesta.ok) return null;
    return (await respuesta.json()) as T;
  } catch {
    // La API no responde: la web sigue funcionando con los datos locales.
    return null;
  }
}

// Cálculos compartidos: se re-exportan para que las pantallas sigan pidiéndolos aquí.
export {
  precioDesde,
  precioHasta,
  preciosDe,
  precioPorM2,
  rangoBanos,
  rangoM2,
  rangoRecamaras,
  tipologiaMasBarata,
} from "@casacruz/core";

// ── Consultas ────────────────────────────────────────────────────────────

export async function listarPlazas() {
  return (await pedir<typeof mock.plazas>("/plazas")) ?? mock.plazas;
}

export async function listarDesarrollos(filtros: FiltrosInventario = {}): Promise<Desarrollo[]> {
  const params = new URLSearchParams();
  if (filtros.q) params.set("q", filtros.q);
  if (filtros.ciudad) params.set("ciudad", filtros.ciudad);
  if (filtros.recamaras) params.set("recamaras", String(filtros.recamaras));
  if (filtros.precioMin !== undefined) params.set("precioMin", String(filtros.precioMin));
  if (filtros.precioMax !== undefined) params.set("precioMax", String(filtros.precioMax));
  if (filtros.soloPublicados) params.set("soloPublicados", "1");
  const query = params.toString();

  const remoto = await pedir<Desarrollo[]>(`/desarrollos${query ? `?${query}` : ""}`);
  return remoto ?? filtrarDesarrollos(mock.desarrollos, filtros);
}

export async function obtenerDesarrollo(id: string): Promise<Desarrollo | undefined> {
  const remoto = await pedir<Desarrollo>(`/desarrollos/${id}`);
  return remoto ?? mock.desarrollos.find((d) => d.id === id);
}

export async function obtenerDesarrollos(ids: string[]): Promise<Desarrollo[]> {
  const todos = await listarDesarrollos();
  return ids.map((id) => todos.find((d) => d.id === id)).filter((d): d is Desarrollo => Boolean(d));
}

export async function obtenerUsuarioActual(): Promise<Usuario> {
  return (await pedir<Usuario>("/usuarios/actual")) ?? mock.usuarios[0];
}

export async function listarUsuarios(): Promise<Usuario[]> {
  return (await pedir<Usuario[]>("/usuarios")) ?? mock.usuarios;
}

export async function obtenerCliente(id: string): Promise<Cliente | undefined> {
  const remoto = await pedir<Cliente>(`/clientes/${id}`);
  return remoto ?? mock.clientes.find((c) => c.id === id);
}

export async function listarClientes(): Promise<Cliente[]> {
  return (await pedir<Cliente[]>("/clientes")) ?? mock.clientes;
}

export async function obtenerPropuesta(slug: string): Promise<Propuesta | undefined> {
  const remoto = await pedir<Propuesta>(`/propuestas/${slug}`);
  return remoto ?? mock.propuestas.find((p) => p.slug === slug);
}

export async function listarPropuestas(): Promise<Propuesta[]> {
  return (await pedir<Propuesta[]>("/propuestas")) ?? mock.propuestas;
}

export async function listarCambios(estado?: Cambio["estado"]): Promise<Cambio[]> {
  const remoto = await pedir<Cambio[]>(`/cambios${estado ? `?estado=${estado}` : ""}`);
  if (remoto) return remoto;
  return estado ? mock.cambios.filter((c) => c.estado === estado) : mock.cambios;
}

export async function cambiosDe(desarrolloId: string): Promise<Cambio[]> {
  const remoto = await pedir<Cambio[]>(`/desarrollos/${desarrolloId}/cambios`);
  return remoto ?? mock.cambios.filter((c) => c.desarrolloId === desarrolloId);
}

export async function listarNovedades() {
  return (await pedir<typeof mock.novedades>("/novedades")) ?? mock.novedades;
}

export async function conteoPipeline(): Promise<Record<EstatusListing, number>> {
  const remoto = await pedir<Record<EstatusListing, number>>("/pipeline");
  if (remoto) return remoto;

  const base: Record<EstatusListing, number> = {
    borrador: 4,
    revision: 0,
    due_diligence: 1,
    aprobado: 0,
    publicado: 0,
  };
  for (const d of mock.desarrollos) base[d.estatus] += 1;
  return base;
}

/** Desarrollos a cargo del usuario que necesitan validación. */
export async function pendientesDeValidar(usuarioId: string) {
  const desarrollos = await listarDesarrollos();
  return desarrollos
    .filter((d) => d.responsableId === usuarioId)
    .map((d) => ({ desarrollo: d, confiabilidad: confiabilidad(d) }))
    .filter((x) => x.confiabilidad < 85)
    .sort((a, b) => a.confiabilidad - b.confiabilidad);
}
