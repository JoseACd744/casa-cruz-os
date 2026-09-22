import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/sesion";

/** Cerrar sesión: se borra la cookie y se vuelve al acceso. */
export async function GET(peticion: Request) {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);
  return NextResponse.redirect(new URL("/login", peticion.url));
}
