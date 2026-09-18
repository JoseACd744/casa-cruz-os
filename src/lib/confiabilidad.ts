import type { CampoValidable, Desarrollo, Validacion } from "@/lib/types";

/**
 * La confiabilidad NO se captura: se calcula desde las validaciones.
 *
 * Cada campo crítico pesa distinto y caduca a distinto ritmo. Un campo
 * validado dentro de su vigencia suma completo; dentro del doble de su
 * vigencia suma la mitad; más allá de eso, o sin validar, suma cero.
 */

export const CAMPOS: {
  campo: CampoValidable;
  etiqueta: string;
  peso: number;
  vigenciaDias: number;
}[] = [
  { campo: "precio", etiqueta: "Precio", peso: 30, vigenciaDias: 15 },
  { campo: "disponibilidad", etiqueta: "Disponibilidad", peso: 30, vigenciaDias: 15 },
  { campo: "promocion", etiqueta: "Promoción vigente", peso: 10, vigenciaDias: 30 },
  { campo: "entrega", etiqueta: "Fecha de entrega", peso: 15, vigenciaDias: 30 },
  { campo: "comision", etiqueta: "Comisión", peso: 15, vigenciaDias: 90 },
];

export type EstadoValidacion = "vigente" | "por_vencer" | "vencido" | "sin_validar";

export interface EstadoCampo {
  campo: CampoValidable;
  etiqueta: string;
  estado: EstadoValidacion;
  haceDias: number | null;
  validadoPor: string | null;
  vigenciaDias: number;
}

export function estadoDeCampo(
  def: (typeof CAMPOS)[number],
  validacion: Validacion | undefined,
): EstadoCampo {
  let estado: EstadoValidacion = "sin_validar";
  if (validacion) {
    if (validacion.haceDias <= def.vigenciaDias) estado = "vigente";
    else if (validacion.haceDias <= def.vigenciaDias * 2) estado = "por_vencer";
    else estado = "vencido";
  }
  return {
    campo: def.campo,
    etiqueta: def.etiqueta,
    estado,
    haceDias: validacion ? validacion.haceDias : null,
    validadoPor: validacion ? validacion.validadoPor : null,
    vigenciaDias: def.vigenciaDias,
  };
}

export function estadoValidaciones(desarrollo: Desarrollo): EstadoCampo[] {
  return CAMPOS.map((def) =>
    estadoDeCampo(
      def,
      desarrollo.validaciones.find((v) => v.campo === def.campo),
    ),
  );
}

export function confiabilidad(desarrollo: Desarrollo): number {
  const estados = estadoValidaciones(desarrollo);
  const total = CAMPOS.reduce((acc, c) => acc + c.peso, 0);
  const suma = estados.reduce((acc, e) => {
    const peso = CAMPOS.find((c) => c.campo === e.campo)!.peso;
    if (e.estado === "vigente") return acc + peso;
    if (e.estado === "por_vencer") return acc + peso / 2;
    return acc;
  }, 0);
  return Math.round((suma / total) * 100);
}

export function semaforo(valor: number): "ok" | "warn" | "alert" {
  if (valor >= 85) return "ok";
  if (valor >= 65) return "warn";
  return "alert";
}

/** Advertencia que debe verse antes de enviar algo al cliente. */
export function advertencia(desarrollo: Desarrollo): string | null {
  const estados = estadoValidaciones(desarrollo);
  const disponibilidad = estados.find((e) => e.campo === "disponibilidad");
  if (disponibilidad && disponibilidad.estado !== "vigente") {
    const dias = disponibilidad.haceDias;
    return dias === null
      ? "La disponibilidad de esta propiedad nunca se ha confirmado. Verifícala antes de enviarla al cliente."
      : `La disponibilidad no se confirma desde hace ${dias} días. Verifícala antes de enviarla al cliente.`;
  }
  const precio = estados.find((e) => e.campo === "precio");
  if (precio && precio.estado === "vencido") {
    return `El precio no se valida desde hace ${precio.haceDias} días.`;
  }
  return null;
}
