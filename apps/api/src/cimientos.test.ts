import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { after, test } from "node:test";
import { DIRECTORIO_LOCAL, rutaLocal } from "./almacenamiento";
import { CORREOS, entrar, multipart, servidorDePrueba } from "./prueba";

const app = await servidorDePrueba();
after(() => app.close());

test("salud dice qué integraciones están conectadas", async () => {
  const r = await app.inject({ method: "GET", url: "/salud" });
  assert.equal(r.statusCode, 200);
  const salud = r.json();
  assert.equal(salud.integraciones.archivos, "local");
  assert.equal(typeof salud.integraciones.kommo, "boolean");
});

test("la sesión devuelve el rol de quien entra", async () => {
  const r = await app.inject({
    method: "GET",
    url: "/sesion",
    headers: await entrar(app, CORREOS.gerente),
  });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().rol, "gerente");
});

test("un cerrador no puede ver al equipo", async () => {
  const r = await app.inject({
    method: "GET",
    url: "/usuarios",
    headers: await entrar(app, CORREOS.cerrador),
  });
  assert.equal(r.statusCode, 403);
});

test("la propuesta pública no expone nada interno", async () => {
  const r = await app.inject({ method: "GET", url: "/propuestas/berenice-fabian/publica" });
  assert.equal(r.statusCode, 200);
  const publica = r.json();

  assert.equal(publica.asesor.nombre, "Jorge Díaz");
  assert.equal(publica.propuesta.kommoLeadId, null);
  assert.ok(publica.desarrollos.length > 0);
  for (const d of publica.desarrollos) {
    assert.equal(d.interna.documentos.length, 0);
    assert.equal(d.interna.comisionPct, null);
    assert.equal(d.comercial.argumentos.length, 0);
  }
  // Lo que el cliente sí debe saber viaja completo.
  const playa = publica.desarrollos.find((d: { id: string }) => d.id === "playa-park");
  assert.ok(playa.aConsiderar.length > 0);
});

test("una evidencia se sube y se puede descargar en local", async () => {
  const contenido = Buffer.from("%PDF-1.4 lista de precios");
  const cuerpo = multipart("lista.pdf", "application/pdf", contenido);
  const subida = await app.inject({
    method: "POST",
    url: "/archivos?proposito=evidencia",
    headers: { ...(await entrar(app, CORREOS.cerrador)), ...cuerpo.headers },
    payload: cuerpo.payload,
  });
  assert.equal(subida.statusCode, 201, subida.body);
  const { url, nombre } = subida.json();
  assert.equal(nombre, "lista.pdf");

  const ruta = new URL(url).pathname;
  const descarga = await app.inject({ method: "GET", url: ruta });
  assert.equal(descarga.statusCode, 200);
  assert.equal(descarga.headers["content-type"], "application/pdf");
  assert.equal(descarga.body, contenido.toString());

  await rm(rutaLocal(ruta.replace(/^\/archivos\//, "")));
});

test("no se puede leer fuera de la carpeta de archivos", async () => {
  const r = await app.inject({ method: "GET", url: "/archivos/..%2F..%2Fpackage.json" });
  assert.equal(r.statusCode, 404);
  assert.ok(DIRECTORIO_LOCAL.endsWith(".archivos"));
});

test("sin sesión no se suben archivos", async () => {
  const cuerpo = multipart("x.pdf", "application/pdf", Buffer.from("x"));
  const r = await app.inject({
    method: "POST",
    url: "/archivos",
    headers: cuerpo.headers,
    payload: cuerpo.payload,
  });
  assert.equal(r.statusCode, 401);
});
