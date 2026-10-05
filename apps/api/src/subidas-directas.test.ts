import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, test, mock } from "node:test";
import { chromium } from "playwright";

// Bucket simulado, sin credenciales ni acceso a producción.
const objetos = new Map<string, { bytes: number; tipo: string }>();
const bucket = createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "PUT,HEAD");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") { res.end(); return; }
  const url = new URL(req.url!, "http://localhost");
  if (req.method === "PUT") {
    assert.ok(url.searchParams.get("X-Amz-Signature"));
    assert.ok(url.searchParams.get("X-Amz-SignedHeaders")?.includes("content-length"));
    assert.ok(url.searchParams.get("X-Amz-SignedHeaders")?.includes("content-type"));
    let bytes = 0;
    for await (const parte of req) bytes += parte.length;
    assert.equal(bytes, Number(req.headers["content-length"]));
    objetos.set(url.pathname, { bytes, tipo: req.headers["content-type"]! });
    res.end(); return;
  }
  const objeto = objetos.get(url.pathname);
  if (!objeto) { res.statusCode = 404; res.end(); return; }
  res.setHeader("Content-Length", objeto.bytes);
  res.setHeader("Content-Type", objeto.tipo);
  res.end();
});
await new Promise<void>(resolve => bucket.listen(0, "127.0.0.1", resolve));
const puerto = (bucket.address() as { port: number }).port;
process.env.S3_ENDPOINT = `http://127.0.0.1:${puerto}`;
process.env.S3_BUCKET = "prueba";
process.env.S3_ACCESS_KEY_ID = "prueba";
process.env.S3_SECRET_ACCESS_KEY = "secreto-sintetico";
process.env.LOG_LEVEL = "silent";
// Las pruebas ordinarias también pueden ejecutarse con Postgres; este archivo usa sólo mock.
delete process.env.DATABASE_URL;
const { servidorDePrueba, entrar, CORREOS } = await import("./prueba");
const app = await servidorDePrueba();
const headers = await entrar(app, CORREOS.cerrador);
const otros = await entrar(app, CORREOS.otroCerrador);
const { fuente } = await import("./datos");
const datos = await fuente();
const desarrollo = (await datos.listarDesarrollos({}))[0];
const base = { proposito: "multimedia", desarrolloId: desarrollo.id, nombre: "plano.pdf", mime: "application/pdf", bytes: 8, tipo: "plano" };
after(async () => { await app.close(); await new Promise<void>(resolve => bucket.close(() => resolve())); });

async function preparar(entrada = base) {
  const r = await app.inject({ method: "POST", url: "/archivos/preparar", headers, payload: entrada });
  assert.equal(r.statusCode, 200, r.body);
  const preparada = r.json();
  assert.equal(new URL(preparada.url).searchParams.get("X-Amz-Expires"), "300");
  return preparada;
}
async function confirmar(ticket: string, usuario = headers, proposito = "multimedia", desarrolloId = desarrollo.id) {
  return app.inject({ method: "POST", url: "/archivos/confirmar", headers: usuario, payload: { ticket, proposito, desarrolloId } });
}

test("subida desde navegador al bucket y confirmación idempotente", async () => {
  const preparada = await preparar();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${puerto}/`);
    const status = await page.evaluate(async p => {
      const file = new File(["12345678"], "plano.pdf", { type: "application/pdf" });
      return (await fetch(p.url, { method: "PUT", headers: p.headers, body: file })).status;
    }, preparada);
    assert.equal(status, 200);
  } finally { await browser.close(); }
  const resultados = await Promise.all([confirmar(preparada.ticket), confirmar(preparada.ticket)]);
  for (const r of resultados) assert.equal(r.statusCode, 200, r.body);
  const url = resultados[0].json().url;
  assert.equal((await datos.obtenerDesarrollo(desarrollo.id))!.multimedia!.filter(m => m.url === url).length, 1);
});

test("rechaza sesión ausente, tamaño/tipo inválido y destino inexistente", async () => {
  assert.equal((await app.inject({ method: "POST", url: "/archivos/preparar", payload: base })).statusCode, 401);
  for (const entrada of [{ ...base, bytes: 16 * 1024 * 1024 }, { ...base, mime: "text/html" }, { ...base, bytes: 0 }]) {
    assert.equal((await app.inject({ method: "POST", url: "/archivos/preparar", headers, payload: entrada })).statusCode, 400);
  }
  assert.equal((await app.inject({ method: "POST", url: "/archivos/preparar", headers, payload: { ...base, desarrolloId: "no-existe" } })).statusCode, 404);
});

test("no registra archivos ausentes, alterados, de otro usuario o destino", async () => {
  const p = await preparar();
  assert.equal((await confirmar(p.ticket)).statusCode, 409);
  assert.equal((await confirmar(p.ticket, otros)).statusCode, 403);
  assert.equal((await confirmar(p.ticket, headers, "evidencia")).statusCode, 403);
  assert.equal((await confirmar(p.ticket, headers, "multimedia", "otro")).statusCode, 403);
  assert.equal((await confirmar(p.ticket + "alterado")).statusCode, 400);
  const clave = new URL(p.url).pathname;
  objetos.set(clave, { bytes: 9, tipo: "application/pdf" });
  assert.equal((await confirmar(p.ticket)).statusCode, 409);
  objetos.set(clave, { bytes: 8, tipo: "text/html" });
  assert.equal((await confirmar(p.ticket)).statusCode, 409);
});

test("documentos y evidencias conservan su propósito y nombre", async () => {
  for (const proposito of ["documento", "evidencia"]) {
    const p = await preparar({ ...base, proposito, tipo: "correo" });
    await fetch(p.url, { method: "PUT", headers: p.headers, body: Buffer.from("12345678") });
    const r = await confirmar(p.ticket, headers, proposito);
    assert.equal(r.statusCode, 200, r.body);
    if (proposito === "documento") {
      await confirmar(p.ticket, headers, proposito);
      assert.equal((await datos.obtenerDesarrollo(desarrollo.id))!.interna.documentos.filter(d => d.url === r.json().url).length, 1);
    }
  }
});


test("la autorización de confirmación vence a los quince minutos", async () => {
  const p = await preparar();
  const { leerTicket } = await import("./subidas-directas");
  const ahora = Date.now();
  mock.method(Date, "now", () => ahora + 16 * 60_000);
  try { assert.throws(() => leerTicket(p.ticket), /vencida/); }
  finally { mock.restoreAll(); }
});

if (process.env.SUBIDAS_QA_WEB === "1") {
  test("formularios reales: sólo metadatos a Next y binarios al bucket", async () => {
    const { spawn } = await import("node:child_process");
    const { resolve } = await import("node:path");
    const api = await app.listen({ host: "127.0.0.1", port: 0 });
    const web = "http://127.0.0.1:3117";
    const proceso = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "-p", "3117", "-H", "127.0.0.1"], {
      cwd: resolve("apps/web"), windowsHide: true,
      env: { ...process.env, API_URL: api, DATABASE_URL: "", NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    proceso.stdout.on("data", d => { log = (log + d).slice(-8000); });
    proceso.stderr.on("data", d => { log = (log + d).slice(-8000); });
    const browser = await chromium.launch({ headless: true });
    try {
      let disponible = false;
      for (let i = 0; i < 100; i++) {
        try { disponible = (await fetch(web + "/login")).ok; } catch { /* arranque */ }
        if (disponible) break;
        await new Promise(r => setTimeout(r, 200));
      }
      assert.ok(disponible, log);
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.context().addCookies([{ name: "cc-sesion", value: headers.authorization.slice(7), url: web, httpOnly: true, sameSite: "Lax" }]);
      let puts = 0;
      let acciones = 0;
      const errores: string[] = [];
      page.on("pageerror", e => errores.push(e.message));
      page.on("request", req => {
        if (req.method() === "PUT" && req.url().startsWith(process.env.S3_ENDPOINT!)) puts++;
        if (req.method() === "POST" && req.url().startsWith(web)) {
          acciones++;
          assert.ok((req.postDataBuffer()?.length ?? 0) < 50_000, "Next recibió un binario");
        }
      });
      const archivo = { name: "auditoria.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(9 * 1024 * 1024, 65) };
      await page.goto(`${web}/propiedades/${desarrollo.id}/editar?paso=4`);
      await page.locator('input[name="archivos"]').setInputFiles([archivo, { ...archivo, name: "auditoria-2.pdf" }]);
      await page.locator('input[name="archivos"]').locator('xpath=ancestor::form').getByRole("button", { name: "SUBIR", exact: true }).click();
      await page.getByText("2 archivos cargados.", { exact: true }).waitFor();
      await page.goto(`${web}/propiedades/${desarrollo.id}/editar?paso=6`);
      await page.locator('input[name="archivo"]').setInputFiles(archivo);
      await page.locator('input[name="archivo"]').locator('xpath=ancestor::form').getByRole("button", { name: "SUBIR", exact: true }).click();
      await page.getByText("Documento cargado.", { exact: true }).waitFor();
      await page.goto(`${web}/propiedades/${desarrollo.id}/cambio`);
      await page.locator('input[name="valorNuevo"]').fill("9876543");
      await page.locator('input[name="evidencia"]').setInputFiles(archivo);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/cambio=(pendiente|publicado)/);
      assert.equal(puts, 4);
      assert.ok(acciones >= 7);
      assert.deepEqual(errores, []);
    } finally {
      await browser.close();
      proceso.kill();
      if (proceso.exitCode === null) await new Promise<void>(r => proceso.once("exit", () => r()));
    }
  });
}
