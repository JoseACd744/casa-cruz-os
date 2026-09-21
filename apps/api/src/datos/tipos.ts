import type {
  Cambio,
  Cliente,
  Desarrollo,
  EstatusListing,
  FiltrosInventario,
  FuenteTipo,
  Plaza,
  Propuesta,
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

/**
 * Lo que la API sabe hacer con los datos.
 *
 * Hay dos implementaciones: una contra Postgres (Prisma) y otra contra los
 * datos de demostración del núcleo, para poder trabajar sin base todavía.
 */
export interface FuenteDeDatos {
  readonly nombre: "postgres" | "mock";

  listarPlazas(): Promise<Plaza[]>;
  listarDesarrollos(filtros: FiltrosInventario): Promise<Desarrollo[]>;
  obtenerDesarrollo(id: string): Promise<Desarrollo | null>;
  listarUsuarios(): Promise<Usuario[]>;
  obtenerUsuarioActual(): Promise<Usuario>;
  listarClientes(): Promise<Cliente[]>;
  obtenerCliente(id: string): Promise<Cliente | null>;
  listarPropuestas(): Promise<Propuesta[]>;
  obtenerPropuesta(slug: string): Promise<Propuesta | null>;
  listarCambios(estado?: Cambio["estado"]): Promise<Cambio[]>;
  cambiosDe(desarrolloId: string): Promise<Cambio[]>;
  conteoPipeline(): Promise<Record<EstatusListing, number>>;
  novedades(): Promise<{ fecha: string; titulo: string; detalle: string }[]>;

  registrarCambio(entrada: NuevoCambio): Promise<Cambio>;
  aprobarCambio(id: string, aprobadorId: string): Promise<Cambio | null>;
  registrarValidacion(desarrolloId: string, campo: string, usuarioId: string): Promise<void>;
  sumarVistaPropuesta(slug: string): Promise<number>;
}
