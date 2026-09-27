import { timingSafeEqual } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { FuenteDeDatos } from "./datos";
import { config } from "./config";

/**
 * Lo que Kommo le avisa a Casa Cruz OS.
 *
 * Kommo manda sus webhooks como formulario, con llaves anidadas entre
 * corchetes: `leads[add][0][id]=123`. Un lead nuevo crea el cliente aquí; un
 * cambio de etapa la actualiza y deja la línea en su actividad. Todo evento
 * queda en la bitácora de la integración, se haya podido procesar o no.
 */

export const webhookConfigurado = Boolean(config.kommo.webhookSecreto);

/** Compara la clave del webhook en tiempo constante. */
export function claveCorrecta(recibida: string | undefined): boolean {
  if (!config.kommo.webhookSecreto || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(config.kommo.webhookSecreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `leads[add][0][id]` → { leads: { add: { 0: { id } } } }. */
export function desanidar(plano: Record<string, string>): Record<string, unknown> {
  const raiz: Record<string, unknown> = {};
  for (const [llave, valor] of Object.entries(plano)) {
    const partes = llave.split(/\[|\]/).filter(Boolean);
    let nodo = raiz;
    partes.forEach((parte, i) => {
      if (i === partes.length - 1) {
        nodo[parte] = valor;
      } else {
        nodo[parte] = (nodo[parte] as Record<string, unknown> | undefined) ?? {};
        nodo = nodo[parte] as Record<string, unknown>;
      }
    });
  }
  return raiz;
}

export type TipoEvento = "add" | "status" | "update" | "delete";

export interface EventoLead {
  tipo: TipoEvento;
  leadId: string;
  nombre: string | null;
  statusId: string | null;
}

export function eventosDe(plano: Record<string, string>): { subdominio: string | null; eventos: EventoLead[] } {
  const cuerpo = desanidar(plano);
  const leads = (cuerpo.leads ?? {}) as Record<string, Record<string, Record<string, string>>>;
  const eventos: EventoLead[] = [];
  for (const tipo of ["add", "status", "update", "delete"] as const) {
    for (const lead of Object.values(leads[tipo] ?? {})) {
      if (!lead?.id) continue;
      eventos.push({
        tipo,
        leadId: String(lead.id),
        nombre: lead.name?.trim() || null,
        statusId: lead.status_id ?? null,
      });
    }
  }
  const cuenta = (cuerpo.account ?? {}) as Record<string, string>;
  return { subdominio: cuenta.subdomain ?? null, eventos };
}

// ── Nombres de las etapas ────────────────────────────────────────────────

/** Las dos etapas que Kommo tiene en todos los embudos. */
const FIJAS: Record<string, string> = { "142": "Ganado", "143": "Perdido" };

let etapas: { nombres: Record<string, string>; hasta: number } | null = null;

async function nombresDeEtapas(log: FastifyBaseLogger): Promise<Record<string, string>> {
  if (etapas && etapas.hasta > Date.now()) return etapas.nombres;
  const nombres: Record<string, string> = { ...FIJAS };
  if (config.kommo.subdominio && config.kommo.token) {
    try {
      const r = await fetch(`https://${config.kommo.subdominio}.kommo.com/api/v4/leads/pipelines`, {
        headers: { authorization: `Bearer ${config.kommo.token}` },
      });
      if (r.ok) {
        const json = (await r.json()) as {
          _embedded?: { pipelines?: { _embedded?: { statuses?: { id: number; name: string }[] } }[] };
        };
        for (const embudo of json._embedded?.pipelines ?? []) {
          for (const s of embudo._embedded?.statuses ?? []) nombres[String(s.id)] = s.name;
        }
      }
    } catch (error) {
      log.warn({ error }, "No se pudieron leer las etapas de Kommo");
    }
  }
  etapas = { nombres, hasta: Date.now() + 10 * 60_000 };
  return nombres;
}

async function etapaDe(statusId: string | null, log: FastifyBaseLogger): Promise<string | null> {
  if (!statusId) return null;
  return (await nombresDeEtapas(log))[statusId] ?? `Etapa ${statusId}`;
}

// ── Procesar ─────────────────────────────────────────────────────────────

/** Teléfono y correo del contacto del lead, cuando hay token. Va aparte: Kommo no espera. */
async function completarContacto(datos: FuenteDeDatos, clienteId: string, leadId: string, log: FastifyBaseLogger) {
  if (!config.kommo.subdominio || !config.kommo.token) return;
  const base = `https://${config.kommo.subdominio}.kommo.com/api/v4`;
  const headers = { authorization: `Bearer ${config.kommo.token}` };
  try {
    const lead = (await (await fetch(`${base}/leads/${leadId}?with=contacts`, { headers })).json()) as {
      _embedded?: { contacts?: { id: number }[] };
    };
    const contactoId = lead._embedded?.contacts?.[0]?.id;
    if (!contactoId) return;
    const contacto = (await (await fetch(`${base}/contacts/${contactoId}`, { headers })).json()) as {
      name?: string;
      custom_fields_values?: { field_code?: string; values: { value: string }[] }[];
    };
    const campo = (codigo: string) =>
      contacto.custom_fields_values?.find((c) => c.field_code === codigo)?.values[0]?.value ?? null;
    await datos.actualizarCliente(clienteId, {
      telefono: campo("PHONE"),
      correo: campo("EMAIL"),
      ...(contacto.name ? { nombre: contacto.name } : {}),
    });
  } catch (error) {
    log.warn({ error, lead: leadId }, "No se pudo completar el contacto desde Kommo");
  }
}

export async function procesarWebhook(
  datos: FuenteDeDatos,
  plano: Record<string, string>,
  log: FastifyBaseLogger,
): Promise<{ procesados: number }> {
  const { eventos } = eventosDe(plano);
  const recibidoIso = new Date().toISOString();

  for (const evento of eventos) {
    let resultado: string;
    try {
      const existente = await datos.obtenerClientePorLead(evento.leadId);
      const etapa = await etapaDe(evento.statusId, log);

      if (evento.tipo === "delete") {
        if (existente) await datos.registrarActividad(existente.id, "El lead se eliminó en Kommo.");
        resultado = existente ? "anotado en la actividad" : "lead desconocido: ignorado";
      } else if (!existente) {
        // Un lead nuevo, o uno de antes de conectar la integración: se da de alta.
        const cliente = await datos.crearCliente({
          nombre: evento.nombre ?? `[NOMBRE EN KOMMO] · lead ${evento.leadId}`,
          kommoLeadId: evento.leadId,
          kommoEtapa: etapa,
        });
        await datos.registrarActividad(cliente.id, "Lead creado en Kommo.");
        void completarContacto(datos, cliente.id, evento.leadId, log);
        resultado = "cliente creado";
      } else if (evento.tipo === "update") {
        const sinNombre = existente.nombre.startsWith("[");
        if (sinNombre && evento.nombre) await datos.actualizarCliente(existente.id, { nombre: evento.nombre });
        resultado = sinNombre && evento.nombre ? "nombre actualizado" : "sin cambios";
      } else if (etapa && etapa !== existente.kommoEtapa) {
        await datos.actualizarCliente(existente.id, { kommoEtapa: etapa });
        await datos.registrarActividad(existente.id, `Etapa en Kommo: ${etapa}.`);
        resultado = "etapa actualizada";
      } else {
        resultado = "ya estaba al día";
      }
    } catch (error) {
      log.error({ error, evento }, "Falló un evento de Kommo");
      resultado = "error";
    }
    await datos.registrarEventoKommo({ recibidoIso, tipo: evento.tipo, leadId: evento.leadId, resultado });
  }
  return { procesados: eventos.length };
}
