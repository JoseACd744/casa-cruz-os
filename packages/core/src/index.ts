/**
 * Núcleo compartido de Casa Cruz OS.
 *
 * Aquí viven el modelo de datos, las reglas de negocio y los datos de
 * demostración. Lo usan tanto la web (apps/web) como la API (apps/api), para que
 * la confiabilidad se calcule igual en los dos lados y nadie invente un dato.
 */

export * from "./types";
export * from "./format";
export * from "./confiabilidad";
export * from "./derivados";
export * from "./reglas";
export * from "./cambios";
export * from "./alta";
export * from "./comercial";
export * from "./capacitacion";
export * from "./roles";
export * from "./cuentas";
export * from "./fechas";
export * from "./galeria";
export * as mock from "./mock";
