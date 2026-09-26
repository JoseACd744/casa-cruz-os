/**
 * Fechas tal como se leen en Casa Cruz.
 *
 * El servidor puede correr en UTC; si cada quien formatea con su reloj, una
 * propuesta enviada a las 7 pm aparece "mañana". Todo pasa por aquí, con la
 * hora del centro de México.
 */

export const ZONA_HORARIA = "America/Mexico_City";

function partes(fecha: Date, opciones: Intl.DateTimeFormatOptions): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("es-MX", { timeZone: ZONA_HORARIA, ...opciones }).formatToParts(
    fecha,
  )) {
    salida[p.type] = p.value;
  }
  return salida;
}

/** "viernes 18 de septiembre" */
export function fechaLarga(fecha: Date): string {
  const p = partes(fecha, { weekday: "long", day: "numeric", month: "long" });
  return `${p.weekday} ${p.day} de ${p.month}`;
}

/** "18 septiembre 2026" */
export function fechaDocumento(fecha: Date): string {
  const p = partes(fecha, { day: "numeric", month: "long", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}`;
}

/** "18 sep 2026" */
export function fechaCorta(fecha: Date): string {
  const p = partes(fecha, { day: "2-digit", month: "short", year: "numeric" });
  return `${p.day} ${p.month.replace(".", "")} ${p.year}`;
}

/** "18 sep 2026 · 12:43" */
export function fechaHora(fecha: Date): string {
  const p = partes(fecha, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${fechaCorta(fecha)} · ${p.hour}:${p.minute}`;
}

/** "septiembre 2026" */
export function mesAnio(fecha: Date): string {
  const p = partes(fecha, { month: "long", year: "numeric" });
  return `${p.month} ${p.year}`;
}

/** "2026-09" en la zona de México, para comparar meses sin tropezar con UTC. */
export function claveMes(fecha: Date): string {
  const p = partes(fecha, { year: "numeric", month: "2-digit" });
  return `${p.year}-${p.month}`;
}

/** Primer día del mes siguiente, para la rotación mensual de responsables. */
export function primeroDelMesSiguiente(fecha: Date): string {
  const p = partes(fecha, { year: "numeric", month: "numeric" });
  const siguiente = new Date(Date.UTC(Number(p.year), Number(p.month), 1, 12));
  const q = partes(siguiente, { day: "numeric", month: "long" });
  return `${q.day} de ${q.month}`;
}

/** "Buenos días", "Buenas tardes" o "Buenas noches", según la hora en México. */
export function saludo(fecha: Date): string {
  const hora = Number(partes(fecha, { hour: "numeric", hourCycle: "h23" }).hour);
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}
