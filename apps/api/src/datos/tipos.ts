import type {
  Cambio,
  Cliente,
  Desarrollo,
  EstatusListing,
  FiltrosInventario,
  FuenteTipo,
  Multimedia,
  Plaza,
  Propuesta,
  Tipologia,
  Usuario,
} from "@casacruz/core";

export interface NuevoCambio {
  desarrolloId: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  usuarioId: string;
  fuente: FuenteTipo;
  evidenciaUrl?: string | null;
  nota?: string | null;
}

export interface NuevoDesarrollo {
  nombre: string;
  plazaId: string;
  ciudad: string;
  tipo: Desarrollo["tipo"];
  responsableId: string;
  zona?: string | null;
  entrega?: string | null;
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
  registrarCambio(entrada: NuevoCambio): Promise<Cambio>;
  aprobarCambio(id: string, aprobadorId: string): Promise<Cambio | null>;
  rechazarCambio(id: string, aprobadorId: string): Promise<Cambio | null>;
  registrarValidacion(desarrolloId: string, campo: string, usuarioId: string): Promise<void>;

  // ── Escritura de producto ────────────────────────────────────────────
  crearDesarrollo(entrada: NuevoDesarrollo): Promise<Desarrollo>;
  actualizarDesarrollo(id: string, parche: ParcheDesarrollo): Promise<Desarrollo | null>;
  cambiarEstatus(id: string, estatus: EstatusListing): Promise<Desarrollo | null>;
  guardarTipologia(desarrolloId: string, entrada: EntradaTipologia): Promise<Tipologia | null>;
  eliminarTipologia(desarrolloId: string, tipologiaId: string): Promise<boolean>;
  agregarMultimedia(desarrolloId: string, item: Multimedia): Promise<Multimedia[] | null>;
  eliminarMultimedia(desarrolloId: string, url: string): Promise<Multimedia[] | null>;

  // ── Comercial ────────────────────────────────────────────────────────
  crearCliente(entrada: EntradaCliente): Promise<Cliente>;
  actualizarCliente(id: string, parche: Partial<EntradaCliente>): Promise<Cliente | null>;
  crearPropuesta(entrada: EntradaPropuesta): Promise<Propuesta>;
  marcarPropuestaEnviada(slug: string): Promise<Propuesta | null>;
  sumarVistaPropuesta(slug: string): Promise<number>;
}
