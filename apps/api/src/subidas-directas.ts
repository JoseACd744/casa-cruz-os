import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { config } from "./config";
import { exigir } from "./auth";
import { fuente } from "./datos";
import { fuenteTipo } from "./esquemas";
import { almacenamientoConfigurado, almacenamientoLocal, claveDeArchivo, firmarSubida, verificarSubida, TIPOS_PERMITIDOS } from "./almacenamiento";

const entradaSchema = z.object({
  proposito: z.enum(["multimedia", "documento", "evidencia"]),
  desarrolloId: z.string().min(1).max(150),
  nombre: z.string().trim().min(1).max(255),
  bytes: z.number().int().positive().max(15 * 1024 * 1024),
  mime: z.string().refine(tipo => TIPOS_PERMITIDOS.includes(tipo)),
  tipo: z.string().max(40),
  titulo: z.string().trim().min(2).max(120).optional(),
});
const ticketSchema = entradaSchema.extend({ usuario: z.string(), clave: z.string(), vence: z.number() });
type Ticket = z.infer<typeof ticketSchema>;
function firma(texto: string) {
  return createHmac("sha256", config.jwtSecret).update(`subida-directa:${texto}`).digest();
}
function emitirTicket(datos: Ticket) {
  const texto = Buffer.from(JSON.stringify(datos)).toString("base64url");
  return `${texto}.${firma(texto).toString("base64url")}`;
}
export function leerTicket(ticket: string): Ticket {
  const [texto, sello, extra] = ticket.split(".");
  if (!texto || !sello || extra) throw new Error("Autorización inválida");
  const recibido = Buffer.from(sello, "base64url");
  const esperado = firma(texto);
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) throw new Error("Autorización inválida");
  const datos = ticketSchema.parse(JSON.parse(Buffer.from(texto, "base64url").toString()));
  if (datos.vence < Date.now()) throw new Error("Autorización vencida");
  return datos;
}

export async function rutasSubidasDirectas(app: FastifyInstance) {
  const datos = await fuente();
  app.post("/archivos/preparar", { preHandler: exigir("cerrador") }, async (peticion, respuesta) => {
    const entrada = entradaSchema.safeParse(peticion.body);
    if (!entrada.success) return respuesta.code(400).send({ error: "Archivo inválido: revisa tipo, nombre y tamaño (máximo 15 MB)." });
    const e = entrada.data;
    if (e.proposito === "multimedia" && !["foto", "render", "plano", "video", "brochure", "mapa"].includes(e.tipo)) return respuesta.code(400).send({ error: "Tipo de multimedia inválido" });
    if (e.proposito === "documento" && !fuenteTipo.safeParse(e.tipo).success) return respuesta.code(400).send({ error: "Tipo de documento inválido" });
    if (!await datos.obtenerDesarrollo(e.desarrolloId)) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
    if (!almacenamientoConfigurado) return respuesta.code(503).send({ error: "El bucket de archivos no está configurado." });
    if (almacenamientoLocal) return { modo: "local" };
    const carpeta = e.proposito === "evidencia" ? `evidencias/${new Date().toISOString().slice(0, 7)}` : `desarrollos/${e.desarrolloId}/${e.proposito}`;
    const clave = claveDeArchivo(carpeta, peticion.user.id, e.mime);
    const subida = await firmarSubida(clave, e.mime, e.bytes);
    return { modo: "directo", ...subida, ticket: emitirTicket({ ...e, clave, usuario: peticion.user.id, vence: Date.now() + 15 * 60_000 }) };
  });
  app.post("/archivos/confirmar", { preHandler: exigir("cerrador") }, async (peticion, respuesta) => {
    const entrada = z.object({ ticket: z.string().max(5000), proposito: entradaSchema.shape.proposito, desarrolloId: z.string() }).safeParse(peticion.body);
    if (!entrada.success) return respuesta.code(400).send({ error: "Falta la autorización de carga." });
    let e: Ticket;
    try { e = leerTicket(entrada.data.ticket); }
    catch { return respuesta.code(400).send({ error: "La autorización de carga es inválida o venció." }); }
    if (e.usuario !== peticion.user.id || e.proposito !== entrada.data.proposito || e.desarrolloId !== entrada.data.desarrolloId) return respuesta.code(403).send({ error: "La carga no pertenece a este usuario o destino." });
    const desarrollo = await datos.obtenerDesarrollo(e.desarrolloId);
    if (!desarrollo) return respuesta.code(404).send({ error: "Desarrollo no encontrado" });
    let url: string;
    try { url = await verificarSubida(e.clave, e.mime, e.bytes); }
    catch { return respuesta.code(409).send({ error: "El archivo no está disponible o su tamaño/tipo no coincide. Vuelve a subirlo." }); }
    if (e.proposito === "multimedia") {
      const actuales = desarrollo.multimedia ?? [];
      await datos.agregarMultimedia(e.desarrolloId, { url, tipo: e.tipo as NonNullable<typeof desarrollo.multimedia>[number]["tipo"], orden: actuales.length ? Math.max(...actuales.map(m => m.orden)) + 1 : 0 });
    } else if (e.proposito === "documento") {
      await datos.agregarDocumento(e.desarrolloId, { url, tipo: fuenteTipo.parse(e.tipo), nombre: e.titulo ?? e.nombre });
    }
    return { url };
  });
}
