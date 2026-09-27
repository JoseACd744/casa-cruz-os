import type {
  AvanceCapacitacion,
  IntentoEvaluacion,
  ModuloCapacitacion,
  Pregunta,
  Cambio,
  Cliente,
  Desarrollo,
  DestinoCambio,
  EstatusListing,
  FiltrosInventario,
  FuenteTipo,
  Multimedia,
  Plaza,
  Propuesta,
  Rol,
  Tipologia,
  Usuario,
} from "@casacruz/core";

/**
 * Un cambio ya revisado por el servicio de gobierno (gobierno.ts): con su
 * etiqueta, el valor anterior que calculó el servidor y el estado que le toca.
 */
export interface NuevoCambio {
  desarrolloId: string;
  destino: DestinoCambio | null;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  usuarioId: string;
  fuente: FuenteTipo;
  evidenciaUrl?: string | null;
  nota?: string | null;
  estado: Cambio["estado"];
}

export interface NuevoDesarrollo {
  nombre: string;
  plazaId: string;
  ciudad: string;
  tipo: Desarrollo["tipo"];
  responsableId: string;
  zona?: string | null;
  entrega?: string | null;
  entregaIso?: string | null;
}

/** Campos que se pueden editar de un desarrollo ya creado. */
export interface ParcheDesarrollo {
  nombre?: string;
  ciudad?: string;
  zona?: string | null;
  direccion?: string | null;
  lat?: number | null;
  lng?: number | null;
  desarrollador?: string | null;
  entrega?: string | null;
  entregaIso?: string | null;
  amenidades?: string[];
  aConsiderar?: string[];
  responsableId?: string;
  condiciones?: Partial<Desarrollo["condiciones"]>;
  comercial?: Partial<Desarrollo["comercial"]>;
  interna?: Partial<Omit<Desarrollo["interna"], "documentos">>;
}

export interface EntradaTipologia {
  id?: string;
  nombre: string;
  recamaras?: number | null;
  banos?: number | null;
  m2Construccion?: number | null;
  m2Terreno?: number | null;
  estacionamientos?: number | null;
  planoUrl?: string | null;
  niveles: { nombre: string; precioVenta: number | null; precioLista?: number | null; disponibles?: number | null }[];
}

export interface EntradaUsuario {
  nombre: string;
  correo: string;
  rol: Rol;
  telefono?: string | null;
  plazasCertificadas?: string[];
  plazasEnProgreso?: string[];
}

export interface ParcheUsuario {
  nombre?: string;
  rol?: Rol;
  activo?: boolean;
  telefono?: string | null;
  plazasCertificadas?: string[];
  plazasEnProgreso?: string[];
}

/** Una línea de la bitácora de la integración con Kommo. */
export interface EventoKommo {
  recibidoIso: string;
  tipo: string;
  leadId: string;
  resultado: string;
}

export interface EntradaCliente {
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  ciudadResidencia?: string | null;
  presupuestoMin?: number | null;
  presupuestoMax?: number | null;
  recamaras?: string | null;
  objetivo?: Cliente["objetivo"];
  plazasInteres?: string[];
  kommoLeadId?: string | null;
  kommoEtapa?: string | null;
  notas?: string | null;
  responsableId?: string | null;
}

export interface EntradaPropuesta {
  clienteId: string;
  usuarioId: string;
  formato: Propuesta["formato"];
  opciones?: Partial<Propuesta["opciones"]>;
  items: { desarrolloId: string; tipologiaId?: string | null; nivel?: string | null; razon?: string | null }[];
  enviar?: boolean;
}

/**
 * Lo que la API sabe hacer con los datos.
 *
 * Hay dos implementaciones: una contra Postgres (Prisma) y otra contra los
 * datos de demostración del núcleo, para poder trabajar sin base todavía.
 */
export interface FuenteDeDatos {
  readonly nombre: "postgres" | "mock";

  // ── Lectura ──────────────────────────────────────────────────────────
  listarPlazas(): Promise<Plaza[]>;
  listarDesarrollos(filtros: FiltrosInventario): Promise<Desarrollo[]>;
  obtenerDesarrollo(id: string): Promise<Desarrollo | null>;
  listarUsuarios(): Promise<Usuario[]>;
  obtenerUsuario(id: string): Promise<Usuario | null>;
  /** Hash guardado del usuario, o null si todavía no tiene (modo demostración). */
  hashDeContrasena(usuarioId: string): Promise<string | null>;
  obtenerUsuarioActual(): Promise<Usuario>;
  listarClientes(): Promise<Cliente[]>;
  obtenerCliente(id: string): Promise<Cliente | null>;
  listarPropuestas(): Promise<Propuesta[]>;
  obtenerPropuesta(slug: string): Promise<Propuesta | null>;
  listarCambios(estado?: Cambio["estado"]): Promise<Cambio[]>;
  cambiosDe(desarrolloId: string): Promise<Cambio[]>;
  conteoPipeline(): Promise<Record<EstatusListing, number>>;
  novedades(): Promise<{ fecha: string; titulo: string; detalle: string }[]>;

  // ── Gobierno del dato ────────────────────────────────────────────────
  /** Guarda el cambio tal cual; las reglas ya se aplicaron en gobierno.ts. */
  guardarCambio(entrada: NuevoCambio): Promise<Cambio>;
  obtenerCambio(id: string): Promise<Cambio | null>;
  resolverCambio(
    id: string,
    estado: "publicado" | "rechazado",
    aprobadorId: string,
  ): Promise<Cambio | null>;
  registrarValidacion(desarrolloId: string, campo: string, usuarioId: string): Promise<void>;

  /**
   * Ejecuta varias escrituras como una sola: en Postgres, todo o nada. El
   * cambio, su efecto en el dato y la validación no pueden quedar a medias.
   */
  enTransaccion<T>(fn: (datos: FuenteDeDatos) => Promise<T>): Promise<T>;

  // ── Escritura de producto ────────────────────────────────────────────
  crearDesarrollo(entrada: NuevoDesarrollo): Promise<Desarrollo>;
  actualizarDesarrollo(id: string, parche: ParcheDesarrollo): Promise<Desarrollo | null>;
  cambiarEstatus(id: string, estatus: EstatusListing): Promise<Desarrollo | null>;
  guardarTipologia(desarrolloId: string, entrada: EntradaTipologia): Promise<Tipologia | null>;
  eliminarTipologia(desarrolloId: string, tipologiaId: string): Promise<boolean>;
  agregarMultimedia(desarrolloId: string, item: Multimedia): Promise<Multimedia[] | null>;
  eliminarMultimedia(desarrolloId: string, url: string): Promise<Multimedia[] | null>;
  /** Reordena la multimedia: la primera URL queda como fachada. */
  ordenarMultimedia(desarrolloId: string, urls: string[]): Promise<Multimedia[] | null>;
  agregarDocumento(
    desarrolloId: string,
    documento: { nombre: string; tipo: FuenteTipo; url: string },
  ): Promise<Desarrollo["interna"]["documentos"] | null>;

  // ── Equipo ───────────────────────────────────────────────────────────
  /** Nace con la clave temporal ya cifrada y la obligación de cambiarla. */
  crearUsuario(entrada: EntradaUsuario, hashTemporal: string): Promise<Usuario>;
  actualizarUsuario(id: string, parche: ParcheUsuario): Promise<Usuario | null>;
  guardarContrasena(id: string, hash: string, debeCambiar: boolean): Promise<void>;
  registrarAcceso(id: string): Promise<void>;

  // ── Capacitación ─────────────────────────────────────────────────────
  modulosCapacitacion(): Promise<ModuloCapacitacion[]>;
  /** Con la respuesta correcta: sólo para calificar en el servidor. */
  preguntasDe(plazaId: string): Promise<Pregunta[]>;
  avanceDe(usuarioId: string): Promise<AvanceCapacitacion>;
  completarModulo(usuarioId: string, moduloId: string): Promise<void>;
  registrarIntento(usuarioId: string, intento: IntentoEvaluacion): Promise<void>;
  /** Certifica al usuario en la plaza hasta la fecha dada: desde ya puede venderla. */
  certificar(usuarioId: string, plazaId: string, venceIso: string | null): Promise<void>;
  guardarPreparacion(usuarioId: string, desarrolloId: string, items: string[]): Promise<void>;

  // ── Comercial ────────────────────────────────────────────────────────
  crearCliente(entrada: EntradaCliente): Promise<Cliente>;
  actualizarCliente(id: string, parche: Partial<EntradaCliente>): Promise<Cliente | null>;
  /** Una línea en la actividad del cliente (lo que hizo él o su asesor). */
  registrarActividad(clienteId: string, texto: string): Promise<void>;
  obtenerClientePorLead(kommoLeadId: string): Promise<Cliente | null>;

  // ── Integración con Kommo ────────────────────────────────────────────
  registrarEventoKommo(evento: EventoKommo): Promise<void>;
  /** Los más recientes primero. */
  eventosKommo(limite: number): Promise<EventoKommo[]>;
  crearPropuesta(entrada: EntradaPropuesta): Promise<Propuesta>;
  marcarPropuestaEnviada(slug: string): Promise<Propuesta | null>;
  sumarVistaPropuesta(slug: string): Promise<number>;
}
