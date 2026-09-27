/**
 * Capacitación y certificación por plaza.
 *
 * "La tecnología no sustituye la capacitación": un cerrador vende sólo las
 * plazas en las que está certificado. Se certifica al completar los módulos de
 * la plaza y aprobar la evaluación con 80 %; la certificación dura un año.
 */

export interface ModuloCapacitacion {
  id: string;
  plazaId: string;
  orden: number;
  titulo: string;
  tipo: "video" | "documento";
  /** "Video · 18 min", "Documento · 12 páginas". */
  detalle: string;
  /** Dónde se consulta. Null mientras sea contenido de ejemplo. */
  url: string | null;
  /** Contenido de ejemplo mientras llega el real. */
  ejemplo: boolean;
}

export interface Pregunta {
  id: string;
  plazaId: string;
  orden: number;
  texto: string;
  opciones: string[];
  /** Índice de la opción correcta. Nunca sale al navegador. */
  correcta: number;
}

export type PreguntaPublica = Omit<Pregunta, "correcta">;

export interface IntentoEvaluacion {
  plazaId: string;
  aciertos: number;
  total: number;
  aprobado: boolean;
  fechaIso: string;
}

/** Lo que lleva cada persona: módulos vistos, intentos y certificaciones. */
export interface AvanceCapacitacion {
  completados: { moduloId: string; fechaIso: string }[];
  intentos: IntentoEvaluacion[];
  certificaciones: { plazaId: string; venceIso: string | null }[];
  preparacion: { desarrolloId: string; items: string[] }[];
}

export const APROBATORIO = 0.8;
export const MESES_DE_VIGENCIA = 12;

export function publica(p: Pregunta): PreguntaPublica {
  const { correcta: _correcta, ...resto } = p;
  void _correcta;
  return resto;
}

/** Califica en el servidor: el navegador sólo manda qué opción eligió en cada pregunta. */
export function calificar(
  preguntas: Pregunta[],
  respuestas: Record<string, number>,
): { aciertos: number; total: number; aprobado: boolean; fallidas: string[] } {
  const fallidas = preguntas.filter((p) => respuestas[p.id] !== p.correcta);
  const aciertos = preguntas.length - fallidas.length;
  return {
    aciertos,
    total: preguntas.length,
    aprobado: preguntas.length > 0 && aciertos / preguntas.length >= APROBATORIO,
    fallidas: fallidas.map((p) => p.texto),
  };
}

export function venceDesde(fecha: Date): string {
  const vence = new Date(fecha);
  vence.setUTCMonth(vence.getUTCMonth() + MESES_DE_VIGENCIA);
  return vence.toISOString();
}

export type EstadoCertificacion = "certificado" | "vencido" | "en_progreso" | "no_iniciado";

export interface EstadoPlaza {
  plazaId: string;
  estado: EstadoCertificacion;
  /** Porcentaje del camino: cada módulo y la evaluación cuentan igual. */
  avance: number;
  modulos: { modulo: ModuloCapacitacion; completado: boolean }[];
  /** Ya vio todos los módulos: puede presentar la evaluación. */
  puedeEvaluarse: boolean;
  ultimoIntento: IntentoEvaluacion | null;
  venceIso: string | null;
}

export function estadoDePlaza(
  plazaId: string,
  modulos: ModuloCapacitacion[],
  avance: AvanceCapacitacion,
  hoy: Date,
): EstadoPlaza {
  const propios = modulos.filter((m) => m.plazaId === plazaId).sort((a, b) => a.orden - b.orden);
  const vistos = new Set(avance.completados.map((c) => c.moduloId));
  const conEstado = propios.map((modulo) => ({ modulo, completado: vistos.has(modulo.id) }));
  const hechos = conEstado.filter((m) => m.completado).length;

  const intentos = avance.intentos
    .filter((i) => i.plazaId === plazaId)
    .sort((a, b) => b.fechaIso.localeCompare(a.fechaIso));
  const certificacion = avance.certificaciones.find((c) => c.plazaId === plazaId) ?? null;
  const vigente = certificacion && (!certificacion.venceIso || new Date(certificacion.venceIso) > hoy);

  const estado: EstadoCertificacion = vigente
    ? "certificado"
    : certificacion
      ? "vencido"
      : hechos > 0 || intentos.length > 0
        ? "en_progreso"
        : "no_iniciado";

  const pasos = propios.length + 1;
  const aprobado = intentos.some((i) => i.aprobado);
  return {
    plazaId,
    estado,
    avance: estado === "certificado" ? 100 : Math.round(((hechos + (aprobado ? 1 : 0)) / pasos) * 100),
    modulos: conEstado,
    puedeEvaluarse: propios.length > 0 && hechos === propios.length,
    ultimoIntento: intentos[0] ?? null,
    venceIso: certificacion?.venceIso ?? null,
  };
}

/** Lo que conviene revisar antes de presentar un desarrollo a un cliente. */
export const PREPARACION: { clave: string; texto: string }[] = [
  { clave: "video", texto: "Ver el video del desarrollo" },
  { clave: "objeciones", texto: "Leer las objeciones frecuentes y qué cliente no debería comprarlo" },
  { clave: "esquema", texto: "Conocer el esquema de pago y la fecha de entrega" },
  { clave: "recorrido", texto: "Visitar el showroom o hacer el recorrido virtual" },
];
