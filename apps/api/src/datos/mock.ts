import {
  confiabilidad,
  fechaCorta,
  fechaDocumento,
  fechaHora,
  filtrarDesarrollos,
  mock,
  novedadesDe,
  type Cambio,
  type Cliente,
  type Desarrollo,
  type EstatusListing,
  type Multimedia,
  type Propuesta,
  type Tipologia,
  type Usuario,
  type AvanceCapacitacion,
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
  const usuarios: Usuario[] = structuredClone(mock.usuarios);
  const hashes = new Map<string, string>();
  const avances: Record<string, AvanceCapacitacion> = structuredClone(mock.avanceCapacitacion);

  const avanceDe = (usuarioId: string): AvanceCapacitacion =>
    (avances[usuarioId] ??= { completados: [], intentos: [], certificaciones: [], preparacion: [] });
  const venceDe = (usuarioId: string, plazaId: string) =>
    avanceDe(usuarioId).certificaciones.find((c) => c.plazaId === plazaId)?.venceIso ?? null;

  /**
   * A cargo se cuenta, no se captura; y una certificación vencida ya no deja
   * vender la plaza.
   */
  const conCarga = (u: Usuario): Usuario => ({
    ...u,
    plazasCertificadas: u.plazasCertificadas.filter((p) => {
      const vence = venceDe(u.id, p);
      return !vence || new Date(vence) > new Date();
    }),
    desarrollosACargo: desarrollos.filter((d) => d.responsableId === u.id).length,
  });

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
      return usuarios.map(conCarga);
    },
    async obtenerUsuario(id) {
      const u = usuarios.find((x) => x.id === id);
      return u ? conCarga(u) : null;
    },
    async hashDeContrasena(usuarioId) {
      // Los usuarios de demostración no traen contraseña: entran con CLAVE_DEMO
      // hasta que alguien les asigna una.
      return hashes.get(usuarioId) ?? null;
    },
    async obtenerUsuarioActual() {
      return conCarga(usuarios[0]);
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
      return novedadesDe(cambios);
    },

    // ── Gobierno del dato ──────────────────────────────────────────────
    async guardarCambio(entrada: NuevoCambio) {
      const desarrollo = buscar(entrada.desarrolloId);
      const usuario = usuarios.find((u) => u.id === entrada.usuarioId);
      const ahora = new Date();

      const cambio: Cambio = {
        id: `ch-${cambios.length + 1}`,
        desarrolloId: entrada.desarrolloId,
        desarrolloNombre: desarrollo?.nombre ?? entrada.desarrolloId,
        destino: entrada.destino,
        campo: entrada.campo,
        valorAnterior: entrada.valorAnterior,
        valorNuevo: entrada.valorNuevo,
        usuarioId: entrada.usuarioId,
        usuario: usuario?.nombre ?? entrada.usuarioId,
        fecha: fechaHora(ahora),
        fechaIso: ahora.toISOString(),
        fuente: entrada.fuente,
        evidencia: entrada.evidenciaUrl ?? null,
        nota: entrada.nota ?? null,
        estado: entrada.estado,
        aprobadoPor: null,
        resueltoIso: null,
      };
      cambios.unshift(cambio);
      return cambio;
    },

    async obtenerCambio(id) {
      return cambios.find((c) => c.id === id) ?? null;
    },

    async resolverCambio(id, estado, aprobadorId) {
      const cambio = cambios.find((c) => c.id === id);
      if (!cambio) return null;
      cambio.estado = estado;
      cambio.aprobadoPor = usuarios.find((u) => u.id === aprobadorId)?.nombre ?? aprobadorId;
      cambio.resueltoIso = new Date().toISOString();
      return cambio;
    },

    async enTransaccion(fn) {
      // En memoria no hay a medias: cada escritura es inmediata.
      return fn(this);
    },

    async registrarValidacion(desarrolloId, campo, usuarioId) {
      const desarrollo = buscar(desarrolloId);
      if (!desarrollo) return;
      const usuario = usuarios.find((u) => u.id === usuarioId);
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
        entregaIso: entrada.entregaIso ?? null,
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

    async ordenarMultimedia(desarrolloId, urls) {
      const d = buscar(desarrolloId);
      if (!d) return null;
      const lista = d.multimedia ?? [];
      // Lo que no venga en la lista conserva su lugar relativo, al final.
      const posicion = (url: string) => {
        const i = urls.indexOf(url);
        return i >= 0 ? i : urls.length + lista.findIndex((m) => m.url === url);
      };
      d.multimedia = [...lista]
        .sort((x, y) => posicion(x.url) - posicion(y.url))
        .map((m, orden) => ({ ...m, orden }));
      return d.multimedia;
    },

    async agregarDocumento(desarrolloId, documento) {
      const d = buscar(desarrolloId);
      if (!d) return null;
      d.interna.documentos = [{ ...documento, cargadoHaceDias: 0 }, ...d.interna.documentos];
      return d.interna.documentos;
    },

    // ── Equipo ─────────────────────────────────────────────────────────
    async crearUsuario(entrada, hashTemporal) {
      const usuario: Usuario = {
        id: idUnico(`u-${entrada.nombre}`, usuarios.map((u) => u.id)),
        nombre: entrada.nombre,
        correo: entrada.correo.toLowerCase(),
        telefono: entrada.telefono ?? null,
        rol: entrada.rol,
        plazasCertificadas: entrada.plazasCertificadas ?? [],
        plazasEnProgreso: entrada.plazasEnProgreso ?? [],
        activo: true,
        debeCambiarContrasena: true,
        ultimoAcceso: "nunca",
        desarrollosACargo: 0,
      };
      usuarios.push(usuario);
      hashes.set(usuario.id, hashTemporal);
      return usuario;
    },

    async actualizarUsuario(id, parche) {
      const u = usuarios.find((x) => x.id === id);
      if (!u) return null;
      Object.assign(u, parche);
      // Una plaza certificada ya no está "en progreso".
      u.plazasEnProgreso = u.plazasEnProgreso.filter((p) => !u.plazasCertificadas.includes(p));
      return conCarga(u);
    },

    async guardarContrasena(id, hash, debeCambiar) {
      const u = usuarios.find((x) => x.id === id);
      if (!u) return;
      hashes.set(id, hash);
      u.debeCambiarContrasena = debeCambiar;
    },

    async registrarAcceso(id) {
      const u = usuarios.find((x) => x.id === id);
      if (u) u.ultimoAcceso = fechaHora(new Date());
    },

    // ── Capacitación ───────────────────────────────────────────────────
    async modulosCapacitacion() {
      return mock.modulosCapacitacion;
    },

    async preguntasDe(plazaId) {
      return mock.preguntasEvaluacion.filter((p) => p.plazaId === plazaId);
    },

    async avanceDe(usuarioId) {
      const u = usuarios.find((x) => x.id === usuarioId);
      const avance = avanceDe(usuarioId);
      // Las certificaciones son las del usuario, con su vigencia si la tiene.
      return {
        ...avance,
        certificaciones: (u?.plazasCertificadas ?? []).map((plazaId) => ({
          plazaId,
          venceIso: venceDe(usuarioId, plazaId),
        })),
      };
    },

    async completarModulo(usuarioId, moduloId) {
      const avance = avanceDe(usuarioId);
      if (!avance.completados.some((c) => c.moduloId === moduloId)) {
        avance.completados.push({ moduloId, fechaIso: new Date().toISOString() });
      }
      const modulo = mock.modulosCapacitacion.find((m) => m.id === moduloId);
      const u = usuarios.find((x) => x.id === usuarioId);
      if (modulo && u && !u.plazasCertificadas.includes(modulo.plazaId) && !u.plazasEnProgreso.includes(modulo.plazaId)) {
        u.plazasEnProgreso.push(modulo.plazaId);
      }
    },

    async registrarIntento(usuarioId, intento) {
      avanceDe(usuarioId).intentos.push(intento);
    },

    async certificar(usuarioId, plazaId, venceIso) {
      const avance = avanceDe(usuarioId);
      avance.certificaciones = [
        ...avance.certificaciones.filter((c) => c.plazaId !== plazaId),
        { plazaId, venceIso },
      ];
      const u = usuarios.find((x) => x.id === usuarioId);
      if (!u) return;
      if (!u.plazasCertificadas.includes(plazaId)) u.plazasCertificadas.push(plazaId);
      u.plazasEnProgreso = u.plazasEnProgreso.filter((p) => p !== plazaId);
    },

    async guardarPreparacion(usuarioId, desarrolloId, items) {
      const avance = avanceDe(usuarioId);
      avance.preparacion = [
        ...avance.preparacion.filter((p) => p.desarrolloId !== desarrolloId),
        { desarrolloId, items },
      ];
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
        responsableId: entrada.responsableId ?? null,
        notas: entrada.notas ?? null,
        actividad: [{ fecha: fechaCorta(new Date()).slice(0, 6), texto: "Alta en Casa Cruz OS." }],
      };
      clientes.unshift(cliente);
      return cliente;
    },

    async registrarActividad(clienteId, texto) {
      const cliente = clientes.find((c) => c.id === clienteId);
      cliente?.actividad.unshift({ fecha: fechaCorta(new Date()).slice(0, 6), texto });
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
