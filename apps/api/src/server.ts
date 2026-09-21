import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { config, modoMock } from "./config";
import { origenConfigurado } from "./datos";
import { rutas } from "./rutas";
import { rutasPdf } from "./rutas-pdf";
import { cerrarNavegador } from "./pdf/navegador";

/**
 * API de Casa Cruz OS.
 *
 * Servicio independiente: se despliega en su propio servidor y la web lo
 * consume por HTTP. La documentación se genera de los mismos esquemas que
 * validan cada petición, así que no puede quedar desactualizada: se lee en /docs.
 */

export async function construirServidor() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: config.corsOrigin });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Casa Cruz OS — API",
        version: "0.1.0",
        description: [
          "Base Maestra de producto, conocimiento comercial y propuestas de Casa Cruz.",
          "",
          "Dos reglas atraviesan todo el servicio:",
          "",
          "1. **Un dato que no existe no se inventa.** Los campos sin capturar viajan como `null` y la interfaz los muestra como `[CAMPO]`.",
          "2. **Nada cambia sin dejar rastro.** Cada modificación queda con su autor, su fecha, el valor anterior y la fuente que la respalda; los campos sensibles esperan aprobación.",
        ].join("\n"),
        contact: { name: "Casa Cruz OS" },
      },
      servers: [
        { url: "http://localhost:4000", description: "Desarrollo" },
        { url: "https://api.casacruz.mx", description: "Producción (pendiente)" },
      ],
      tags: [
        { name: "Servicio", description: "Estado y diagnóstico." },
        { name: "Inventario", description: "Desarrollos, tipologías, precios y confiabilidad." },
        { name: "Personas", description: "Equipo comercial, clientes y leads de Kommo." },
        { name: "Propuestas", description: "Lo que se le arma y se le envía al cliente." },
        {
          name: "Gobierno del dato",
          description: "Historial, validaciones y cola de aprobación.",
        },
        { name: "Documentos", description: "Fichas y análisis en PDF, listos para enviar." },
      ],
    },
    transform: jsonSchemaTransform,
    // Publica los modelos con nombre (Desarrollo, Cliente, Propuesta…) en vez de
    // repetirlos dentro de cada ruta.
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(scalar, {
    routePrefix: "/docs",
    configuration: {
      title: "Casa Cruz OS — API",
      theme: "default",
      darkMode: true,
    },
  });

  await app.register(rutas);
  await app.register(rutasPdf);

  app.addHook("onClose", async () => {
    await cerrarNavegador();
  });

  return app;
}

const esEjecucionDirecta = process.argv[1]?.includes("server");

if (esEjecucionDirecta) {
  const app = await construirServidor();
  try {
    await app.listen({ port: config.puerto, host: config.host });
    app.log.info(`Origen de datos: ${origenConfigurado}`);
    app.log.info(`Documentación: http://localhost:${config.puerto}/docs`);
    if (modoMock) {
      app.log.warn("Sin DATABASE_URL: datos de demostración, las escrituras no se guardan.");
    }
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
