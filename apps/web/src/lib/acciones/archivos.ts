import { enviar } from "@/lib/api";

/**
 * Sube un archivo del formulario a la API y devuelve su URL.
 *
 * Algunos navegadores mandan un correo .eml o un PDF sin tipo: se deduce por la
 * extensión para que la API lo acepte.
 */
const TIPO_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  mp4: "video/mp4",
  eml: "message/rfc822",
};

export function conTipo(archivo: File): File {
  if (archivo.type) return archivo;
  const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
  const tipo = TIPO_POR_EXTENSION[extension];
  return tipo ? new File([archivo], archivo.name, { type: tipo }) : archivo;
}

/** null si el formulario no traía archivo. */
export async function subirSiViene(
  valor: FormDataEntryValue | null,
  ruta: string,
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  if (!(valor instanceof File) || valor.size === 0) return { ok: true, url: null };
  const cuerpo = new FormData();
  const archivo = conTipo(valor);
  cuerpo.append("archivo", archivo, archivo.name);
  const r = await enviar<{ url: string }>("POST", ruta, cuerpo);
  if (!r.ok) return { ok: false, error: `No se pudo subir ${valor.name}: ${r.error}` };
  return { ok: true, url: r.datos.url };
}
