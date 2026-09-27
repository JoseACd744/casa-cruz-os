import { PrismaClient } from "@prisma/client";
import { claveTemporal, cifrarContrasena } from "../src/auth";

/**
 * Da acceso a alguien que todavía no tiene clave: le genera una temporal y la
 * muestra una sola vez. Sirve para el primer corporativo de una base nueva;
 * después, las cuentas se administran desde Usuarios.
 *
 *   pnpm --filter @casacruz/api acceso direccion@casacruz.mx
 */

const correo = process.argv[2]?.trim().toLowerCase();
if (!correo) {
  console.error("Uso: pnpm --filter @casacruz/api acceso <correo>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (!usuario) {
    console.error(`No hay ninguna cuenta con el correo ${correo}.`);
    process.exitCode = 1;
  } else {
    const clave = claveTemporal();
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { contrasenaHash: await cifrarContrasena(clave), debeCambiarContrasena: true, activo: true },
    });
    console.log(`Clave temporal de ${usuario.nombre} (${usuario.rol}): ${clave}`);
    console.log("Se le pedirá elegir la suya al entrar. No se vuelve a mostrar.");
  }
} finally {
  await prisma.$disconnect();
}
