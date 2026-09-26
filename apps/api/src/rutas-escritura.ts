import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  alcanza,
  cambiosProtegidosEnParche,
  cambiosProtegidosEnTipologia,
  camposProtegidos,
  entregaDe,
  motivoParaNoMover,
  requisitosParaPublicar,
} from "@casacruz/core";
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
          nombre: z.string().trim().min(2),
          plazaId: z.string().min(1),
          ciudad: z.string().trim().min(2),
          tipo: tipoPropiedad,
          zona: z.string().nullish(),
          entrega: z.string().nullish().meta({ example: "Marzo 2027" }),
        }),
        response: { 201: desarrolloSchema, 400: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const plazas = await datos.listarPlazas();
      if (!plazas.some((p) => p.id === peticion.body.plazaId)) {
        return respuesta.code(400).send({ error: "Esa plaza no existe" });
      }
      const entrega = peticion.body.entrega ? entregaDe(peticion.body.entrega) : null;
      if (peticion.body.entrega && !entrega) {
        return respuesta.code(400).send({ error: "Escribe el mes y el año de entrega, por ejemplo Marzo 2027." });
      }

      const desarrollo = await datos.crearDesarrollo({
        ...peticion.body,
        entrega: entrega?.texto ?? null,
        entregaIso: entrega?.iso ?? null,
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
          "Edita los datos generales mientras el desarrollo se captura. Desde que se aprueba, precio, disponibilidad, entrega, promoción y enganche sólo cambian con POST /cambios (responde 409). La comisión siempre es un cambio con aprobación. El due diligence lo marca corporativo.",
        params: idParam,
        body: z.object({
          nombre: z.string().trim().min(2).optional(),
          tipo: tipoPropiedad.optional(),
          ciudad: z.string().trim().min(2).optional(),
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
          interna: z
            .object({
              contactoComercial: z.string().nullish(),
              convenioFirmado: z.boolean().nullish(),
              notasInternas: z.string().nullish(),
              dueDiligence: z.enum(["validado", "en_proceso", "pendiente"]).optional(),
            })
            .optional(),
        }),
        response: { 200: desarrolloSchema, 400: errorSchema, 403: errorSchema, 409: errorSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const d = await datos.obtenerDesarrollo(peticion.params.id);
      if (!d) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const parche: Parameters<typeof datos.actualizarDesarrollo>[1] = { ...peticion.body };
      if (peticion.body.entrega) {
        const entrega = entregaDe(peticion.body.entrega);
        if (!entrega) {
          return respuesta.code(400).send({ error: "Escribe el mes y el año de entrega, por ejemplo Marzo 2027." });
        }
        parche.entrega = entrega.texto;
        parche.entregaIso = entrega.iso;
      } else if (peticion.body.entrega === null) {
        parche.entregaIso = null;
      }

      const protegidos = cambiosProtegidosEnParche(d, {
        entrega: parche.entrega,
        condiciones: parche.condiciones,
      });
      if (protegidos.length) {
        return respuesta.code(409).send({
          error: "Estos datos ya los ve el cliente: se cambian registrando un cambio con su fuente.",
          detalle: protegidos,
        });
      }

      const dueDiligence = peticion.body.interna?.dueDiligence;
      if (
        dueDiligence !== undefined &&
        dueDiligence !== d.interna.dueDiligence &&
        !alcanza(peticion.user.rol, "corporativo")
      ) {
        return respuesta.code(403).send({ error: "El due diligence lo valida corporativo." });
      }

      return (await datos.actualizarDesarrollo(peticion.params.id, parche))!;
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
          "Paso por paso: borrador → revisión (la envía el cerrador) → due diligence (lo decide el gerente) → aprobado (corporativo, con el due diligence validado) → publicado (corporativo, con los requisitos completos). Cada paso puede regresar al anterior.",
        params: idParam,
        body: z.object({ estatus: estatusListing }),
        response: { 200: desarrolloSchema, 403: errorSchema, 409: errorSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const { estatus } = peticion.body;
      const motivo = motivoParaNoMover(desarrollo, estatus, peticion.user.rol);
      if (motivo) {
        return respuesta.code(motivo.codigo).send({ error: motivo.mensaje, detalle: motivo.detalle });
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
        response: { 200: tipologiaSchema, 400: errorSchema, 409: errorSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const d = await datos.obtenerDesarrollo(peticion.params.id);
      if (!d) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const nombres = peticion.body.niveles.map((n) => n.nombre.trim().toLowerCase());
      if (new Set(nombres).size !== nombres.length) {
        return respuesta.code(400).send({ error: "Hay niveles repetidos en la tipología." });
      }

      const protegidos = cambiosProtegidosEnTipologia(d, peticion.body);
      if (protegidos.length) {
        return respuesta.code(409).send({
          error: "El desarrollo ya está aprobado: precio y disponibilidad se cambian registrando un cambio.",
          detalle: protegidos,
        });
      }

      return (await datos.guardarTipologia(peticion.params.id, peticion.body))!;
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
        response: { 200: z.object({ ok: z.boolean() }), 409: errorSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const d = await datos.obtenerDesarrollo(peticion.params.id);
      if (!d) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      if (camposProtegidos(d.estatus).length) {
        return respuesta.code(409).send({
          error: "El desarrollo ya está aprobado: una tipología no se borra, se registra sin disponibilidad.",
        });
      }
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
