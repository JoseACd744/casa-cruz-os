import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { after, test } from "node:test";
import type { Desarrollo } from "@casacruz/core";
import { rutaLocal } from "./almacenamiento";
import { CORREOS, entrar, multipart, servidorDePrueba } from "./prueba";

/** Un desarrollo nuevo, de la captura a la publicación, con cada rol en su paso. */

const app = await servidorDePrueba();
const subidos: string[] = [];
after(async () => {
  await app.close();
  for (const url of subidos) await rm(rutaLocal(new URL(url).pathname.replace(/^\/archivos\//, ""))).catch(() => {});
});

const cerrador = await entrar(app, CORREOS.cerrador);
const gerente = await entrar(app, CORREOS.gerente);
const corporativo = await entrar(app, CORREOS.corporativo);

const pedir = (method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", url: string, headers: Record<string, string>, payload?: unknown) =>
  app.inject({ method, url, headers, ...(payload === undefined ? {} : { payload: payload as object }) });

let id = "";

test("el cerrador da de alta un desarrollo en borrador", async () => {
  const sinPlaza = await pedir("POST", "/desarrollos", cerrador, {
    nombre: "Bahía Turquesa",
    plazaId: "atlantida",
    ciudad: "Tulum",
    tipo: "departamento",
  });
  assert.equal(sinPlaza.statusCode, 400);

  const malaEntrega = await pedir("POST", "/desarrollos", cerrador, {
    nombre: "Bahía Turquesa",
    plazaId: "riviera-maya",
    ciudad: "Tulum",
    tipo: "departamento",
    entrega: "cuando se pueda",
  });
  assert.equal(malaEntrega.statusCode, 400);

  const r = await pedir("POST", "/desarrollos", cerrador, {
    nombre: "Bahía Turquesa",
    plazaId: "riviera-maya",
    ciudad: "Tulum",
    tipo: "departamento",
    entrega: "junio de 2028",
  });
  assert.equal(r.statusCode, 201, r.body);
  const d: Desarrollo = r.json();
  id = d.id;
  assert.equal(d.estatus, "borrador");
  assert.equal(d.entrega, "Junio 2028");
  assert.equal(d.entregaIso, "2028-06");
  assert.equal(d.responsableId, "u-jorge");
});

test("en borrador se captura todo libremente, menos lo que es de corporativo", async () => {
  const general = await pedir("PATCH", `/desarrollos/${id}`, cerrador, {
    direccion: "Av. Tulum 120",
    lat: 20.2114,
    lng: -87.4654,
    desarrollador: "Grupo Caribe",
    amenidades: ["Alberca", "Gimnasio"],
    condiciones: { enganchePct: 20, restoPct: 80, formasPago: ["Crédito hipotecario"] },
    comercial: { argumentos: ["A 5 minutos de la playa"], objeciones: ["Entrega en 2028"] },
    interna: { contactoComercial: "Ana López · 984 000 0000", convenioFirmado: true },
  });
  assert.equal(general.statusCode, 200, general.body);
  assert.equal(general.json().condiciones.enganchePct, 20);

  const dd = await pedir("PATCH", `/desarrollos/${id}`, cerrador, { interna: { dueDiligence: "validado" } });
  assert.equal(dd.statusCode, 403);

  const repetidos = await pedir("PUT", `/desarrollos/${id}/tipologias`, cerrador, {
    nombre: "Departamento 2 habitaciones",
    niveles: [
      { nombre: "Planta baja", precioVenta: 2_800_000 },
      { nombre: "planta baja", precioVenta: 2_700_000 },
    ],
  });
  assert.equal(repetidos.statusCode, 400);

  const tipologia = await pedir("PUT", `/desarrollos/${id}/tipologias`, cerrador, {
    nombre: "Departamento 2 habitaciones",
    recamaras: 2,
    banos: 2,
    m2Construccion: 88,
    niveles: [
      { nombre: "Planta baja", precioVenta: 2_800_000, disponibles: 6 },
      { nombre: "Primer nivel", precioVenta: 2_700_000, disponibles: 8 },
    ],
  });
  assert.equal(tipologia.statusCode, 200, tipologia.body);
});

test("la multimedia se sube, se reordena y la primera es la fachada", async () => {
  const urls: string[] = [];
  for (const nombre of ["fachada", "alberca", "interior"]) {
    const cuerpo = multipart(`${nombre}.png`, "image/png", Buffer.from(`png-${nombre}`));
    const r = await app.inject({
      method: "POST",
      url: `/desarrollos/${id}/multimedia?tipo=render`,
      headers: { ...cerrador, ...cuerpo.headers },
      payload: cuerpo.payload,
    });
    assert.equal(r.statusCode, 201, r.body);
    urls.push(r.json().multimedia.at(-1).url);
  }
  subidos.push(...urls);

  const orden = await pedir("PUT", `/desarrollos/${id}/multimedia/orden`, cerrador, {
    urls: [urls[2], urls[0], urls[1]],
  });
  assert.equal(orden.statusCode, 200);
  assert.deepEqual(
    orden.json().multimedia.map((m: { url: string }) => m.url),
    [urls[2], urls[0], urls[1]],
  );
});

test("la documentación legal queda en la información interna", async () => {
  const cuerpo = multipart("convenio.pdf", "application/pdf", Buffer.from("%PDF convenio"));
  const r = await app.inject({
    method: "POST",
    url: `/desarrollos/${id}/documentos?tipo=convenio&nombre=Convenio%20comercial`,
    headers: { ...cerrador, ...cuerpo.headers },
    payload: cuerpo.payload,
  });
  assert.equal(r.statusCode, 201, r.body);
  const [doc] = r.json().documentos;
  assert.equal(doc.nombre, "Convenio comercial");
  assert.equal(doc.tipo, "convenio");
  subidos.push(doc.url);

  const publico = await app.inject({ method: "GET", url: `/desarrollos/${id}` });
  assert.equal(publico.json().interna.documentos.length, 0);
});

test("el alta avanza paso por paso, cada quien en el suyo", async () => {
  const estatus = (headers: Record<string, string>, valor: string) =>
    pedir("POST", `/desarrollos/${id}/estatus`, headers, { estatus: valor });

  assert.equal((await estatus(corporativo, "publicado")).statusCode, 409);
  assert.equal((await estatus(cerrador, "revision")).statusCode, 200);
  assert.equal((await estatus(cerrador, "due_diligence")).statusCode, 403);
  assert.equal((await estatus(gerente, "due_diligence")).statusCode, 200);

  const sinDD = await estatus(corporativo, "aprobado");
  assert.equal(sinDD.statusCode, 409);
  assert.match(sinDD.json().error, /due diligence/);

  const dd = await pedir("PATCH", `/desarrollos/${id}`, corporativo, { interna: { dueDiligence: "validado" } });
  assert.equal(dd.statusCode, 200);
  assert.equal((await estatus(corporativo, "aprobado")).statusCode, 200);

  const publicado = await estatus(corporativo, "publicado");
  assert.equal(publicado.statusCode, 200, publicado.body);
  assert.equal(publicado.json().estatus, "publicado");
});

test("publicado, lo que ve el cliente sólo cambia con un cambio registrado", async () => {
  const entrega = await pedir("PATCH", `/desarrollos/${id}`, cerrador, { entrega: "Julio 2028" });
  assert.equal(entrega.statusCode, 409);
  assert.deepEqual(entrega.json().detalle, ["Fecha de entrega"]);

  const d: Desarrollo = (await pedir("GET", `/desarrollos/${id}`, cerrador)).json();
  const t = d.tipologias[0];
  const precio = await pedir("PUT", `/desarrollos/${id}/tipologias`, cerrador, {
    ...t,
    niveles: t.niveles.map((n, i) => (i === 0 ? { ...n, precioVenta: 2_900_000 } : n)),
  });
  assert.equal(precio.statusCode, 409);

  const borrar = await pedir("DELETE", `/desarrollos/${id}/tipologias/${t.id}`, cerrador);
  assert.equal(borrar.statusCode, 409);

  // Lo que no toca al cliente sí se edita, y una tipología nueva se agrega.
  const argumentos = await pedir("PATCH", `/desarrollos/${id}`, cerrador, {
    comercial: { argumentos: ["A 5 minutos de la playa", "Roof garden con vista al mar"] },
  });
  assert.equal(argumentos.statusCode, 200);
  const nueva = await pedir("PUT", `/desarrollos/${id}/tipologias`, cerrador, {
    nombre: "Penthouse",
    niveles: [{ nombre: "Último nivel", precioVenta: 5_200_000, disponibles: 2 }],
  });
  assert.equal(nueva.statusCode, 200);

  // Y el precio se cambia por la vía correcta.
  const cambio = await pedir("POST", "/cambios", cerrador, {
    desarrolloId: id,
    destino: { campo: "precio", tipologiaId: t.id, nivel: "Planta baja" },
    valorNuevo: "$2,900,000",
    fuente: "lista_precios",
    evidenciaUrl: "https://archivos.ejemplo/lista.pdf",
  });
  assert.equal(cambio.statusCode, 201);
  assert.equal(cambio.json().cambio.estado, "publicado");
});

test("retirar del portal regresa a aprobado", async () => {
  const r = await pedir("POST", `/desarrollos/${id}/estatus`, corporativo, { estatus: "aprobado" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().estatus, "aprobado");
});
