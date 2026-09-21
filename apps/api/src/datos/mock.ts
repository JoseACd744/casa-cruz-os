import {
  confiabilidad,
  filtrarDesarrollos,
  mock,
  requiereAprobacion,
  type Cambio,
  type EstatusListing,
} from "@casacruz/core";
import type { FuenteDeDatos, NuevoCambio } from "./tipos";

/**
 * Fuente de demostración: sirve los datos del núcleo en memoria.
 *
 * Las escrituras no se persisten (se pierden al reiniciar), pero sí aplican las
 * mismas reglas que aplicará Postgres, para que la web se comporte igual.
 */
export function fuenteMock(): FuenteDeDatos {
  const cambios: Cambio[] = [...mock.cambios];
  const vistas = new Map<string, number>();

  return {
    nombre: "mock",

    async listarPlazas() {
      return mock.plazas;
    },
    async listarDesarrollos(filtros) {
      return filtrarDesarrollos(mock.desarrollos, filtros);
    },
    async obtenerDesarrollo(id) {
      return mock.desarrollos.find((d) => d.id === id) ?? null;
    },
    async listarUsuarios() {
      return mock.usuarios;
    },
    async obtenerUsuarioActual() {
      return mock.usuarios[0];
    },
    async listarClientes() {
      return mock.clientes;
    },
    async obtenerCliente(id) {
      return mock.clientes.find((c) => c.id === id) ?? null;
    },
    async listarPropuestas() {
      return mock.propuestas;
    },
    async obtenerPropuesta(slug) {
      return mock.propuestas.find((p) => p.slug === slug) ?? null;
    },
    async listarCambios(estado) {
      return estado ? cambios.filter((c) => c.estado === estado) : cambios;
    },
    async cambiosDe(desarrolloId) {
      return cambios.filter((c) => c.desarrolloId === desarrolloId);
    },
    async conteoPipeline() {
      const base: Record<EstatusListing, number> = {
        borrador: 0,
        revision: 0,
        due_diligence: 0,
        aprobado: 0,
        publicado: 0,
      };
      for (const d of mock.desarrollos) base[d.estatus] += 1;
      return base;
    },
    async novedades() {
      return mock.novedades;
    },

    async registrarCambio(entrada: NuevoCambio) {
      const desarrollo = mock.desarrollos.find((d) => d.id === entrada.desarrolloId);
      const usuario = mock.usuarios.find((u) => u.id === entrada.usuarioId);
      const pendiente = requiereAprobacion(
        entrada.campo,
        entrada.fuente,
        Boolean(entrada.evidenciaUrl),
      );

      const cambio: Cambio = {
        id: `ch-${cambios.length + 1}`,
        desarrolloId: entrada.desarrolloId,
        desarrolloNombre: desarrollo?.nombre ?? entrada.desarrolloId,
        campo: entrada.campo,
        valorAnterior: entrada.valorAnterior,
        valorNuevo: entrada.valorNuevo,
        usuario: usuario?.nombre ?? entrada.usuarioId,
        fecha: new Date().toLocaleString("es-MX"),
        fuente: entrada.fuente,
        evidencia: entrada.evidenciaUrl ?? null,
        estado: pendiente ? "pendiente" : "publicado",
      };
      cambios.unshift(cambio);
      return cambio;
    },

    async aprobarCambio(id) {
      const cambio = cambios.find((c) => c.id === id);
      if (!cambio) return null;
      cambio.estado = "publicado";
      return cambio;
    },

    async registrarValidacion(desarrolloId, campo) {
      const desarrollo = mock.desarrollos.find((d) => d.id === desarrolloId);
      if (!desarrollo) return;
      const validacion = desarrollo.validaciones.find((v) => v.campo === campo);
      if (validacion) validacion.haceDias = 0;
      // La confiabilidad se recalcula sola: nunca se guarda.
      void confiabilidad(desarrollo);
    },

    async sumarVistaPropuesta(slug) {
      const total = (vistas.get(slug) ?? 0) + 1;
      vistas.set(slug, total);
      return total;
    },
  };
}
