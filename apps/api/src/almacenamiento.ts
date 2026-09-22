import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "./config";

/**
 * Archivos: renders, planos, fotos y brochures.
 *
 * Van a un bucket compatible con S3 (el de Railway), no al disco del servidor:
 * la API puede reiniciarse o moverse de máquina sin perder el material, y los
 * PDFs y el micrositio leen la imagen por su URL pública.
 */

export const almacenamientoConfigurado = Boolean(
  config.s3.endpoint && config.s3.bucket && config.s3.accessKeyId && config.s3.secretAccessKey,
);

let cliente: S3Client | null = null;

function obtenerCliente(): S3Client {
  if (!cliente) {
    cliente = new S3Client({
      endpoint: config.s3.endpoint!,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId!,
        secretAccessKey: config.s3.secretAccessKey!,
      },
      // Los buckets tipo MinIO (Railway) usan ruta, no subdominio.
      forcePathStyle: true,
    });
  }
  return cliente;
}

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};

export const TIPOS_PERMITIDOS = Object.keys(EXTENSIONES);

export function claveDeArchivo(desarrolloId: string, tipo: string, contentType: string): string {
  const extension = EXTENSIONES[contentType] ?? "bin";
  return `desarrollos/${desarrolloId}/${tipo}-${randomUUID()}.${extension}`;
}

/** Sube el archivo y devuelve la URL pública con la que se va a mostrar. */
export async function subirArchivo(
  clave: string,
  contenido: Buffer,
  contentType: string,
): Promise<string> {
  await obtenerCliente().send(
    new PutObjectCommand({
      Bucket: config.s3.bucket!,
      Key: clave,
      Body: contenido,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const base = config.s3.urlPublica ?? `${config.s3.endpoint}/${config.s3.bucket}`;
  return `${base.replace(/\/$/, "")}/${clave}`;
}

export async function borrarArchivo(url: string): Promise<void> {
  const base = (config.s3.urlPublica ?? `${config.s3.endpoint}/${config.s3.bucket}`).replace(
    /\/$/,
    "",
  );
  if (!url.startsWith(base)) return; // No es nuestro: no se toca.

  await obtenerCliente().send(
    new DeleteObjectCommand({
      Bucket: config.s3.bucket!,
      Key: url.slice(base.length + 1),
    }),
  );
}
