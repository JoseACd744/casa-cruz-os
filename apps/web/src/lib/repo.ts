import { cache } from "react";
import {
  confiabilidad,
  filtrarDesarrollos,
  mock,
  type Cambio,
  type Cliente,
  type Desarrollo,
  type EstatusListing,
  type FiltrosInventario,
  type Plaza,
  type Propuesta,
  type PropuestaPublica,
  type Usuario,
} from "@casacruz/core";
import { pedir, usandoApi } from "@/lib/api";

/**
 * Acceso a datos de la web.
 *
 * Con `API_URL` todo viene de la API (ver lib/api.ts); sin ella, de los datos de
 * demostración del núcleo, para que el portal se pueda recorrer sin backend.
 * Las pantallas sólo llaman a estas funciones: cambiar de origen de datos no
 * toca ni una vista.
 *
 * `cache` evita pedir lo mismo dos veces en un mismo render (el layout y la
 * página suelen necesitar al usuario y las plazas).
 */

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

export interface Integraciones {
  archivos: "bucket" | "local" | "sin_configurar";
  kommo: boolean;
  mapas: "google" | "openstreetmap";
}

// ── Consultas ────────────────────────────────────────────────────────────

export const obtenerIntegraciones = cache(async (): Promise<Integraciones> => {
  if (!usandoApi) return { archivos: "sin_configurar", kommo: false, mapas: "openstreetmap" };
  const salud = await pedir<{ integraciones: Integraciones }>("/salud");
  return salud!.integraciones;
});

export const listarPlazas = cache(async (): Promise<Plaza[]> => {
  if (!usandoApi) return mock.plazas;
  return (await pedir<Plaza[]>("/plazas")) ?? [];
});

const desarrollosPorQuery = cache(async (query: string): Promise<Desarrollo[]> => {
  return (await pedir<Desarrollo[]>(`/desarrollos${query ? `?${query}` : ""}`)) ?? [];
});

export async function listarDesarrollos(filtros: FiltrosInventario = {}): Promise<Desarrollo[]> {
  if (!usandoApi) return filtrarDesarrollos(mock.desarrollos, filtros);

  const params = new URLSearchParams();
  if (filtros.q) params.set("q", filtros.q);
  if (filtros.ciudad) params.set("ciudad", filtros.ciudad);
  if (filtros.recamaras) params.set("recamaras", String(filtros.recamaras));
  if (filtros.precioMin !== undefined) params.set("precioMin", String(filtros.precioMin));
  if (filtros.precioMax !== undefined) params.set("precioMax", String(filtros.precioMax));
  if (filtros.soloPublicados) params.set("soloPublicados", "1");
  return desarrollosPorQuery(params.toString());
}

export const obtenerDesarrollo = cache(async (id: string): Promise<Desarrollo | undefined> => {
  if (!usandoApi) return mock.desarrollos.find((d) => d.id === id);
  return (await pedir<Desarrollo>(`/desarrollos/${encodeURIComponent(id)}`)) ?? undefined;
});

export async function obtenerDesarrollos(ids: string[]): Promise<Desarrollo[]> {
  const todos = await listarDesarrollos();
  return ids.map((id) => todos.find((d) => d.id === id)).filter((d): d is Desarrollo => Boolean(d));
}

/** Quien tiene la sesión. Sin API, el primer cerrador de la demostración. */
export const obtenerUsuarioActual = cache(async (): Promise<Usuario> => {
  if (!usandoApi) return mock.usuarios[0];
  const usuario = await pedir<Usuario>("/usuarios/actual");
  if (!usuario) throw new Error("La sesión no corresponde a ningún usuario");
  return usuario;
});

/** El equipo completo es de gerente para arriba: a un cerrador se le devuelve vacío. */
export const listarUsuarios = cache(async (): Promise<Usuario[]> => {
  if (!usandoApi) return mock.usuarios;
  return (await pedir<Usuario[]>("/usuarios", { siProhibido: [] })) ?? [];
});

export const obtenerCliente = cache(async (id: string): Promise<Cliente | undefined> => {
  if (!usandoApi) return mock.clientes.find((c) => c.id === id);
  return (await pedir<Cliente>(`/clientes/${encodeURIComponent(id)}`)) ?? undefined;
});

export const listarClientes = cache(async (): Promise<Cliente[]> => {
  if (!usandoApi) return mock.clientes;
  return (await pedir<Cliente[]>("/clientes")) ?? [];
});

export const obtenerPropuesta = cache(async (slug: string): Promise<Propuesta | undefined> => {
  if (!usandoApi) return mock.propuestas.find((p) => p.slug === slug);
  return (await pedir<Propuesta>(`/propuestas/${encodeURIComponent(slug)}`)) ?? undefined;
});

/** Lo que ve el cliente en su enlace, en una sola llamada y sin nada interno. */
export const obtenerPropuestaPublica = cache(
  async (slug: string): Promise<PropuestaPublica | undefined> => {
    if (usandoApi) {
      return (
        (await pedir<PropuestaPublica>(`/propuestas/${encodeURIComponent(slug)}/publica`)) ?? undefined
      );
    }

    const propuesta = mock.propuestas.find((p) => p.slug === slug);
    if (!propuesta) return undefined;
    const cliente = mock.clientes.find((c) => c.id === propuesta.clienteId);
    const asesor = mock.usuarios.find((u) => u.id === propuesta.usuarioId);
    return {
      propuesta,
      cliente: cliente ? { nombre: cliente.nombre, recamaras: cliente.recamaras } : null,
      asesor: asesor
        ? {
            nombre: asesor.nombre,
            correo: asesor.correo,
            telefono: asesor.telefono,
            plazas: asesor.plazasCertificadas.map(
              (id) => mock.plazas.find((p) => p.id === id)?.nombre ?? id,
            ),
          }
        : null,
      desarrollos: propuesta.items
        .map((i) => mock.desarrollos.find((d) => d.id === i.desarrolloId))
        .filter((d): d is Desarrollo => Boolean(d)),
    };
  },
);

export const listarPropuestas = cache(async (): Promise<Propuesta[]> => {
  if (!usandoApi) return mock.propuestas;
  return (await pedir<Propuesta[]>("/propuestas")) ?? [];
});

export async function listarCambios(estado?: Cambio["estado"]): Promise<Cambio[]> {
  if (!usandoApi) return estado ? mock.cambios.filter((c) => c.estado === estado) : mock.cambios;
  return (await pedir<Cambio[]>(`/cambios${estado ? `?estado=${estado}` : ""}`)) ?? [];
}

export async function cambiosDe(desarrolloId: string): Promise<Cambio[]> {
  if (!usandoApi) return mock.cambios.filter((c) => c.desarrolloId === desarrolloId);
  return (await pedir<Cambio[]>(`/desarrollos/${encodeURIComponent(desarrolloId)}/cambios`)) ?? [];
}

export async function listarNovedades(): Promise<{ fecha: string; titulo: string; detalle: string }[]> {
  if (!usandoApi) return mock.novedades;
  return (await pedir<{ fecha: string; titulo: string; detalle: string }[]>("/novedades")) ?? [];
}

export async function conteoPipeline(): Promise<Record<EstatusListing, number>> {
  const base: Record<EstatusListing, number> = {
    borrador: 0,
    revision: 0,
    due_diligence: 0,
    aprobado: 0,
    publicado: 0,
  };
  if (usandoApi) return (await pedir<Record<EstatusListing, number>>("/pipeline")) ?? base;
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
