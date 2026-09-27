import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { calificar, estadoDePlaza, PREPARACION, publica, venceDesde } from "@casacruz/core";
import { exigir, olvidarUsuario } from "./auth";
import { fuente } from "./datos";
import { errorSchema } from "./esquemas";

/**
 * Capacitación: la ruta de cada plaza, la evaluación y la certificación.
 *
 * La evaluación se califica aquí; las respuestas correctas nunca salen de la
 * API. Aprobarla certifica por un año y, desde la siguiente petición, la plaza
 * se puede vender.
 */
export async function rutasCapacitacion(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  const moduloSchema = z.object({
    id: z.string(),
    plazaId: z.string(),
    orden: z.number(),
    titulo: z.string(),
    tipo: z.enum(["video", "documento"]),
    detalle: z.string(),
    url: z.string().nullable(),
    ejemplo: z.boolean(),
  });
  const intentoSchema = z.object({
    plazaId: z.string(),
    aciertos: z.number(),
    total: z.number(),
    aprobado: z.boolean(),
    fechaIso: z.string(),
  });
  const plazaSchema = z.object({
    plazaId: z.string(),
    estado: z.enum(["certificado", "vencido", "en_progreso", "no_iniciado"]),
    avance: z.number(),
    modulos: z.array(z.object({ modulo: moduloSchema, completado: z.boolean() })),
    puedeEvaluarse: z.boolean(),
    ultimoIntento: intentoSchema.nullable(),
    venceIso: z.string().nullable(),
  });
  const idPlaza = z.object({ plazaId: z.string().meta({ example: "puebla" }) });

  async function estadoDe(usuarioId: string, plazaId: string) {
    const [modulos, avance] = await Promise.all([datos.modulosCapacitacion(), datos.avanceDe(usuarioId)]);
    return estadoDePlaza(plazaId, modulos, avance, new Date());
  }

  app.get(
    "/capacitacion",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Capacitación"],
        summary: "Mi avance por plaza",
        description: "Para cada plaza activa con contenido: módulos, avance, último intento y vigencia.",
        response: {
          200: z.object({
            plazas: z.array(plazaSchema),
            preparacion: z.array(z.object({ desarrolloId: z.string(), items: z.array(z.string()) })),
            listaPreparacion: z.array(z.object({ clave: z.string(), texto: z.string() })),
          }),
        },
      },
    },
    async (peticion) => {
      const [modulos, avance, plazas] = await Promise.all([
        datos.modulosCapacitacion(),
        datos.avanceDe(peticion.user.id),
        datos.listarPlazas(),
      ]);
      const hoy = new Date();
      return {
        plazas: plazas
          .filter((p) => p.activa && modulos.some((m) => m.plazaId === p.id))
          .map((p) => estadoDePlaza(p.id, modulos, avance, hoy)),
        preparacion: avance.preparacion,
        listaPreparacion: PREPARACION,
      };
    },
  );

  app.post(
    "/capacitacion/modulos/:id/completar",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Capacitación"],
        summary: "Marcar un módulo como visto",
        params: z.object({ id: z.string() }),
        response: { 200: plazaSchema, 404: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const modulo = (await datos.modulosCapacitacion()).find((m) => m.id === peticion.params.id);
      if (!modulo) return respuesta.code(404).send({ error: "Módulo no encontrado" });
      await datos.completarModulo(peticion.user.id, modulo.id);
      olvidarUsuario(peticion.user.id);
      return estadoDe(peticion.user.id, modulo.plazaId);
    },
  );

  app.get(
    "/capacitacion/:plazaId/evaluacion",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Capacitación"],
        summary: "Preguntas de la evaluación",
        description: "Sin las respuestas. Se abre cuando se completaron todos los módulos de la plaza.",
        params: idPlaza,
        response: {
          200: z.object({
            preguntas: z.array(
              z.object({ id: z.string(), plazaId: z.string(), orden: z.number(), texto: z.string(), opciones: z.array(z.string()) }),
            ),
          }),
          409: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      const estado = await estadoDe(peticion.user.id, peticion.params.plazaId);
      if (estado.estado === "certificado") return respuesta.code(409).send({ error: "Ya estás certificado en esta plaza." });
      if (!estado.puedeEvaluarse) return respuesta.code(409).send({ error: "Termina los módulos de la plaza primero." });
      const preguntas = await datos.preguntasDe(peticion.params.plazaId);
      return { preguntas: preguntas.map(publica) };
    },
  );

  app.post(
    "/capacitacion/:plazaId/evaluacion",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Capacitación"],
        summary: "Presentar la evaluación",
        description: "Se califica en el servidor. Con 80 % o más, certifica la plaza por doce meses.",
        params: idPlaza,
        body: z.object({
          respuestas: z.record(z.string(), z.number().int().min(0)).meta({
            description: "Id de la pregunta → índice de la opción elegida.",
          }),
        }),
        response: {
          200: z.object({
            aciertos: z.number(),
            total: z.number(),
            aprobado: z.boolean(),
            fallidas: z.array(z.string()).meta({ description: "Las preguntas que hay que repasar (sin su respuesta)." }),
            certificadoHasta: z.string().nullable(),
          }),
          409: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      const { plazaId } = peticion.params;
      const estado = await estadoDe(peticion.user.id, plazaId);
      if (estado.estado === "certificado") return respuesta.code(409).send({ error: "Ya estás certificado en esta plaza." });
      if (!estado.puedeEvaluarse) return respuesta.code(409).send({ error: "Termina los módulos de la plaza primero." });

      const resultado = calificar(await datos.preguntasDe(plazaId), peticion.body.respuestas);
      const ahora = new Date();
      await datos.registrarIntento(peticion.user.id, {
        plazaId,
        aciertos: resultado.aciertos,
        total: resultado.total,
        aprobado: resultado.aprobado,
        fechaIso: ahora.toISOString(),
      });

      let certificadoHasta: string | null = null;
      if (resultado.aprobado) {
        certificadoHasta = venceDesde(ahora);
        await datos.certificar(peticion.user.id, plazaId, certificadoHasta);
        olvidarUsuario(peticion.user.id);
        app.log.info({ usuario: peticion.user.id, plaza: plazaId }, "Certificación aprobada");
      }
      return { ...resultado, certificadoHasta };
    },
  );

  app.put(
    "/capacitacion/preparacion/:desarrolloId",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Capacitación"],
        summary: "Lo que ya revisé de un desarrollo",
        params: z.object({ desarrolloId: z.string() }),
        body: z.object({ items: z.array(z.string()) }),
        response: { 200: z.object({ items: z.array(z.string()) }), 404: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      if (!(await datos.obtenerDesarrollo(peticion.params.desarrolloId))) {
        return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      }
      const validos = PREPARACION.map((p) => p.clave);
      const items = [...new Set(peticion.body.items.filter((i) => validos.includes(i)))];
      await datos.guardarPreparacion(peticion.user.id, peticion.params.desarrolloId, items);
      return { items };
    },
  );
}
