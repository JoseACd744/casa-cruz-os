import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config";

/**
 * Archivos: renders, planos, fotos, brochures y evidencias.
 *
 * Van a un bucket compatible con S3 (el de Railway), no al disco del servidor:
 * la API puede reiniciarse o moverse de máquina sin perder el material, y los
 * PDFs y el micrositio leen la imagen por su URL pública.
 *
 * Mientras se trabaja en local sin bucket, se guardan en `apps/api/.archivos` y
 * la propia API los sirve. En producción eso no ocurre: sin bucket, la carga
 * responde 503 en lugar de escribir en un disco que se borra con cada despliegue.
 */

const bucketConfigurado = Boolean(
  config.s3.endpoint && config.s3.bucket && config.s3.accessKeyId && config.s3.secretAccessKey,
);

export const almacenamientoLocal = !bucketConfigurado && !config.produccion;

export const almacenamientoConfigurado = bucketConfigurado || almacenamientoLocal;

export const DIRECTORIO_LOCAL = path.resolve(process.cwd(), ".archivos");

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
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return cliente;
}

export const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  // Un correo del desarrollador también es evidencia.
  "message/rfc822": "eml",
};

export const TIPOS_PERMITIDOS = Object.keys(EXTENSIONES);

const TIPO_POR_EXTENSION = Object.fromEntries(
  Object.entries(EXTENSIONES).map(([tipo, extension]) => [extension, tipo]),
);

export function claveDeArchivo(carpeta: string, prefijo: string, contentType: string): string {
  const extension = EXTENSIONES[contentType] ?? "bin";
  return `${carpeta}/${prefijo}-${randomUUID()}.${extension}`;
}

function baseUrl(): string {
  if (almacenamientoLocal) return `${config.urlApi}/archivos`;
  return (config.s3.urlPublica ?? `${config.s3.endpoint}/${config.s3.bucket}`).replace(/\/$/, "");
}

export async function firmarSubida(clave: string, tipo: string, bytes: number) {
  const url = await getSignedUrl(obtenerCliente(), new PutObjectCommand({
    Bucket: config.s3.bucket!, Key: clave, ContentType: tipo, ContentLength: bytes,
  }), { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) });
  return { url, headers: { "Content-Type": tipo } };
}

export async function verificarSubida(clave: string, tipo: string, bytes: number) {
  const objeto = await obtenerCliente().send(new HeadObjectCommand({ Bucket: config.s3.bucket!, Key: clave }));
  if (objeto.ContentLength !== bytes || objeto.ContentType !== tipo) throw new Error("Archivo distinto al autorizado");
  return `${baseUrl()}/${clave}`;
}

/** Sube el archivo y devuelve la URL pública con la que se va a mostrar. */
export async function subirArchivo(
  clave: string,
  contenido: Buffer,
  contentType: string,
): Promise<string> {
  if (almacenamientoLocal) {
    const destino = rutaLocal(clave);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, contenido);
  } else {
    await obtenerCliente().send(
      new PutObjectCommand({
        Bucket: config.s3.bucket!,
        Key: clave,
        Body: contenido,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }
  return `${baseUrl()}/${clave}`;
}

export async function borrarArchivo(url: string): Promise<void> {
  const base = baseUrl();
  if (!url.startsWith(`${base}/`)) return; // No es nuestro: no se toca.
  const clave = url.slice(base.length + 1);

  if (almacenamientoLocal) {
    await unlink(rutaLocal(clave)).catch(() => undefined);
    return;
  }
  await obtenerCliente().send(new DeleteObjectCommand({ Bucket: config.s3.bucket!, Key: clave }));
}

/** Ruta en disco de una clave, sin permitir salir de la carpeta. */
export function rutaLocal(clave: string): string {
  const destino = path.resolve(DIRECTORIO_LOCAL, clave);
  if (!destino.startsWith(DIRECTORIO_LOCAL + path.sep)) {
    throw new Error("Ruta de archivo inválida");
  }
  return destino;
}

/** Lee un archivo local para servirlo. Null si no existe o la ruta no es válida. */
export async function leerArchivoLocal(
  clave: string,
): Promise<{ contenido: Buffer; tipo: string } | null> {
  try {
    const contenido = await readFile(rutaLocal(clave));
    const extension = path.extname(clave).slice(1).toLowerCase();
    return { contenido, tipo: TIPO_POR_EXTENSION[extension] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
