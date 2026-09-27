import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { claveTemporal, cifrarContrasena, exigir, olvidarUsuario } from "./auth";
import { fuente } from "./datos";
import { errorSchema, rol, usuarioSchema } from "./esquemas";

/**
 * El equipo: quién entra, con qué rol y qué plazas puede vender.
 *
 * Lo administra corporativo. Una cuenta nueva nace con una clave temporal que
 * se muestra una sola vez; al entrar, la persona tiene que elegir la suya.
 */
export async function rutasUsuarios(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  const plazas = z.array(z.string()).optional();
  const conClave = z.object({
    usuario: usuarioSchema,
    claveTemporal: z.string().meta({
      description: "Se muestra una sola vez. Compártela por un canal seguro: al entrar se pide cambiarla.",
    }),
  });

  /** Nadie deja a Casa Cruz sin un corporativo activo. */
  async function quedaCorporativo(id: string, parche: { rol?: string; activo?: boolean }): Promise<boolean> {
    const equipo = await datos.listarUsuarios();
    const despues = equipo.map((u) => (u.id === id ? { ...u, ...parche } : u));
    return despues.some((u) => u.rol === "corporativo" && u.activo);
  }

  app.post(
    "/usuarios",
    {
      preHandler: exigir("corporativo"),
      schema: {
        tags: ["Personas"],
        summary: "Invitar a alguien al equipo",
        description: "Crea la cuenta con una clave temporal. Las plazas certificadas deciden qué puede vender.",
        body: z.object({
          nombre: z.string().trim().min(3),
          correo: z.email().meta({ example: "ana.torres@casacruz.mx" }),
          rol,
          telefono: z.string().trim().nullish(),
          plazasCertificadas: plazas,
          plazasEnProgreso: plazas,
        }),
        response: { 201: conClave, 409: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const equipo = await datos.listarUsuarios();
      if (equipo.some((u) => u.correo.toLowerCase() === peticion.body.correo.toLowerCase())) {
        return respuesta.code(409).send({ error: "Ya existe una cuenta con ese correo." });
      }
      const clave = claveTemporal();
      const usuario = await datos.crearUsuario(peticion.body, await cifrarContrasena(clave));
      app.log.info({ usuario: usuario.id, por: peticion.user.id }, "Cuenta creada");
      return respuesta.code(201).send({ usuario, claveTemporal: clave });
    },
  );

  app.patch(
    "/usuarios/:id",
    {
      preHandler: exigir("corporativo"),
      schema: {
        tags: ["Personas"],
        summary: "Cambiar rol, plazas, teléfono o estado",
        description:
          "Surte efecto en la siguiente petición de esa persona, aunque tenga una sesión abierta. No se puede dejar la empresa sin un corporativo activo.",
        params: z.object({ id: z.string() }),
        body: z.object({
          nombre: z.string().trim().min(3).optional(),
          rol: rol.optional(),
          activo: z.boolean().optional(),
          telefono: z.string().trim().nullish(),
          plazasCertificadas: plazas,
          plazasEnProgreso: plazas,
        }),
        response: { 200: usuarioSchema, 404: errorSchema, 409: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const { id } = peticion.params;
      if (id === peticion.user.id && peticion.body.activo === false) {
        return respuesta.code(409).send({ error: "No puedes desactivar tu propia cuenta." });
      }
      if (!(await quedaCorporativo(id, peticion.body))) {
        return respuesta.code(409).send({ error: "Casa Cruz necesita al menos un corporativo activo." });
      }
      const usuario = await datos.actualizarUsuario(id, peticion.body);
      if (!usuario) return respuesta.code(404).send({ error: "Usuario no encontrado" });
      olvidarUsuario(id);
      return usuario;
    },
  );

  app.post(
    "/usuarios/:id/restablecer",
    {
      preHandler: exigir("corporativo"),
      schema: {
        tags: ["Personas"],
        summary: "Restablecer la clave",
        description: "Genera una clave temporal nueva; la anterior deja de servir.",
        params: z.object({ id: z.string() }),
        response: { 200: conClave, 404: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const usuario = await datos.obtenerUsuario(peticion.params.id);
      if (!usuario) return respuesta.code(404).send({ error: "Usuario no encontrado" });
      const clave = claveTemporal();
      await datos.guardarContrasena(usuario.id, await cifrarContrasena(clave), true);
      olvidarUsuario(usuario.id);
      return { usuario: { ...usuario, debeCambiarContrasena: true }, claveTemporal: clave };
    },
  );
}
