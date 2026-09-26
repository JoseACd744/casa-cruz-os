import {
  confiabilidad,
  fechaDocumento,
  fechaHora,
  filtrarDesarrollos,
  mock,
  requiereAprobacion,
  type Cambio,
  type Cliente,
  type Desarrollo,
  type EstatusListing,
  type Multimedia,
  type Propuesta,
  type Tipologia,
} from "@casacruz/core";
import type {
  EntradaCliente,
  EntradaPropuesta,
  EntradaTipologia,
  FuenteDeDatos,
  NuevoCambio,
  NuevoDesarrollo,
  ParcheDesarrollo,
} from "./tipos";

/**
 * Fuente de demostración: sirve los datos del núcleo en memoria.
 *
 * Las escrituras funcionan de verdad —crean, editan y borran— pero viven sólo
 * mientras el proceso esté arriba. Aplican las mismas reglas que aplicará
 * Postgres, así que la web se comporta igual con una fuente o con la otra.
 */

function idDesde(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function fuenteMock(): FuenteDeDatos {
  // Copias: los datos del núcleo quedan intactos.
  const desarrollos: Desarrollo[] = structuredClone(mock.desarrollos);
  const clientes: Cliente[] = structuredClone(mock.clientes);
  const propuestas: Propuesta[] = structuredClone(mock.propuestas);
  const cambios: Cambio[] = structuredClone(mock.cambios);

  const buscar = (id: string) => desarrollos.find((d) => d.id === id) ?? null;

  function idUnico(base: string, existentes: string[]): string {
    let id = idDesde(base);
    let n = 2;
    while (existentes.includes(id)) {
      id = `${idDesde(base)}-${n}`;
      n += 1;
    }
    return id;
  }

  return {
    nombre: "mock",

    // ── Lectura ────────────────────────────────────────────────────────
    async listarPlazas() {
      return mock.plazas;
    },
    async listarDesarrollos(filtros) {
      return filtrarDesarrollos(desarrollos, filtros);
    },
    async obtenerDesarrollo(id) {
      return buscar(id);
    },
    async listarUsuarios() {
      return mock.usuarios;
    },
    async hashDeContrasena() {
      // Los datos de demostración no traen contraseñas: se usa CLAVE_DEMO.
      return null;
    },
    async obtenerUsuarioActual() {
      return mock.usuarios[0];
    },
    async listarClientes() {
      return clientes;
    },
    async obtenerCliente(id) {
      return clientes.find((c) => c.id === id) ?? null;
    },
    async listarPropuestas() {
      return propuestas;
    },
    async obtenerPropuesta(slug) {
      return propuestas.find((p) => p.slug === slug) ?? null;
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
      for (const d of desarrollos) base[d.estatus] += 1;
      return base;
    },
    async novedades() {
      return mock.novedades;
    },

    // ── Gobierno del dato ──────────────────────────────────────────────
    async registrarCambio(entrada: NuevoCambio) {
      const desarrollo = buscar(entrada.desarrolloId);
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
        fecha: fechaHora(new Date()),
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

    async rechazarCambio(id) {
      const cambio = cambios.find((c) => c.id === id);
      if (!cambio) return null;
      cambio.estado = "rechazado";
      return cambio;
    },

    async registrarValidacion(desarrolloId, campo, usuarioId) {
      const desarrollo = buscar(desarrolloId);
      if (!desarrollo) return;
      const usuario = mock.usuarios.find((u) => u.id === usuarioId);
      const existente = desarrollo.validaciones.find((v) => v.campo === campo);
      if (existente) {
        existente.haceDias = 0;
        existente.validadoPor = usuario?.nombre ?? usuarioId;
      } else {
        desarrollo.validaciones.push({
          campo: campo as Desarrollo["validaciones"][number]["campo"],
          validadoPor: usuario?.nombre ?? usuarioId,
          haceDias: 0,
        });
      }
      // La confiabilidad se recalcula sola: nunca se guarda.
      void confiabilidad(desarrollo);
    },

    // ── Escritura de producto ──────────────────────────────────────────
    async crearDesarrollo(entrada: NuevoDesarrollo) {
      const desarrollo: Desarrollo = {
        id: idUnico(entrada.nombre, desarrollos.map((d) => d.id)),
        nombre: entrada.nombre,
        plazaId: entrada.plazaId,
        ciudad: entrada.ciudad,
        zona: entrada.zona ?? null,
        direccion: null,
        mapaUrl: null,
        lat: null,
        lng: null,
        tipo: entrada.tipo,
        desarrollador: null,
        estatus: "borrador",
        entrega: entrada.entrega ?? null,
        entregaIso: null,
        responsableId: entrada.responsableId,
        amenidades: [],
        multimedia: [],
        aConsiderar: [],
        tipologias: [],
        condiciones: {
          enganchePct: null,
          engancheNota: null,
          restoPct: null,
          restoNota: null,
          mensualidades: null,
          formasPago: [],
          promocionVigente: null,
          descuentoContado: null,
        },
        comercial: {
          buyerPersona: null,
          clienteIdeal: null,
          argumentos: [],
          diferenciadores: [],
          objeciones: [],
          comparables: [],
          noDeberiaComprarlo: [],
        },
        interna: {
          comisionPct: null,
          contactoComercial: null,
          convenioFirmado: null,
          dueDiligence: "pendiente",
          notasInternas: null,
          documentos: [],
        },
        validaciones: [],
      };
      desarrollos.push(desarrollo);
      return desarrollo;
    },

    async actualizarDesarrollo(id, parche: ParcheDesarrollo) {
      const d = buscar(id);
      if (!d) return null;
      const { condiciones, comercial, interna, ...resto } = parche;
      Object.assign(d, resto);
      if (condiciones) Object.assign(d.condiciones, condiciones);
      if (comercial) Object.assign(d.comercial, comercial);
      if (interna) Object.assign(d.interna, interna);
      return d;
    },

    async cambiarEstatus(id, estatus) {
      const d = buscar(id);
      if (!d) return null;
      d.estatus = estatus;
      return d;
    },

    async guardarTipologia(desarrolloId, entrada: EntradaTipologia) {
      const d = buscar(desarrolloId);
      if (!d) return null;

      const tipologia: Tipologia = {
        id: entrada.id ?? idUnico(`${d.id}-${entrada.nombre}`, d.tipologias.map((t) => t.id)),
        desarrolloId,
        nombre: entrada.nombre,
        recamaras: entrada.recamaras ?? null,
        banos: entrada.banos ?? null,
        m2Construccion: entrada.m2Construccion ?? null,
        m2Terreno: entrada.m2Terreno ?? null,
        estacionamientos: entrada.estacionamientos ?? null,
        planoUrl: entrada.planoUrl ?? null,
        niveles: entrada.niveles.map((n) => ({
          nombre: n.nombre,
          precioLista: n.precioLista ?? n.precioVenta,
          precioVenta: n.precioVenta,
          disponibles: n.disponibles ?? null,
        })),
      };

      const i = d.tipologias.findIndex((t) => t.id === tipologia.id);
      if (i >= 0) d.tipologias[i] = tipologia;
      else d.tipologias.push(tipologia);
      return tipologia;
    },

    async eliminarTipologia(desarrolloId, tipologiaId) {
      const d = buscar(desarrolloId);
      if (!d) return false;
      const antes = d.tipologias.length;
      d.tipologias = d.tipologias.filter((t) => t.id !== tipologiaId);
      return d.tipologias.length < antes;
    },

    async agregarMultimedia(desarrolloId, item: Multimedia) {
      const d = buscar(desarrolloId);
      if (!d) return null;
      d.multimedia = [...(d.multimedia ?? []), item].sort((a, b) => a.orden - b.orden);
      return d.multimedia;
    },

    async eliminarMultimedia(desarrolloId, url) {
      const d = buscar(desarrolloId);
      if (!d) return null;
      d.multimedia = (d.multimedia ?? []).filter((m) => m.url !== url);
      return d.multimedia;
    },

    // ── Comercial ──────────────────────────────────────────────────────
    async crearCliente(entrada: EntradaCliente) {
      const cliente: Cliente = {
        id: idUnico(`c-${entrada.nombre}`, clientes.map((c) => c.id)),
        nombre: entrada.nombre,
        correo: entrada.correo ?? null,
        telefono: entrada.telefono ?? null,
        ciudadResidencia: entrada.ciudadResidencia ?? null,
        presupuestoMin: entrada.presupuestoMin ?? null,
        presupuestoMax: entrada.presupuestoMax ?? null,
        recamaras: entrada.recamaras ?? null,
        objetivo: entrada.objetivo ?? null,
        plazasInteres: entrada.plazasInteres ?? [],
        kommoLeadId: entrada.kommoLeadId ?? null,
        kommoEtapa: entrada.kommoEtapa ?? null,
        notas: entrada.notas ?? null,
        actividad: [],
      };
      clientes.push(cliente);
      return cliente;
    },

    async actualizarCliente(id, parche) {
      const c = clientes.find((x) => x.id === id);
      if (!c) return null;
      Object.assign(c, parche);
      return c;
    },

    async crearPropuesta(entrada: EntradaPropuesta) {
      const cliente = clientes.find((c) => c.id === entrada.clienteId);

      const propuesta: Propuesta = {
        id: `p-${propuestas.length + 1}`.padStart(5, "0"),
        slug: idUnico(cliente?.nombre ?? "propuesta", propuestas.map((p) => p.slug)),
        clienteId: entrada.clienteId,
        usuarioId: entrada.usuarioId,
        formato: entrada.formato,
        opciones: {
          esquemaPagos: true,
          costosCierre: false,
          comparativo: true,
          videoInstitucional: false,
          mapa: true,
          ...entrada.opciones,
        },
        items: entrada.items.map((item) => {
          // El precio se congela aquí: lo que ve el cliente no cambia después.
          const d = buscar(item.desarrolloId);
          const t = d?.tipologias.find((x) => x.id === item.tipologiaId);
          const precios = (t?.niveles ?? [])
            .filter((n) => (item.nivel ? n.nombre === item.nivel : true))
            .map((n) => n.precioVenta)
            .filter((p): p is number => p !== null);
          return {
            desarrolloId: item.desarrolloId,
            tipologiaId: item.tipologiaId ?? "",
            nivel: item.nivel ?? null,
            precioCongelado: precios.length ? Math.min(...precios) : null,
            razon: item.razon ?? null,
          };
        }),
        creadaEl: fechaDocumento(new Date()),
        creadaIso: new Date().toISOString(),
        enviadaEl: entrada.enviar ? fechaHora(new Date()) : null,
        estado: entrada.enviar ? "enviada" : "borrador",
        vistas: 0,
        kommoLeadId: cliente?.kommoLeadId ?? null,
      };

      propuestas.unshift(propuesta);
      return propuesta;
    },

    async marcarPropuestaEnviada(slug) {
      const p = propuestas.find((x) => x.slug === slug);
      if (!p) return null;
      p.enviadaEl = fechaHora(new Date());
      p.estado = "enviada";
      return p;
    },

    async sumarVistaPropuesta(slug) {
      const p = propuestas.find((x) => x.slug === slug);
      if (!p) return 0;
      p.vistas += 1;
      if (p.estado === "enviada") p.estado = "vista";
      return p.vistas;
    },
  };
}
