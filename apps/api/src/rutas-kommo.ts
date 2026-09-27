import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { alcanza } from "@casacruz/core";
import { exigir } from "./auth";
import { config } from "./config";
import { fuente } from "./datos";
import { errorSchema } from "./esquemas";
import { kommoConfigurado } from "./kommo";
import { claveCorrecta, procesarWebhook, webhookConfigurado } from "./kommo-entrada";

/** Kommo de entrada: el webhook y el estado de la integración. */
export async function rutasKommo(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  // Kommo manda formularios, no JSON. Sólo en este grupo de rutas.
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_peticion, cuerpo, listo) => {
    listo(null, Object.fromEntries(new URLSearchParams(String(cuerpo))));
  });

  app.post(
    "/webhooks/kommo",
    {
      schema: {
        tags: ["Integraciones"],
        summary: "Webhook de Kommo",
        description: [
          "Se configura en Kommo → Ajustes → Integraciones → Webhooks, con la URL `…/webhooks/kommo?clave=KOMMO_WEBHOOK_SECRETO`, para los eventos de leads (agregar, cambio de etapa, editar y eliminar).",
          "",
          "Un lead nuevo crea al cliente y un cambio de etapa la actualiza con su línea en la actividad. Se responde de inmediato; el teléfono y el correo del contacto se completan después si hay token.",
        ].join("\n"),
        querystring: z.object({ clave: z.string().optional() }),
        body: z.record(z.string(), z.string()),
        response: {
          200: z.object({ ok: z.boolean(), procesados: z.number() }),
          401: errorSchema,
          503: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      if (!webhookConfigurado) {
        return respuesta.code(503).send({ error: "Falta KOMMO_WEBHOOK_SECRETO: el webhook no está habilitado." });
      }
      if (!claveCorrecta(peticion.query.clave)) {
        app.log.warn({ ip: peticion.ip }, "Webhook de Kommo con clave incorrecta");
        return respuesta.code(401).send({ error: "Clave incorrecta" });
      }
      const cuenta = peticion.body["account[subdomain]"];
      if (config.kommo.subdominio && cuenta && cuenta !== config.kommo.subdominio) {
        return respuesta.code(401).send({ error: "El aviso no es de la cuenta de Casa Cruz" });
      }

      const { procesados } = await procesarWebhook(datos, peticion.body, app.log);
      return { ok: true, procesados };
    },
  );

  app.get(
    "/integraciones/kommo",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Integraciones"],
        summary: "Estado de la integración con Kommo",
        description: "Si está conectada, cuándo llegó el último aviso y, para gerente o corporativo, la bitácora de eventos.",
        response: {
          200: z.object({
            notas: z.boolean().meta({ description: "Casa Cruz OS escribe notas en los leads." }),
            webhook: z.boolean().meta({ description: "Kommo le avisa a Casa Cruz OS." }),
            ultimoEvento: z.string().nullable(),
            eventos: z.array(
              z.object({ recibidoIso: z.string(), tipo: z.string(), leadId: z.string(), resultado: z.string() }),
            ),
          }),
        },
      },
    },
    async (peticion) => {
      const eventos = await datos.eventosKommo(30);
      return {
        notas: kommoConfigurado,
        webhook: webhookConfigurado,
        ultimoEvento: eventos[0]?.recibidoIso ?? null,
        eventos: alcanza(peticion.user.rol, "gerente") ? eventos : [],
      };
    },
  );
}
