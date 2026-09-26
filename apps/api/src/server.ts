import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import type { Sesion } from "./auth";
import { config, jwtInseguro, modoMock } from "./config";
import { origenConfigurado } from "./datos";
import { almacenamientoConfigurado, almacenamientoLocal, DIRECTORIO_LOCAL } from "./almacenamiento";
import { kommoConfigurado } from "./kommo";
import { rutas } from "./rutas";
import { rutasArchivos } from "./rutas-archivos";
import { rutasEscritura } from "./rutas-escritura";
import { rutasPdf } from "./rutas-pdf";
import { rutasSesion } from "./rutas-sesion";
import { cerrarNavegador } from "./pdf/navegador";

/**
 * API de Casa Cruz OS.
 *
 * Servicio independiente: se despliega en su propio servidor y la web lo
 * consume por HTTP. La documentación se genera de los mismos esquemas que
 * validan cada petición, así que no puede quedar desactualizada: se lee en /docs.
 */

export async function construirServidor() {
  // Detrás del proxy de Railway, la IP real del visitante viene en x-forwarded-for.
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" }, trustProxy: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(jwt, { secret: config.jwtSecret });
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 1 } });
  await app.register(rateLimit, {
    max: Number(process.env.LIMITE_PETICIONES ?? 300),
    timeWindow: "1 minute",
    // Toda la web llega desde el mismo servidor: contar por IP la ahogaría. Con
    // sesión se cuenta por usuario; sin ella, por la IP del visitante.
    keyGenerator: (peticion) => {
      const encabezado = peticion.headers.authorization;
      if (encabezado?.startsWith("Bearer ")) {
        try {
          return `u:${app.jwt.verify<Sesion>(encabezado.slice(7)).id}`;
        } catch {
          // Token inválido: cuenta como anónimo.
        }
      }
      return peticion.ip;
    },
  });

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
        { name: "Sesión", description: "Entrar y saber con qué rol." },
        { name: "Alta de producto", description: "Crear, editar y publicar desarrollos." },
        { name: "Comercial", description: "Clientes y generación de propuestas." },
        { name: "Archivos", description: "Renders, planos y fotos en el bucket." },
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

  await app.register(rutasSesion);
  await app.register(rutas);
  await app.register(rutasEscritura);
  await app.register(rutasArchivos);
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
      app.log.warn("Sin DATABASE_URL: datos de demostración, las escrituras se pierden al reiniciar.");
    }
    if (almacenamientoLocal) {
      app.log.warn(`Sin bucket: los archivos se guardan en ${DIRECTORIO_LOCAL} (sólo desarrollo).`);
    } else if (!almacenamientoConfigurado) {
      app.log.warn("Sin bucket configurado: la carga de imágenes responde 503.");
    }
    if (!kommoConfigurado) {
      app.log.warn("Sin Kommo configurado: las propuestas no escriben nota en el lead.");
    }
    if (jwtInseguro) {
      app.log.error("JWT_SECRET sin definir en producción: los tokens se firman con la clave de desarrollo.");
    }
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
