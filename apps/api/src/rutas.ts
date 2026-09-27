import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  confiabilidad,
  enlaceKommo,
  enlaceWhatsApp,
  estadoValidaciones,
  textoDeInteres,
  type Cliente,
} from "@casacruz/core";
import { exigir, sesionOpcional } from "./auth";
import { desarrolloSegunRol, desarrollosSegunRol } from "./visibilidad";
import { almacenamientoConfigurado, almacenamientoLocal } from "./almacenamiento";
import { config, modoMock } from "./config";
import { bitacoraCsv, registrarCambio, resolverCambio } from "./gobierno";
import { escribirNotaEnKommo, kommoConfigurado } from "./kommo";
import { fuente, origenConfigurado } from "./datos";
import {
  cambioSchema,
  clienteSchema,
  confiabilidadSchema,
  desarrolloSchema,
  errorSchema,
  estadoCambio,
  filtrosInventarioSchema,
  novedadSchema,
  nuevaValidacionSchema,
  nuevoCambioSchema,
  pipelineSchema,
  plazaSchema,
  propuestaPublicaSchema,
  propuestaSchema,
  respuestaCambioSchema,
  saludSchema,
  usuarioSchema,
} from "./esquemas";

/** Todas las rutas del servicio, con su documentación. */
export async function rutas(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  const idDesarrollo = z.object({ id: z.string().meta({ example: "playa-park" }) });
  /** El enlace al lead se arma aquí: depende de la cuenta de Kommo, no del cliente. */
  const conKommo = (c: Cliente): Cliente => ({ ...c, kommoUrl: enlaceKommo(config.kommo.subdominio, c.kommoLeadId) });
  const noEncontrado = { 404: errorSchema };

  // ── Servicio ───────────────────────────────────────────────────────────
  app.get(
    "/salud",
    {
      schema: {
        tags: ["Servicio"],
        summary: "Estado del servicio",
        description:
          "Dice de dónde salen los datos. Mientras no exista DATABASE_URL, responde con los datos de demostración y lo avisa.",
        response: { 200: saludSchema },
      },
    },
    async () => ({
      ok: true,
      servicio: "casa-cruz-os-api",
      origenDeDatos: datos.nombre,
      configurado: origenConfigurado,
      aviso: modoMock
        ? "Sin DATABASE_URL: los datos son de demostración y las escrituras no se guardan."
        : null,
      integraciones: {
        archivos: almacenamientoLocal
          ? ("local" as const)
          : almacenamientoConfigurado
            ? ("bucket" as const)
            : ("sin_configurar" as const),
        kommo: kommoConfigurado,
        mapas: config.googleMapsKey ? ("google" as const) : ("openstreetmap" as const),
      },
    }),
  );

  app.get(
    "/openapi.json",
    {
      schema: {
        tags: ["Servicio"],
        summary: "Especificación OpenAPI",
        description: "Para importar la API en Postman, Insomnia o n8n.",
      },
    },
    async () => instancia.swagger(),
  );

  // ── Inventario ─────────────────────────────────────────────────────────
  app.get(
    "/plazas",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Inventario"],
        summary: "Plazas donde opera Casa Cruz",
        response: { 200: z.array(plazaSchema) },
      },
    },
    async () => datos.listarPlazas(),
  );

  app.get(
    "/desarrollos",
    {
      schema: {
        tags: ["Inventario"],
        summary: "Buscar desarrollos",
        description:
          "Un desarrollo sin precio capturado no se descarta al filtrar por presupuesto: aparece marcado, porque eso es justo lo que hay que corregir.",
        querystring: filtrosInventarioSchema,
        response: { 200: z.array(desarrolloSchema) },
      },
    },
    async (peticion) => {
      const sesion = await sesionOpcional(peticion);
      return desarrollosSegunRol(await datos.listarDesarrollos(peticion.query), sesion?.rol ?? null);
    },
  );

  app.get(
    "/desarrollos/:id",
    {
      schema: {
        tags: ["Inventario"],
        summary: "Un desarrollo completo",
        params: idDesarrollo,
        response: { 200: desarrolloSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      const sesion = await sesionOpcional(peticion);
      return desarrolloSegunRol(desarrollo, sesion?.rol ?? null);
    },
  );

  app.get(
    "/desarrollos/:id/confiabilidad",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Inventario", "Gobierno del dato"],
        summary: "Confiabilidad del desarrollo",
        description:
          "Cada campo pesa distinto y caduca a distinto ritmo: precio y disponibilidad a los 15 días, promoción y entrega a los 30, comisión a los 90.",
        params: idDesarrollo,
        response: { 200: confiabilidadSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
      return { valor: confiabilidad(desarrollo), campos: estadoValidaciones(desarrollo) };
    },
  );

  app.get(
    "/pipeline",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Inventario"],
        summary: "Conteo por etapa de alta",
        response: { 200: pipelineSchema },
      },
    },
    async () => datos.conteoPipeline(),
  );

  app.get(
    "/novedades",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Inventario"],
        summary: "Últimos cambios publicados",
        response: { 200: z.array(novedadSchema) },
      },
    },
    async () => datos.novedades(),
  );

  // ── Personas ───────────────────────────────────────────────────────────
  app.get(
    "/usuarios",
    {
      preHandler: exigir("gerente"),
      schema: {
        tags: ["Personas"],
        summary: "Equipo comercial",
        response: { 200: z.array(usuarioSchema) },
      },
    },
    async () => datos.listarUsuarios(),
  );

  app.get(
    "/usuarios/actual",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Personas"],
        summary: "Usuario de la sesión",
        description: "Provisional: todavía no hay autenticación, devuelve el primer cerrador activo.",
        response: { 200: usuarioSchema },
      },
    },
    async (peticion) => {
      const usuarios = await datos.listarUsuarios();
      return usuarios.find((u) => u.id === peticion.user.id) ?? datos.obtenerUsuarioActual();
    },
  );

  app.get(
    "/clientes",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Personas"],
        summary: "Clientes y leads",
        response: { 200: z.array(clienteSchema) },
      },
    },
    async () => (await datos.listarClientes()).map(conKommo),
  );

  app.get(
    "/clientes/:id",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Personas"],
        summary: "Un cliente",
        params: z.object({ id: z.string() }),
        response: { 200: clienteSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const cliente = await datos.obtenerCliente(peticion.params.id);
      if (!cliente) return respuesta.code(404).send({ error: "Cliente no encontrado" });
      return conKommo(cliente);
    },
  );

  // ── Propuestas ─────────────────────────────────────────────────────────
  app.get(
    "/propuestas",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Propuestas"],
        summary: "Propuestas generadas",
        response: { 200: z.array(propuestaSchema) },
      },
    },
    async () => datos.listarPropuestas(),
  );

  app.get(
    "/propuestas/:slug",
    {
      schema: {
        tags: ["Propuestas"],
        summary: "Una propuesta por su enlace",
        description: "Es lo que consume el micrositio público propuestas.casacruz.mx/[slug].",
        params: z.object({ slug: z.string().meta({ example: "berenice-fabian" }) }),
        response: { 200: propuestaSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const propuesta = await datos.obtenerPropuesta(peticion.params.slug);
      if (!propuesta) return respuesta.code(404).send({ error: "Propuesta no encontrada" });
      return propuesta;
    },
  );

  app.get(
    "/propuestas/:slug/publica",
    {
      schema: {
        tags: ["Propuestas"],
        summary: "Todo lo que ve el cliente en su enlace",
        description:
          "Pública, sin sesión: la propuesta, el nombre del cliente, el asesor que la firma y los desarrollos en su versión para cliente. Una sola llamada para el micrositio.",
        params: z.object({ slug: z.string().meta({ example: "berenice-fabian" }) }),
        response: { 200: propuestaPublicaSchema, ...noEncontrado },
      },
    },
    async (peticion, respuesta) => {
      const propuesta = await datos.obtenerPropuesta(peticion.params.slug);
      if (!propuesta) return respuesta.code(404).send({ error: "Propuesta no encontrada" });

      const [cliente, usuarios, plazas] = await Promise.all([
        datos.obtenerCliente(propuesta.clienteId),
        datos.listarUsuarios(),
        datos.listarPlazas(),
      ]);
      const asesor = usuarios.find((u) => u.id === propuesta.usuarioId);

      const desarrollos = [];
      for (const item of propuesta.items) {
        const d = await datos.obtenerDesarrollo(item.desarrolloId);
        if (d) desarrollos.push(desarrolloSegunRol(d, null));
      }

      return {
        // El lead de Kommo es del equipo, no del cliente.
        propuesta: { ...propuesta, kommoLeadId: null },
        cliente: cliente ? { nombre: cliente.nombre, recamaras: cliente.recamaras } : null,
        asesor: asesor
          ? {
              nombre: asesor.nombre,
              correo: asesor.correo,
              telefono: asesor.telefono,
              plazas: asesor.plazasCertificadas.map(
                (id) => plazas.find((p) => p.id === id)?.nombre ?? id,
              ),
            }
          : null,
        desarrollos,
      };
    },
  );

  app.post(
    "/propuestas/:slug/vista",
    {
      schema: {
        tags: ["Propuestas"],
        summary: "Registrar que el cliente abrió su propuesta",
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({ slug: z.string(), vistas: z.number() }),
          ...noEncontrado,
        },
      },
    },
    async (peticion, respuesta) => {
      const propuesta = await datos.obtenerPropuesta(peticion.params.slug);
      if (!propuesta) return respuesta.code(404).send({ error: "Propuesta no encontrada" });
      const vistas = await datos.sumarVistaPropuesta(peticion.params.slug);

      // La primera apertura es la señal para dar seguimiento: queda en la actividad y en Kommo.
      if (vistas === 1) {
        const texto = "Abrió su propuesta por primera vez.";
        await datos.registrarActividad(propuesta.clienteId, texto);
        void escribirNotaEnKommo(propuesta.kommoLeadId, `Casa Cruz OS: el cliente ${texto.toLowerCase()}`, app.log, {
          propuesta: propuesta.slug,
        });
      }
      return { slug: peticion.params.slug, vistas };
    },
  );

  app.post(
    "/propuestas/:slug/interes",
    {
      schema: {
        tags: ["Propuestas"],
        summary: "El cliente pide conocer una propiedad o hablar con su asesor",
        description:
          "Pública, desde el micrositio. Queda en la actividad del cliente y como nota en su lead de Kommo, y devuelve el enlace de WhatsApp con el asesor si tiene teléfono.",
        params: z.object({ slug: z.string() }),
        body: z.object({
          accion: z.enum(["conocer", "videollamada", "asesor"]),
          desarrolloId: z.string().nullish(),
        }),
        response: {
          200: z.object({ mensaje: z.string(), whatsapp: z.string().nullable() }),
          400: errorSchema,
          ...noEncontrado,
        },
      },
    },
    async (peticion, respuesta) => {
      const propuesta = await datos.obtenerPropuesta(peticion.params.slug);
      if (!propuesta) return respuesta.code(404).send({ error: "Propuesta no encontrada" });

      const { accion, desarrolloId } = peticion.body;
      if (desarrolloId && !propuesta.items.some((i) => i.desarrolloId === desarrolloId)) {
        return respuesta.code(400).send({ error: "Esa propiedad no está en la propuesta" });
      }

      const [desarrollo, cliente, usuarios] = await Promise.all([
        desarrolloId ? datos.obtenerDesarrollo(desarrolloId) : Promise.resolve(null),
        datos.obtenerCliente(propuesta.clienteId),
        datos.listarUsuarios(),
      ]);
      const asesor = usuarios.find((u) => u.id === propuesta.usuarioId);
      const texto = textoDeInteres(accion, desarrollo?.nombre);

      await datos.registrarActividad(propuesta.clienteId, texto);
      void escribirNotaEnKommo(propuesta.kommoLeadId, `Casa Cruz OS: ${texto}`, app.log, {
        propuesta: propuesta.slug,
      });

      const saludo = [
        `Hola${asesor ? ` ${asesor.nombre.split(" ")[0]}` : ""}`,
        cliente && !cliente.nombre.startsWith("[") ? `, soy ${cliente.nombre.split(" y ")[0]}` : "",
        ". Vi la propuesta de Casa Cruz",
        desarrollo ? ` y me interesa ${desarrollo.nombre}` : "",
        ".",
      ].join("");

      return {
        mensaje: asesor
          ? `Listo: ${asesor.nombre} ya sabe que te interesa y te contactará.`
          : "Listo: tu asesor ya sabe que te interesa y te contactará.",
        whatsapp: enlaceWhatsApp(asesor?.telefono ?? null, saludo),
      };
    },
  );

  // ── Gobierno del dato ──────────────────────────────────────────────────
  app.get(
    "/cambios",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Gobierno del dato"],
        summary: "Historial y cola de aprobación",
        querystring: z.object({ estado: estadoCambio.optional() }),
        response: { 200: z.array(cambioSchema) },
      },
    },
    async (peticion) => datos.listarCambios(peticion.query.estado),
  );

  app.get(
    "/desarrollos/:id/cambios",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Gobierno del dato"],
        summary: "Historial de un desarrollo",
        params: idDesarrollo,
        response: { 200: z.array(cambioSchema) },
      },
    },
    async (peticion) => datos.cambiosDe(peticion.params.id),
  );

  app.get(
    "/cambios/exportar",
    {
      preHandler: exigir("gerente"),
      schema: {
        tags: ["Gobierno del dato"],
        summary: "Bitácora completa en CSV",
        description: "Para auditoría: quién cambió qué, cuándo, con qué fuente y quién lo aprobó. Se abre en Excel.",
        produces: ["text/csv"],
      },
    },
    async (_peticion, respuesta) => {
      const hoy = new Date().toISOString().slice(0, 10);
      return respuesta
        .type("text/csv; charset=utf-8")
        .header("content-disposition", `attachment; filename="bitacora-casa-cruz-${hoy}.csv"`)
        .send(bitacoraCsv(await datos.listarCambios()));
    },
  );

  app.post(
    "/cambios",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Gobierno del dato"],
        summary: "Registrar un cambio",
        description: [
          "La regla se aplica aquí, no en la interfaz. El servidor calcula el valor anterior, interpreta el nuevo y decide:",
          "",
          "- **Se publica** si el campo no es sensible y trae una fuente documental con evidencia: el valor pasa a la Base Maestra y el campo cuenta como validado.",
          "- **Queda pendiente** si el campo es sensible (comisión, entrega, esquema de pago) o la fuente no admite evidencia (llamada, otro). Mientras tanto el cliente sigue viendo el valor anterior.",
        ].join("\n"),
        body: nuevoCambioSchema,
        response: {
          201: respuestaCambioSchema,
          400: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      // El autor sale del token: nadie firma un cambio a nombre de otro.
      const r = await registrarCambio(datos, peticion.body, peticion.user);
      if (!r.ok) return respuesta.code(r.codigo).send({ error: r.error });
      return respuesta.code(201).send(r.valor);
    },
  );

  for (const decision of ["aprobar", "rechazar"] as const) {
    app.post(
      `/cambios/:id/${decision}`,
      {
        preHandler: exigir("gerente"),
        schema: {
          tags: ["Gobierno del dato"],
          summary: decision === "aprobar" ? "Aprobar un cambio pendiente" : "Rechazar un cambio pendiente",
          description:
            decision === "aprobar"
              ? "Aplica el valor en la Base Maestra. Nadie aprueba su propio cambio, y si el dato se movió mientras esperaba, responde 409 en lugar de pisarlo."
              : "El valor anterior se queda como está y el rechazo queda en la bitácora.",
          params: z.object({ id: z.string() }),
          response: { 200: cambioSchema, 403: errorSchema, 409: errorSchema, ...noEncontrado },
        },
      },
      async (peticion, respuesta) => {
        const r = await resolverCambio(datos, peticion.params.id, decision, peticion.user);
        if (!r.ok) return respuesta.code(r.codigo).send({ error: r.error });
        return r.valor;
      },
    );
  }

  app.post(
    "/desarrollos/:id/validaciones",
    {
      preHandler: exigir("cerrador"),
      schema: {
        tags: ["Gobierno del dato"],
        summary: "Confirmar que un campo sigue vigente",
        description: "Sube la confiabilidad del desarrollo y queda a nombre de quien validó.",
        params: idDesarrollo,
        body: nuevaValidacionSchema,
        response: {
          200: z.object({ ok: z.boolean(), confiabilidad: z.number().nullable() }),
          ...noEncontrado,
        },
      },
    },
    async (peticion, respuesta) => {
      const desarrollo = await datos.obtenerDesarrollo(peticion.params.id);
      if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });

      await datos.registrarValidacion(peticion.params.id, peticion.body.campo, peticion.user.id);
      const actualizado = await datos.obtenerDesarrollo(peticion.params.id);
      return { ok: true, confiabilidad: actualizado ? confiabilidad(actualizado) : null };
    },
  );
}
