import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { Multimedia } from "@casacruz/core";
import {
  TIPOS_PERMITIDOS,
  almacenamientoConfigurado,
  borrarArchivo,
  claveDeArchivo,
  subirArchivo,
} from "./almacenamiento";
import { exigir } from "./auth";
import { fuente } from "./datos";
import { errorSchema } from "./esquemas";

/**
 * Carga de renders, planos, fotos y brochures.
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

export async function rutasArchivos(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  app.post(
    "/desarrollos/:id/multimedia",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Archivos"],
        summary: "Subir una imagen o documento del desarrollo",
        description:
          "multipart/form-data con el campo `archivo`. El orden decide dónde aparece en la ficha y en el análisis: el primero es la fachada o el render principal. Máximo 15 MB.",
        params: z.object({ id: z.string() }),
        querystring: z.object({
          tipo: tipoMultimedia.default("foto"),
          orden: z.coerce.number().int().min(0).default(0),
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
      if (!almacenamientoConfigurado) {
        return respuesta.code(503).send({
          error:
            "El bucket de archivos no está configurado. Falta S3_ENDPOINT, S3_BUCKET y las credenciales.",
        });
      }

      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const archivo = await peticion.file({ limits: { fileSize: LIMITE_BYTES } });
      if (!archivo) return respuesta.code(400).send({ error: "Falta el archivo" });

      if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {
        return respuesta.code(400).send({
          error: `Tipo no permitido: ${archivo.mimetype}`,
          detalle: TIPOS_PERMITIDOS,
        });
      }

      const contenido = await archivo.toBuffer();
      if (archivo.file.truncated) {
        return respuesta.code(400).send({ error: "El archivo pasa de 15 MB" });
      }

      const clave = claveDeArchivo(desarrollo.id, peticion.query.tipo, archivo.mimetype);
      const url = await subirArchivo(clave, contenido, archivo.mimetype);

      const item: Multimedia = { tipo: peticion.query.tipo, url, orden: peticion.query.orden };
      const multimedia = await datos.agregarMultimedia(desarrollo.id, item);

      app.log.info({ desarrollo: desarrollo.id, clave }, "Archivo subido");
      return respuesta.code(201).send({ multimedia: multimedia ?? [item] });
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
}
