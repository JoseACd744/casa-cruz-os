import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { exigir, verificarContrasena, type Sesion } from "./auth";
import { config, modoMock } from "./config";
import { fuente } from "./datos";
import { errorSchema, rol as rolSchema } from "./esquemas";

/** Inicio de sesión y quién soy. */
export async function rutasSesion(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();
  const datos = await fuente();

  const sesionSchema = z
    .object({
      id: z.string(),
      nombre: z.string(),
      rol: rolSchema,
      plazas: z.array(z.string()).meta({ description: "Plazas en las que está certificado." }),
    })
    .meta({ id: "Sesion" });

  app.post(
    "/sesion",
    {
      schema: {
        tags: ["Sesión"],
        summary: "Iniciar sesión",
        description: modoMock
          ? "Sin base de datos, cualquier usuario del catálogo entra con la clave de demostración (CLAVE_DEMO, por omisión `casacruz`). Con Postgres se valida el hash real."
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
      const usuario = usuarios.find(
        (u) => u.correo.toLowerCase() === peticion.body.correo.toLowerCase(),
      );

      if (!usuario || !usuario.activo) {
        return respuesta.code(401).send({ error: "Usuario o contraseña incorrectos" });
      }

      const hash = await datos.hashDeContrasena(usuario.id);
      const valida = hash
        ? await verificarContrasena(peticion.body.contrasena, hash)
        : peticion.body.contrasena === config.claveDemo;

      if (!valida) {
        return respuesta.code(401).send({ error: "Usuario o contraseña incorrectos" });
      }

      const sesion: Sesion = {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        plazas: usuario.plazasCertificadas,
      };

      return { token: app.jwt.sign(sesion, { expiresIn: "12h" }), sesion };
    },
  );

  app.get(
    "/sesion",
    {
      preHandler: exigir("cliente"),
      schema: {
        tags: ["Sesión"],
        summary: "Quién soy",
        response: { 200: sesionSchema, 401: errorSchema },
      },
    },
    async (peticion) => peticion.user,
  );
}
