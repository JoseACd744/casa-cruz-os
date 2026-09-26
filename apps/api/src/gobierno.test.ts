import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Desarrollo } from "@casacruz/core";
import { CORREOS, entrar, servidorDePrueba } from "./prueba";

/**
 * El gobierno del dato de punta a punta. Las pruebas van en orden: cada una
 * parte del estado que dejó la anterior, como pasaría en un día de trabajo.
 */

const app = await servidorDePrueba();
after(() => app.close());

const cerrador = await entrar(app, CORREOS.cerrador);
const gerente = await entrar(app, CORREOS.gerente);
const corporativo = await entrar(app, CORREOS.corporativo);

const EVIDENCIA = "https://archivos.ejemplo/lista-precios-octubre.pdf";

async function desarrollo(id: string): Promise<Desarrollo> {
  const r = await app.inject({ method: "GET", url: `/desarrollos/${id}`, headers: cerrador });
  return r.json();
}

function precio(d: Desarrollo, tipologiaId: string, nivel: string) {
  return d.tipologias.find((t) => t.id === tipologiaId)!.niveles.find((n) => n.nombre === nivel)!;
}

async function registrar(headers: Record<string, string>, cuerpo: Record<string, unknown>) {
  return app.inject({ method: "POST", url: "/cambios", headers, payload: cuerpo });
}

async function resolver(headers: Record<string, string>, id: string, decision: "aprobar" | "rechazar") {
  return app.inject({ method: "POST", url: `/cambios/${id}/${decision}`, headers });
}

test("un precio con lista oficial y evidencia se publica y cambia el dato", async () => {
  const r = await registrar(cerrador, {
    desarrolloId: "playa-park",
    destino: { campo: "precio", tipologiaId: "pp-3hab", nivel: "Primer nivel" },
    valorNuevo: "3,350,000",
    fuente: "lista_precios",
    evidenciaUrl: EVIDENCIA,
  });
  assert.equal(r.statusCode, 201, r.body);
  const { cambio, requiereAprobacion } = r.json();
  assert.equal(requiereAprobacion, false);
  assert.equal(cambio.estado, "publicado");
  // El valor anterior lo pone el servidor, y el nuevo queda normalizado.
  assert.equal(cambio.valorAnterior, "$3,300,000");
  assert.equal(cambio.valorNuevo, "$3,350,000");
  assert.equal(cambio.usuario, "Jorge Díaz");

  const d = await desarrollo("playa-park");
  assert.equal(precio(d, "pp-3hab", "Primer nivel").precioVenta, 3_350_000);
  assert.equal(precio(d, "pp-3hab", "Planta baja").precioVenta, 3_500_000);

  const conf = await app.inject({ method: "GET", url: "/desarrollos/playa-park/confiabilidad", headers: cerrador });
  const campoPrecio = conf.json().campos.find((c: { campo: string }) => c.campo === "precio");
  assert.equal(campoPrecio.haceDias, 0);
  assert.equal(campoPrecio.validadoPor, "Jorge Díaz");
});

test("el mismo valor no es un cambio", async () => {
  const r = await registrar(cerrador, {
    desarrolloId: "playa-park",
    destino: { campo: "precio", tipologiaId: "pp-3hab", nivel: "Primer nivel" },
    valorNuevo: "$3,350,000",
    fuente: "lista_precios",
    evidenciaUrl: EVIDENCIA,
  });
  assert.equal(r.statusCode, 409);
  assert.match(r.json().error, /CONFIRMAR/);
});

test("un valor que no se entiende o un destino que no existe se rechazan", async () => {
  const base = { desarrolloId: "playa-park", fuente: "lista_precios", evidenciaUrl: EVIDENCIA };
  const caro = await registrar(cerrador, {
    ...base,
    destino: { campo: "precio", tipologiaId: "pp-3hab", nivel: "Primer nivel" },
    valorNuevo: "caro",
  });
  assert.equal(caro.statusCode, 400);

  const penthouse = await registrar(cerrador, {
    ...base,
    destino: { campo: "precio", tipologiaId: "pp-3hab", nivel: "Penthouse" },
    valorNuevo: "$5,000,000",
  });
  assert.equal(penthouse.statusCode, 400);

  const fantasma = await registrar(cerrador, {
    ...base,
    desarrolloId: "no-existe",
    destino: { campo: "entrega" },
    valorNuevo: "Marzo 2028",
  });
  assert.equal(fantasma.statusCode, 404);
});

test("la comisión espera aprobación y al aprobarse se aplica", async () => {
  const r = await registrar(cerrador, {
    desarrolloId: "playa-park",
    destino: { campo: "comision" },
    valorNuevo: "4",
    fuente: "convenio",
    evidenciaUrl: EVIDENCIA,
  });
  assert.equal(r.statusCode, 201);
  const { cambio } = r.json();
  assert.equal(cambio.estado, "pendiente");
  assert.equal((await desarrollo("playa-park")).interna.comisionPct, null);

  const cerradorAprueba = await resolver(cerrador, cambio.id, "aprobar");
  assert.equal(cerradorAprueba.statusCode, 403);

  const aprobado = await resolver(gerente, cambio.id, "aprobar");
  assert.equal(aprobado.statusCode, 200, aprobado.body);
  assert.equal(aprobado.json().estado, "publicado");
  assert.equal(aprobado.json().aprobadoPor, "[GERENTE RIVIERA MAYA]");
  assert.equal((await desarrollo("playa-park")).interna.comisionPct, 4);

  const otraVez = await resolver(gerente, cambio.id, "aprobar");
  assert.equal(otraVez.statusCode, 409);
});

test("nadie aprueba su propio cambio", async () => {
  const r = await registrar(gerente, {
    desarrolloId: "real-aurora",
    destino: { campo: "entrega" },
    valorNuevo: "agosto de 2027",
    fuente: "correo",
    evidenciaUrl: EVIDENCIA,
  });
  assert.equal(r.statusCode, 201);
  const { cambio } = r.json();
  assert.equal(cambio.estado, "pendiente");

  const propio = await resolver(gerente, cambio.id, "aprobar");
  assert.equal(propio.statusCode, 403);
  assert.match(propio.json().error, /propio/);

  const porCorporativo = await resolver(corporativo, cambio.id, "aprobar");
  assert.equal(porCorporativo.statusCode, 200);
  const d = await desarrollo("real-aurora");
  assert.equal(d.entrega, "Agosto 2027");
  assert.equal(d.entregaIso, "2027-08");
});

test("si el dato se movió mientras esperaba, aprobar no lo pisa", async () => {
  const destino = { campo: "precio", tipologiaId: "pp-2hab", nivel: "Planta baja" };
  const porLlamada = await registrar(cerrador, {
    desarrolloId: "playa-park",
    destino,
    valorNuevo: "$2,990,000",
    fuente: "llamada",
  });
  assert.equal(porLlamada.statusCode, 201);
  const pendiente = porLlamada.json().cambio;
  assert.equal(pendiente.estado, "pendiente");

  const conLista = await registrar(cerrador, {
    desarrolloId: "playa-park",
    destino,
    valorNuevo: "$3,000,000",
    fuente: "lista_precios",
    evidenciaUrl: EVIDENCIA,
  });
  assert.equal(conLista.json().cambio.estado, "publicado");

  const viejo = await resolver(gerente, pendiente.id, "aprobar");
  assert.equal(viejo.statusCode, 409);
  assert.match(viejo.json().error, /cambió mientras esperaba/);

  const rechazado = await resolver(gerente, pendiente.id, "rechazar");
  assert.equal(rechazado.statusCode, 200);
  assert.equal(rechazado.json().estado, "rechazado");
  assert.equal(precio(await desarrollo("playa-park"), "pp-2hab", "Planta baja").precioVenta, 3_000_000);
});

test("un cambio histórico sin destino se aprueba sin tocar datos", async () => {
  const antes = await desarrollo("playa-park");
  const r = await resolver(gerente, "ch-4", "aprobar");
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().estado, "publicado");
  assert.deepEqual((await desarrollo("playa-park")).interna, antes.interna);
});

test("las novedades muestran lo último que se publicó", async () => {
  const r = await app.inject({ method: "GET", url: "/novedades", headers: cerrador });
  assert.equal(r.statusCode, 200);
  // Lo más reciente: el cambio histórico que se acaba de aprobar.
  assert.match(r.json()[0].titulo, /Comisión autorizada/);
  assert.match(r.json()[1].detalle, /\$2,970,000 → \$3,000,000/);
});

test("la bitácora se exporta en CSV para gerente, no para cerrador", async () => {
  const r = await app.inject({ method: "GET", url: "/cambios/exportar", headers: gerente });
  assert.equal(r.statusCode, 200);
  assert.match(String(r.headers["content-type"]), /text\/csv/);
  assert.match(String(r.headers["content-disposition"]), /bitacora-casa-cruz-/);
  assert.ok(r.body.startsWith("﻿"));
  assert.match(r.body, /"Valor anterior"/);
  assert.match(r.body, /\$3,350,000/);

  const prohibido = await app.inject({ method: "GET", url: "/cambios/exportar", headers: cerrador });
  assert.equal(prohibido.statusCode, 403);
});
