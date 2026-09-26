import { z } from "zod";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { Multimedia } from "@casacruz/core";
import {
  TIPOS_PERMITIDOS,
  almacenamientoConfigurado,
  almacenamientoLocal,
  borrarArchivo,
  claveDeArchivo,
  leerArchivoLocal,
  subirArchivo,
} from "./almacenamiento";
import { exigir } from "./auth";
import { fuente } from "./datos";
import { errorSchema, fuenteTipo } from "./esquemas";

/**
 * Carga de renders, planos, fotos, brochures y evidencias.
 *
 * Sin material real, los documentos salen con marcadores grises; esto es lo que
 * los llena. El archivo va al bucket y lo que se guarda en la Base Maestra es su
 * URL, nunca el binario.
 */

const LIMITE_BYTES = 15 * 1024 * 1024;

const tipoMultimedia = z.enum(["foto", "render", "plano", "video", "brochure", "mapa"]);

const multimediaSchema = z.object({
  tipo: tipoMultimedia,
  url: z.string(),
  orden: z.number(),
});

const SIN_BUCKET =
  "El bucket de archivos no está configurado. Falta S3_ENDPOINT, S3_BUCKET y las credenciales.";

/** Lee el único archivo de la petición y valida tipo y tamaño. */
async function recibirArchivo(
  peticion: FastifyRequest,
  respuesta: FastifyReply,
): Promise<{ contenido: Buffer; tipo: string; nombre: string } | null> {
  const archivo = await peticion.file({ limits: { fileSize: LIMITE_BYTES } });
  if (!archivo) {
    respuesta.code(400).send({ error: "Falta el archivo" });
    return null;
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {
    respuesta.code(400).send({ error: `Tipo no permitido: ${archivo.mimetype}`, detalle: TIPOS_PERMITIDOS });
    return null;
  }
  const contenido = await archivo.toBuffer();
  if (archivo.file.truncated) {
    respuesta.code(400).send({ error: "El archivo pasa de 15 MB" });
    return null;
  }
  return { contenido, tipo: archivo.mimetype, nombre: archivo.filename };
}

export async function rutasArchivos(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  app.post(
    "/archivos",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Archivos"],
        summary: "Subir una evidencia o un documento",
        description:
          "multipart/form-data con el campo `archivo`. Devuelve la URL que se adjunta después a un cambio (`evidenciaUrl`) o a la documentación legal del desarrollo. Máximo 15 MB.",
        querystring: z.object({ proposito: z.enum(["evidencia", "documento"]).default("evidencia") }),
        response: {
          201: z.object({ url: z.string(), nombre: z.string(), bytes: z.number(), tipo: z.string() }),
          400: errorSchema,
          503: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      if (!almacenamientoConfigurado) return respuesta.code(503).send({ error: SIN_BUCKET });

      const archivo = await recibirArchivo(peticion, respuesta);
      if (!archivo) return respuesta;

      const mes = new Date().toISOString().slice(0, 7);
      const carpeta = `${peticion.query.proposito === "documento" ? "documentos" : "evidencias"}/${mes}`;
      const url = await subirArchivo(
        claveDeArchivo(carpeta, peticion.user.id, archivo.tipo),
        archivo.contenido,
        archivo.tipo,
      );

      return respuesta
        .code(201)
        .send({ url, nombre: archivo.nombre, bytes: archivo.contenido.length, tipo: archivo.tipo });
    },
  );

  app.post(
    "/desarrollos/:id/multimedia",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Archivos"],
        summary: "Subir una imagen o documento del desarrollo",
        description:
          "multipart/form-data con el campo `archivo`. El orden decide dónde aparece en la ficha y en el análisis: la primera foto o render es la fachada. Sin `orden`, queda al final. Máximo 15 MB.",
        params: z.object({ id: z.string() }),
        querystring: z.object({
          tipo: tipoMultimedia.default("foto"),
          orden: z.coerce.number().int().min(0).optional(),
        }),
        response: {
          201: z.object({ multimedia: z.array(multimediaSchema) }),
          400: errorSchema,
          404: errorSchema,
          503: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      if (!almacenamientoConfigurado) return respuesta.code(503).send({ error: SIN_BUCKET });

      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const archivo = await recibirArchivo(peticion, respuesta);
      if (!archivo) return respuesta;

      const clave = claveDeArchivo(`desarrollos/${desarrollo.id}`, peticion.query.tipo, archivo.tipo);
      const url = await subirArchivo(clave, archivo.contenido, archivo.tipo);

      const actuales = desarrollo.multimedia ?? [];
      const orden =
        peticion.query.orden ?? (actuales.length ? Math.max(...actuales.map((m) => m.orden)) + 1 : 0);
      const item: Multimedia = { tipo: peticion.query.tipo, url, orden };
      const multimedia = await datos.agregarMultimedia(desarrollo.id, item);

      app.log.info({ desarrollo: desarrollo.id, clave }, "Archivo subido");
      return respuesta.code(201).send({ multimedia: multimedia ?? [item] });
    },
  );

  app.put(
    "/desarrollos/:id/multimedia/orden",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Archivos"],
        summary: "Reordenar la multimedia",
        description: "La primera foto o render queda como fachada en la ficha, el análisis y el micrositio.",
        params: z.object({ id: z.string() }),
        body: z.object({ urls: z.array(z.string()).min(1) }),
        response: { 200: z.object({ multimedia: z.array(multimediaSchema) }), 404: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const multimedia = await datos.ordenarMultimedia(peticion.params.id, peticion.body.urls);
      if (!multimedia) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      return { multimedia };
    },
  );

  app.post(
    "/desarrollos/:id/documentos",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Archivos"],
        summary: "Subir documentación legal o comercial",
        description:
          "multipart/form-data con el campo `archivo`: convenio, contrato, lista de precios. Queda en la información interna, que no viaja a fichas ni propuestas.",
        params: z.object({ id: z.string() }),
        querystring: z.object({
          tipo: fuenteTipo.default("otro"),
          nombre: z.string().trim().min(2).max(120).optional(),
        }),
        response: {
          201: z.object({
            documentos: z.array(
              z.object({
                nombre: z.string(),
                tipo: fuenteTipo,
                cargadoHaceDias: z.number(),
                url: z.string().nullable(),
              }),
            ),
          }),
          400: errorSchema,
          404: errorSchema,
          503: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      if (!almacenamientoConfigurado) return respuesta.code(503).send({ error: SIN_BUCKET });
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const archivo = await recibirArchivo(peticion, respuesta);
      if (!archivo) return respuesta;

      const url = await subirArchivo(
        claveDeArchivo(`desarrollos/${desarrollo.id}/documentos`, peticion.query.tipo, archivo.tipo),
        archivo.contenido,
        archivo.tipo,
      );
      const documentos = await datos.agregarDocumento(desarrollo.id, {
        nombre: peticion.query.nombre ?? archivo.nombre,
        tipo: peticion.query.tipo,
        url,
      });
      return respuesta.code(201).send({ documentos: documentos ?? [] });
    },
  );

  app.delete(
    "/desarrollos/:id/multimedia",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Archivos"],
        summary: "Quitar un archivo del desarrollo",
        description: "Lo borra del bucket y del registro.",
        params: z.object({ id: z.string() }),
        body: z.object({ url: z.string().min(4) }),
        response: {
          200: z.object({ multimedia: z.array(multimediaSchema) }),
          404: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      const multimedia = await datos.eliminarMultimedia(peticion.params.id, peticion.body.url);
      if (!multimedia) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      if (almacenamientoConfigurado) {
        await borrarArchivo(peticion.body.url).catch((error) => {
          app.log.error({ error }, "No se pudo borrar el archivo del bucket");
        });
      }
      return { multimedia };
    },
  );

  // Sólo en desarrollo sin bucket: la API sirve lo que guardó en disco.
  if (almacenamientoLocal) {
    app.get(
      "/archivos/*",
      { schema: { hide: true } },
      async (peticion, respuesta) => {
        const clave = (peticion.params as { "*": string })["*"];
        const archivo = await leerArchivoLocal(clave);
        if (!archivo) return respuesta.code(404).send({ error: "Archivo no encontrado" });
        return respuesta
          .type(archivo.tipo)
          .header("cache-control", "public, max-age=3600")
          .send(archivo.contenido);
      },
    );
  }
}
