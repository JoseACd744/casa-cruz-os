"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { Usuario } from "@casacruz/core";
import { enviar } from "@/lib/api";
import { opcional, texto, type EstadoAccion } from "./tipos";

/** El equipo: invitar, editar, restablecer y cambiar la propia clave. */

export interface EstadoClave extends EstadoAccion {
  /** Se muestra una sola vez, para copiarla y compartirla. */
  clave?: string;
  para?: string;
}

export async function invitarUsuario(_previo: EstadoClave, datos: FormData): Promise<EstadoClave> {
  const r = await enviar<{ usuario: Usuario; claveTemporal: string }>("POST", "/usuarios", {
    nombre: texto(datos, "nombre"),
    correo: texto(datos, "correo"),
    rol: texto(datos, "rol"),
    telefono: opcional(texto(datos, "telefono")),
    plazasCertificadas: datos.getAll("plazasCertificadas").map(String),
  });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Cuenta creada.", clave: r.datos.claveTemporal, para: r.datos.usuario.correo };
}

export async function editarUsuario(id: string, _previo: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const r = await enviar("PATCH", `/usuarios/${encodeURIComponent(id)}`, {
    rol: texto(datos, "rol"),
    activo: datos.get("activo") === "si",
    telefono: opcional(texto(datos, "telefono")),
    plazasCertificadas: datos.getAll("plazasCertificadas").map(String),
    plazasEnProgreso: datos.getAll("plazasEnProgreso").map(String),
  });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Guardado. Cuenta desde su siguiente clic." };
}

export async function restablecerClave(id: string): Promise<EstadoClave> {
  const r = await enviar<{ usuario: Usuario; claveTemporal: string }>(
    "POST",
    `/usuarios/${encodeURIComponent(id)}/restablecer`,
  );
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: "Clave restablecida.", clave: r.datos.claveTemporal, para: r.datos.usuario.correo };
}

export async function cambiarMiClave(_previo: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const nueva = texto(datos, "nueva");
  if (nueva !== texto(datos, "confirmacion")) return { error: "La confirmación no coincide con la clave nueva." };
  const r = await enviar("POST", "/sesion/contrasena", { actual: texto(datos, "actual"), nueva });
  if (!r.ok) return { error: r.error };
  redirect("/inicio");
}
