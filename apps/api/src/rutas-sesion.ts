import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { motivoClaveDebil } from "@casacruz/core";
import { cifrarContrasena, exigir, olvidarUsuario, usuarioVigente, verificarContrasena, type Sesion } from "./auth";
import { config, modoMock } from "./config";
import { fuente } from "./datos";
import { errorSchema, rol as rolSchema } from "./esquemas";

/** Inicio de sesión, quién soy y cambio de clave. */
export async function rutasSesion(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  const sesionSchema = z
    .object({
      id: z.string(),
      nombre: z.string(),
      rol: rolSchema,
      plazas: z.array(z.string()).meta({ description: "Plazas en las que está certificado." }),
      debeCambiarContrasena: z.boolean(),
    })
    .meta({ id: "Sesion" });

  /** La clave vigente: su hash, o la de demostración si aún no tiene. */
  async function claveValida(usuarioId: string, clave: string): Promise<boolean> {
    const hash = await datos.hashDeContrasena(usuarioId);
    return hash ? verificarContrasena(clave, hash) : clave === config.claveDemo;
  }

  app.post(
    "/sesion",
    {
      schema: {
        tags: ["Sesión"],
        summary: "Iniciar sesión",
        description: modoMock
          ? "Sin base de datos, los usuarios de demostración entran con CLAVE_DEMO (por omisión `casacruz`) hasta que se les asigna una. Con Postgres se valida el hash real."
          : "Valida correo y contraseña contra la base.",
        body: z.object({
          correo: z.string().min(3).meta({ example: "jorge.diaz@casacruz.mx" }),
          contrasena: z.string().min(1),
        }),
        response: {
          200: z.object({ token: z.string(), sesion: sesionSchema }),
          401: errorSchema,
        },
      },
    },
    async (peticion, respuesta) => {
      const usuarios = await datos.listarUsuarios();
      const usuario = usuarios.find((u) => u.correo.toLowerCase() === peticion.body.correo.toLowerCase());

      if (!usuario || !usuario.activo || !(await claveValida(usuario.id, peticion.body.contrasena))) {
        return respuesta.code(401).send({ error: "Usuario o contraseña incorrectos" });
      }

      await datos.registrarAcceso(usuario.id);
      const sesion: Sesion = {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        plazas: usuario.plazasCertificadas,
      };
      return {
        token: app.jwt.sign(sesion, { expiresIn: "12h" }),
        sesion: { ...sesion, debeCambiarContrasena: usuario.debeCambiarContrasena },
      };
    },
  );

  app.get(
    "/sesion",
    {
      preHandler: exigir("cliente", { claveTemporal: true }),
      schema: {
        tags: ["Sesión"],
        summary: "Quién soy",
        description: "Con los datos de hoy, no los del momento en que se firmó el token.",
        response: { 200: sesionSchema, 401: errorSchema },
      },
    },
    async (peticion) => {
      const usuario = await usuarioVigente(peticion.user.id);
      return { ...peticion.user, debeCambiarContrasena: usuario?.debeCambiarContrasena ?? false };
    },
  );

  app.post(
    "/sesion/contrasena",
    {
      preHandler: exigir("cliente", { claveTemporal: true }),
      schema: {
        tags: ["Sesión"],
        summary: "Cambiar mi clave",
        description:
          "La clave nueva debe tener al menos 10 caracteres, combinar letras y números y no usar el nombre, el correo ni el de la empresa.",
        body: z.object({ actual: z.string().min(1), nueva: z.string().min(1).max(200) }),
        response: { 200: z.object({ ok: z.boolean() }), 400: errorSchema, 401: errorSchema },
      },
    },
    async (peticion, respuesta) => {
      const usuario = await usuarioVigente(peticion.user.id);
      if (!usuario) return respuesta.code(401).send({ error: "Falta iniciar sesión" });

      if (!(await claveValida(usuario.id, peticion.body.actual))) {
        return respuesta.code(400).send({ error: "La clave actual no es correcta." });
      }
      if (peticion.body.nueva === peticion.body.actual) {
        return respuesta.code(400).send({ error: "La clave nueva tiene que ser distinta de la actual." });
      }
      const debil = motivoClaveDebil(peticion.body.nueva, usuario);
      if (debil) return respuesta.code(400).send({ error: debil });

      await datos.guardarContrasena(usuario.id, await cifrarContrasena(peticion.body.nueva), false);
      olvidarUsuario(usuario.id);
      return { ok: true };
    },
  );
}
