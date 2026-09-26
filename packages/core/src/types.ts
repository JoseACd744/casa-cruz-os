import type { DestinoCambio } from "./cambios";

/**
 * Modelo de datos de la Base Maestra de Casa Cruz OS.
 *
 * Convención: un campo con valor `null` significa "todavía no capturado".
 * La interfaz lo muestra como [CAMPO] en rojo en lugar de inventarlo.
 */

export type Rol = "cliente" | "cerrador" | "gerente" | "corporativo";

export type EstatusListing =
  | "borrador"
  | "revision"
  | "due_diligence"
  | "aprobado"
  | "publicado";

export type TipoPropiedad = "departamento" | "casa" | "terreno" | "local";

export type Objetivo = "vivienda" | "inversion" | "retiro";

export type CampoValidable =
  | "precio"
  | "disponibilidad"
  | "promocion"
  | "entrega"
  | "comision";

export type FuenteTipo =
  | "lista_precios"
  | "brochure"
  | "correo"
  | "whatsapp"
  | "convenio"
  | "llamada"
  | "contrato"
  | "otro";

export type NivelAcceso = "cliente" | "cerrador" | "corporativo";

export interface Plaza {
  id: string;
  nombre: string;
  gerenteId: string | null;
  activa: boolean;
}

export interface Nivel {
  /** Planta baja, primer nivel, etc. */
  nombre: string;
  precioLista: number | null;
  precioVenta: number | null;
  disponibles: number | null;
}

export interface Tipologia {
  id: string;
  desarrolloId: string;
  nombre: string;
  recamaras: number | null;
  banos: number | null;
  m2Construccion: number | null;
  m2Terreno: number | null;
  estacionamientos: number | null;
  planoUrl: string | null;
  niveles: Nivel[];
}

export interface CondicionComercial {
  enganchePct: number | null;
  engancheNota: string | null;
  restoPct: number | null;
  restoNota: string | null;
  mensualidades: string | null;
  formasPago: string[];
  promocionVigente: string | null;
  descuentoContado: string | null;
}

export interface InfoComercial {
  buyerPersona: string | null;
  clienteIdeal: string | null;
  argumentos: string[];
  diferenciadores: string[];
  objeciones: string[];
  comparables: string[];
  noDeberiaComprarlo: string[];
}

export interface InfoInterna {
  comisionPct: number | null;
  contactoComercial: string | null;
  convenioFirmado: boolean | null;
  dueDiligence: "validado" | "en_proceso" | "pendiente";
  notasInternas: string | null;
  documentos: { nombre: string; tipo: FuenteTipo; cargadoHaceDias: number }[];
}

export interface Multimedia {
  tipo: "foto" | "render" | "plano" | "video" | "brochure" | "mapa";
  url: string;
  orden: number;
}

export interface Validacion {
  campo: CampoValidable;
  validadoPor: string;
  haceDias: number;
}

export interface Desarrollo {
  id: string;
  nombre: string;
  plazaId: string;
  ciudad: string;
  zona: string | null;
  direccion: string | null;
  mapaUrl: string | null;
  /** Coordenadas para el mapa de los documentos. Null mientras no se capturen. */
  lat: number | null;
  lng: number | null;
  tipo: TipoPropiedad;
  desarrollador: string | null;
  estatus: EstatusListing;
  /** Texto de entrega tal como se comunica al cliente. */
  entrega: string | null;
  /** ISO corto para ordenar y filtrar. */
  entregaIso: string | null;
  responsableId: string;
  amenidades: string[];
  /** Fotos, renders y planos, en orden. Vacío mientras nadie los suba. */
  multimedia?: Multimedia[];
  tipologias: Tipologia[];
  condiciones: CondicionComercial;
  comercial: InfoComercial;
  interna: InfoInterna;
  validaciones: Validacion[];
  /** Advertencias que sí deben viajar al cliente. */
  aConsiderar: string[];
}

export interface Cambio {
  id: string;
  desarrolloId: string;
  desarrolloNombre: string;
  /** Cómo se lee en el historial ("Precio de venta · 3 hab · Planta baja"). */
  campo: string;
  /**
   * A dónde va el valor en la Base Maestra. Null en cambios históricos de texto
   * libre, que quedan en la bitácora pero no modifican nada al aprobarse.
   */
  destino: DestinoCambio | null;
  valorAnterior: string;
  valorNuevo: string;
  usuarioId: string;
  usuario: string;
  /** Fecha para leer ("18 sep 2026 · 12:43"). */
  fecha: string;
  fechaIso: string;
  fuente: FuenteTipo;
  evidencia: string | null;
  nota: string | null;
  estado: "publicado" | "pendiente" | "rechazado";
  /** Quién aprobó o rechazó, si ya se resolvió. */
  aprobadoPor: string | null;
  /** Cuándo se aprobó o rechazó. Null si se publicó directo o sigue pendiente. */
  resueltoIso: string | null;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  /** Para que el cliente escriba a su asesor desde la propuesta. */
  telefono: string | null;
  rol: Rol;
  plazasCertificadas: string[];
  plazasEnProgreso: string[];
  activo: boolean;
  ultimoAcceso: string;
  desarrollosACargo: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  ciudadResidencia: string | null;
  presupuestoMin: number | null;
  presupuestoMax: number | null;
  recamaras: string | null;
  objetivo: Objetivo | null;
  plazasInteres: string[];
  kommoLeadId: string | null;
  kommoEtapa: string | null;
  notas: string | null;
  actividad: { fecha: string; texto: string }[];
}

export interface PropuestaItem {
  desarrolloId: string;
  tipologiaId: string;
  nivel: string | null;
  /** Precio congelado al momento de enviar la propuesta. */
  precioCongelado: number | null;
  razon: string | null;
}

export interface Propuesta {
  id: string;
  slug: string;
  clienteId: string;
  usuarioId: string;
  formato: "ficha" | "presentacion" | "web" | "pdf";
  opciones: {
    esquemaPagos: boolean;
    costosCierre: boolean;
    comparativo: boolean;
    videoInstitucional: boolean;
    mapa: boolean;
  };
  items: PropuestaItem[];
  /** Fecha para leer ("18 septiembre 2026"). */
  creadaEl: string;
  /** La misma fecha en ISO, para contar y ordenar. */
  creadaIso: string;
  enviadaEl: string | null;
  estado: "borrador" | "enviada" | "vista" | "negociacion" | "sin_respuesta";
  vistas: number;
  kommoLeadId: string | null;
}

/**
 * Lo que ve el cliente en su enlace: la propuesta, a quién va dirigida, quién
 * la firma y los desarrollos sin nada interno.
 */
export interface PropuestaPublica {
  propuesta: Propuesta;
  cliente: { nombre: string; recamaras: string | null } | null;
  asesor: { nombre: string; correo: string; telefono: string | null; plazas: string[] } | null;
  desarrollos: Desarrollo[];
}

/** Filtros del portal interno. */
export interface FiltrosInventario {
  q?: string;
  ciudad?: string;
  precioMin?: number;
  precioMax?: number;
  recamaras?: number;
  objetivo?: Objetivo;
  soloPublicados?: boolean;
}
