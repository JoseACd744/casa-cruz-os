import type { FastifyBaseLogger } from "fastify";
import type { Cliente, Propuesta } from "@casacruz/core";
import { config } from "./config";

/**
 * Kommo sigue siendo el CRM.
 *
 * Casa Cruz OS no pretende reemplazarlo: cuando se envía una propuesta, se deja
 * la nota en el lead para que el cerrador vea en Kommo qué se presentó, cuándo y
 * con qué enlace.
 */

export const kommoConfigurado = Boolean(config.kommo.subdominio && config.kommo.token);

function textoDeNota(propuesta: Propuesta, cliente: Cliente, asesor: string): string {
  const enlace = `${config.urlPublica}/p/${propuesta.slug}`;
  return [
    `Propuesta enviada por ${asesor}`,
    `Cliente: ${cliente.nombre}`,
    `Propiedades presentadas: ${propuesta.items.length}`,
    `Enlace: ${enlace}`,
    `Siguiente acción: dar seguimiento a la apertura del enlace.`,
  ].join("\n");
}

/**
 * Escribe la nota en el lead. Si Kommo no está configurado, lo deja en el log y
 * sigue: que falte el CRM no debe tumbar la generación de una propuesta.
 */
export async function avisarPropuestaEnKommo(
  propuesta: Propuesta,
  cliente: Cliente,
  asesor: string,
  log: FastifyBaseLogger,
): Promise<boolean> {
  const leadId = propuesta.kommoLeadId ?? cliente.kommoLeadId;

  if (!kommoConfigurado) {
    log.info({ propuesta: propuesta.slug }, "Kommo sin configurar: no se escribió la nota");
    return false;
  }
  if (!leadId) {
    log.warn({ propuesta: propuesta.slug }, "El cliente no tiene lead de Kommo");
    return false;
  }

  const url = `https://${config.kommo.subdominio}.kommo.com/api/v4/leads/${leadId}/notes`;

  try {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.kommo.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        {
          note_type: "common",
          params: { text: textoDeNota(propuesta, cliente, asesor) },
        },
      ]),
    });

    if (!respuesta.ok) {
      log.error(
        { estado: respuesta.status, propuesta: propuesta.slug },
        "Kommo rechazó la nota de la propuesta",
      );
      return false;
    }

    log.info({ lead: leadId, propuesta: propuesta.slug }, "Nota escrita en el lead de Kommo");
    return true;
  } catch (error) {
    log.error({ error, propuesta: propuesta.slug }, "No se pudo avisar a Kommo");
    return false;
  }
}
