import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { alcanza, requisitosParaPublicar } from "@casacruz/core";
import { exigir } from "./auth";
import { fuente } from "./datos";
import { avisarPropuestaEnKommo } from "./kommo";
import {
  clienteSchema,
  desarrolloSchema,
  errorSchema,
  estatusListing,
  objetivo,
  propuestaSchema,
  tipoPropiedad,
  tipologiaSchema,
} from "./esquemas";

/**
 * Escritura: dar de alta, editar y publicar.
 *
 * Todo pasa por aquí con sesión: quién crea y quién publica no es lo mismo, y
 * el servidor es el que dice si un desarrollo está listo para verse.
 */
export async function rutasEscritura(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  const noEncontrado = { 404: errorSchema };
  const idParam = z.object({ id: z.string() });

  // ── Desarrollos ────────────────────────────────────────────────────────
  app.post(
    "/desarrollos",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Alta de producto"],
        summary: "Crear un desarrollo",
        description: "Nace en estado borrador, a nombre de quien lo crea.",
        body: z.object({
          nombre: z.string().min(2),
          plazaId: z.string().min(1),
          ciudad: z.string().min(2),
          tipo: tipoPropiedad,
          zona: z.string().nullish(),
          entrega: z.string().nullish(),
        }),
        response: { 201: desarrolloSchema },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.crearDesarrollo({
        ...peticion.body,
        responsableId: peticion.user.id,
      });
      return respuesta.code(201).send(desarrollo);
    },
  );

  app.patch(
    "/desarrollos/:id",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Alta de producto"],
        summary: "Editar un desarrollo",
        description:
          "Edita los datos generales. Los campos sensibles (comisión, entrega contractual) deben pasar por POST /cambios para quedar con su fuente y su aprobación.",
        params: idParam,
        body: z.object({
          nombre: z.string().min(2).optional(),
          ciudad: z.string().min(2).optional(),
          zona: z.string().nullish(),
          direccion: z.string().nullish(),
          lat: z.number().min(-90).max(90).nullish(),
          lng: z.number().min(-180).max(180).nullish(),
          desarrollador: z.string().nullish(),
          entrega: z.string().nullish(),
          amenidades: z.array(z.string()).optional(),
          aConsiderar: z.array(z.string()).optional(),
          condiciones: z
            .object({
              enganchePct: z.number().min(0).max(100).nullish(),
              engancheNota: z.string().nullish(),
              restoPct: z.number().min(0).max(100).nullish(),
              restoNota: z.string().nullish(),
              mensualidades: z.string().nullish(),
              formasPago: z.array(z.string()).optional(),
              promocionVigente: z.string().nullish(),
              descuentoContado: z.string().nullish(),
            })
            .optional(),
          comercial: z
            .object({
              buyerPersona: z.string().nullish(),
              clienteIdeal: z.string().nullish(),
              argumentos: z.array(z.string()).optional(),
              diferenciadores: z.array(z.string()).optional(),
              objeciones: z.array(z.string()).optional(),
              comparables: z.array(z.string()).optional(),
              noDeberiaComprarlo: z.array(z.string()).optional(),
            })
            .optional(),
        }),
        response: { 200: desarrolloSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.actualizarDesarrollo(peticion.params.id, peticion.body);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      return desarrollo;
    },
  );

  app.get(
    "/desarrollos/:id/requisitos",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Alta de producto"],
        summary: "Qué le falta para publicarse",
        params: idParam,
        response: {
          200: z.object({
            listo: z.boolean(),
            requisitos: z.array(
              z.object({ clave: z.string(), texto: z.string(), cumple: z.boolean() }),
            ),
          }),
          ...noEncontrado,
        },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      const requisitos = requisitosParaPublicar(desarrollo);
      return { listo: requisitos.every((r) => r.cumple), requisitos };
    },
  );

  app.post(
    "/desarrollos/:id/estatus",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Alta de producto"],
        summary: "Mover el desarrollo en el flujo de alta",
        description:
          "Borrador y revisión los mueve el cerrador. Due diligence, aprobado y publicado son de corporativo. No se publica nada que no cumpla los requisitos.",
        params: idParam,
        body: z.object({ estatus: estatusListing }),
        response: { 200: desarrolloSchema, 403: errorSchema, 409: errorSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const { estatus } = peticion.body;
      const deCorporativo = ["due_diligence", "aprobado", "publicado"].includes(estatus);
      if (deCorporativo && !alcanza(peticion.user.rol, "corporativo")) {
        return respuesta
          .code(403)
          .send({ error: `Pasar a ${estatus} es de corporativo; tu rol es ${peticion.user.rol}.` });
      }

      if (estatus === "publicado") {
        const faltantes = requisitosParaPublicar(desarrollo).filter((r) => !r.cumple);
        if (faltantes.length) {
          return respuesta.code(409).send({
            error: "El desarrollo no está listo para publicarse",
            detalle: faltantes.map((r) => r.texto),
          });
        }
      }

      return (await datos.cambiarEstatus(peticion.params.id, estatus))!;
    },
  );

  // ── Tipologías ─────────────────────────────────────────────────────────
  app.put(
    "/desarrollos/:id/tipologias",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Alta de producto"],
        summary: "Crear o actualizar una tipología con sus niveles de precio",
        description: "Los niveles se reemplazan completos: son una lista, no un parche.",
        params: idParam,
        body: z.object({
          id: z.string().optional(),
          nombre: z.string().min(2),
          recamaras: z.number().int().min(0).nullish(),
          banos: z.number().min(0).nullish(),
          m2Construccion: z.number().min(0).nullish(),
          m2Terreno: z.number().min(0).nullish(),
          estacionamientos: z.number().int().min(0).nullish(),
          planoUrl: z.string().nullish(),
          niveles: z
            .array(
              z.object({
                nombre: z.string().min(1),
                precioVenta: z.number().min(0).nullable(),
                precioLista: z.number().min(0).nullish(),
                disponibles: z.number().int().min(0).nullish(),
              }),
            )
            .min(1),
        }),
        response: { 200: tipologiaSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const tipologia = await datos.guardarTipologia(peticion.params.id, peticion.body);
      if (!tipologia) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      return tipologia;
    },
  );

  app.delete(
    "/desarrollos/:id/tipologias/:tipologiaId",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Alta de producto"],
        summary: "Eliminar una tipología",
        params: z.object({ id: z.string(), tipologiaId: z.string() }),
        response: { 200: z.object({ ok: z.boolean() }), ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const ok = await datos.eliminarTipologia(peticion.params.id, peticion.params.tipologiaId);
      if (!ok) return respuesta.code(404).send({ error: "Tipología no encontrada" });
      return { ok };
    },
  );

  // ── Clientes ───────────────────────────────────────────────────────────
  const cuerpoCliente = z.object({
    nombre: z.string().min(2),
    correo: z.string().nullish(),
    telefono: z.string().nullish(),
    ciudadResidencia: z.string().nullish(),
    presupuestoMin: z.number().min(0).nullish(),
    presupuestoMax: z.number().min(0).nullish(),
    recamaras: z.string().nullish(),
    objetivo: objetivo.nullish(),
    plazasInteres: z.array(z.string()).optional(),
    kommoLeadId: z.string().nullish(),
    kommoEtapa: z.string().nullish(),
    notas: z.string().nullish(),
  });

  app.post(
    "/clientes",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Comercial"],
        summary: "Crear un cliente",
        body: cuerpoCliente,
        response: { 201: clienteSchema },
      },
    },
    async (peticion, respuesta) => respuesta.code(201).send(await datos.crearCliente(peticion.body)),
  );

  app.patch(
    "/clientes/:id",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Comercial"],
        summary: "Editar un cliente",
        params: idParam,
        body: cuerpoCliente.partial(),
        response: { 200: clienteSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const cliente = await datos.actualizarCliente(peticion.params.id, peticion.body);
      if (!cliente) return respuesta.code(404).send({ error: "Cliente no encontrado" });
      return cliente;
    },
  );

  // ── Propuestas ─────────────────────────────────────────────────────────
  app.post(
    "/propuestas",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Propuestas"],
        summary: "Generar una propuesta",
        description:
          "Congela el precio de cada opción al momento de crearla. Si se envía, se registra la fecha y se avisa al lead de Kommo.",
        body: z.object({
          clienteId: z.string().min(1),
          formato: z.enum(["ficha", "presentacion", "web", "pdf"]),
          enviar: z.boolean().optional(),
          opciones: z
            .object({
              esquemaPagos: z.boolean().optional(),
              costosCierre: z.boolean().optional(),
              comparativo: z.boolean().optional(),
              videoInstitucional: z.boolean().optional(),
              mapa: z.boolean().optional(),
            })
            .optional(),
          items: z
            .array(
              z.object({
                desarrolloId: z.string().min(1),
                tipologiaId: z.string().nullish(),
                nivel: z.string().nullish(),
                razon: z.string().nullish(),
              }),
            )
            .min(1),
        }),
        response: { 201: propuestaSchema, 404: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const cliente = await datos.obtenerCliente(peticion.body.clienteId);
      if (!cliente) return respuesta.code(404).send({ error: "Cliente no encontrado" });

      const propuesta = await datos.crearPropuesta({
        ...peticion.body,
        usuarioId: peticion.user.id,
      });

      if (propuesta.enviadaEl) {
        await avisarPropuestaEnKommo(propuesta, cliente, peticion.user.nombre, app.log);
      }
      return respuesta.code(201).send(propuesta);
    },
  );

  app.post(
    "/propuestas/:slug/enviar",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Propuestas"],
        summary: "Marcar una propuesta como enviada",
        params: z.object({ slug: z.string() }),
        response: { 200: propuestaSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const propuesta = await datos.marcarPropuestaEnviada(peticion.params.slug);
      if (!propuesta) return respuesta.code(404).send({ error: "Propuesta no encontrada" });

      const cliente = await datos.obtenerCliente(propuesta.clienteId);
      if (cliente) {
        await avisarPropuestaEnKommo(propuesta, cliente, peticion.user.nombre, app.log);
      }
      return propuesta;
    },
  );
}
