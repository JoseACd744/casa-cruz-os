import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { fuente } from "./datos";
import { analisisHtml, ANALISIS_ALTO, ANALISIS_ANCHO } from "./pdf/analisis";
import { fichaHtml, FICHA_ALTO, FICHA_ANCHO } from "./pdf/ficha";
import { imprimir } from "./pdf/navegador";

/**
 * Documentos en PDF.
 *
 * Se arman aquí, no en la web: la API es la que sabe los datos y la que puede
 * adjuntarlos a un correo o mandarlos a Kommo sin que nadie abra el navegador.
 * Con `?html=1` se devuelve el HTML, útil para ajustar el diseño.
 */
export async function rutasPdf(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  const formato = z.object({
    html: z.enum(["0", "1"]).optional(),
  });

  function nombreArchivo(base: string): string {
    return base
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase();
  }

  app.get(
    "/pdf/ficha/:id",
    {
      schema: {
        tags: ["Documentos"],
        summary: "Ficha de propiedad en PDF",
        description:
          "Formato Casa Cruz de una página (1440 × 810 pt), con la tipografía embebida. Devuelve application/pdf.",
        params: z.object({ id: z.string().meta({ example: "playa-park" }) }),
        querystring: formato.extend({
          tipologia: z.string().optional().meta({ description: "Id de la tipología a mostrar." }),
        }),
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      const tipologia =
        desarrollo.tipologias.find((t) => t.id === peticion.query.tipologia) ??
        desarrollo.tipologias[0];
      const html = fichaHtml(desarrollo, tipologia);

      if (peticion.query.html === "1") {
        return respuesta.type("text/html; charset=utf-8").send(html);
      }

      const pdf = await imprimir(html, { ancho: FICHA_ANCHO, alto: FICHA_ALTO });
      return respuesta
        .type("application/pdf")
        .header(
          "content-disposition",
          `inline; filename="ficha-${nombreArchivo(desarrollo.nombre)}.pdf"`,
        )
        .send(pdf);
    },
  );

  app.get(
    "/pdf/analisis/:slug",
    {
      schema: {
        tags: ["Documentos"],
        summary: "Análisis de propiedades en PDF",
        description:
          "El documento que recibe el cliente: portada, un bloque por desarrollo con sus tipologías y precios, esquema de pago y mapa. Tamaño carta. Devuelve application/pdf.",
        params: z.object({ slug: z.string().meta({ example: "berenice-fabian" }) }),
        querystring: formato,
      },
    },
    async (peticion, respuesta) => {
      const propuesta = await datos.obtenerPropuesta(peticion.params.slug);
      if (!propuesta) return respuesta.code(404).send({ error: "Propuesta no encontrada" });

      const cliente = await datos.obtenerCliente(propuesta.clienteId);
      const usuarios = await datos.listarUsuarios();
      const asesor = usuarios.find((u) => u.id === propuesta.usuarioId)?.nombre ?? "Casa Cruz";

      const desarrollos = [];
      for (const item of propuesta.items) {
        const d = await datos.obtenerDesarrollo(item.desarrolloId);
        if (d) desarrollos.push(d);
      }

      const html = analisisHtml(propuesta, cliente, desarrollos, asesor);

      if (peticion.query.html === "1") {
        return respuesta.type("text/html; charset=utf-8").send(html);
      }

      const pdf = await imprimir(html, { ancho: ANALISIS_ANCHO, alto: ANALISIS_ALTO });
      return respuesta
        .type("application/pdf")
        .header(
          "content-disposition",
          `inline; filename="analisis-${nombreArchivo(cliente?.nombre ?? propuesta.slug)}.pdf"`,
        )
        .send(pdf);
    },
  );
}
