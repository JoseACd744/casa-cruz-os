import type { Desarrollo, Rol } from "./types";
import { alcanza } from "./roles";

/**
 * Reglas comerciales: qué se le puede proponer a un cliente y quién.
 */

/**
 * Por qué este desarrollo no puede ir en una propuesta de este usuario, o null.
 *
 * Sólo lo publicado llega al cliente, y un cerrador sólo vende las plazas en
 * las que está certificado. Gerente y corporativo supervisan: no se les limita
 * por plaza.
 */
export function motivoParaNoProponer(
  usuario: { rol: Rol; plazasCertificadas: string[] },
  d: Pick<Desarrollo, "nombre" | "plazaId" | "estatus">,
): string | null {
  if (d.estatus !== "publicado") return `${d.nombre} todavía no está publicado.`;
  if (!alcanza(usuario.rol, "gerente") && !usuario.plazasCertificadas.includes(d.plazaId)) {
    return `No estás certificado en la plaza de ${d.nombre}.`;
  }
  return null;
}

export type AccionDeInteres = "conocer" | "videollamada" | "asesor";

/** Lo que queda en la actividad del cliente cuando pide algo desde su propuesta. */
export function textoDeInteres(accion: AccionDeInteres, desarrollo?: string | null): string {
  switch (accion) {
    case "conocer":
      return desarrollo
        ? `Pidió conocer ${desarrollo} desde su propuesta.`
        : "Pidió conocer una de las propiedades desde su propuesta.";
    case "videollamada":
      return "Pidió agendar una videollamada desde su propuesta.";
    case "asesor":
      return "Pidió hablar con su asesor desde su propuesta.";
  }
}

/**
 * Enlace de WhatsApp al asesor con el mensaje ya escrito. Un número mexicano de
 * 10 dígitos se completa con la lada del país. Null si no hay teléfono.
 */
export function enlaceWhatsApp(telefono: string | null, mensaje: string): string | null {
  if (!telefono) return null;
  let digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10) digitos = `52${digitos}`;
  if (digitos.length < 11 || digitos.length > 15) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace al lead en Kommo, si se conoce la cuenta. */
export function enlaceKommo(subdominio: string | null, leadId: string | null): string | null {
  if (!subdominio || !leadId) return null;
  return `https://${subdominio}.kommo.com/leads/detail/${encodeURIComponent(leadId)}`;
}
