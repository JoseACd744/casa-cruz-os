import assert from "node:assert/strict";
import { after, test } from "node:test";
import { CORREOS, entrar, servidorDePrueba } from "./prueba";

/** De la ruta de capacitación a poder vender la plaza. */

const app = await servidorDePrueba();
after(() => app.close());

const jorge = await entrar(app, CORREOS.cerrador);

const pedir = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
  app.inject({ method, url, headers: jorge, ...(payload ? { payload } : {}) });

test("el avance dice qué falta en cada plaza", async () => {
  const r = await pedir("GET", "/capacitacion");
  assert.equal(r.statusCode, 200);
  const puebla = r.json().plazas.find((p: { plazaId: string }) => p.plazaId === "puebla");
  assert.equal(puebla.estado, "en_progreso");
  assert.equal(puebla.avance, 60);
  assert.equal(puebla.puedeEvaluarse, false);
  const riviera = r.json().plazas.find((p: { plazaId: string }) => p.plazaId === "riviera-maya");
  assert.equal(riviera.estado, "certificado");
});

test("la evaluación se abre hasta terminar los módulos", async () => {
  assert.equal((await pedir("GET", "/capacitacion/puebla/evaluacion")).statusCode, 409);
  const r = await pedir("POST", "/capacitacion/modulos/puebla-objeciones/completar");
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().puedeEvaluarse, true);
  assert.equal(r.json().avance, 80);
});

test("las preguntas llegan sin su respuesta", async () => {
  const r = await pedir("GET", "/capacitacion/puebla/evaluacion");
  assert.equal(r.statusCode, 200);
  assert.ok(r.json().preguntas.length > 0);
  assert.ok(r.json().preguntas.every((p: object) => !("correcta" in p)));
  assert.ok(!r.body.includes("correcta"));
});

test("reprobar no certifica; aprobar certifica y abre la plaza para vender", async () => {
  const { preguntas } = (await pedir("GET", "/capacitacion/puebla/evaluacion")).json();
  const todasEnCero = Object.fromEntries(preguntas.map((p: { id: string }) => [p.id, 0]));
  const reprobado = await pedir("POST", "/capacitacion/puebla/evaluacion", { respuestas: todasEnCero });
  assert.equal(reprobado.statusCode, 200);
  assert.equal(reprobado.json().aprobado, false);
  assert.ok(reprobado.json().fallidas.length > 0);

  // Las respuestas de la prueba: las correctas del contenido de ejemplo.
  const { mock } = await import("@casacruz/core");
  const correctas = Object.fromEntries(
    mock.preguntasEvaluacion.filter((p) => p.plazaId === "puebla").map((p) => [p.id, p.correcta]),
  );
  const aprobado = await pedir("POST", "/capacitacion/puebla/evaluacion", { respuestas: correctas });
  assert.equal(aprobado.statusCode, 200);
  assert.equal(aprobado.json().aprobado, true);
  assert.ok(aprobado.json().certificadoHasta);

  const yo = await pedir("GET", "/sesion");
  assert.ok(yo.json().plazas.includes("puebla"));

  const otraVez = await pedir("GET", "/capacitacion/puebla/evaluacion");
  assert.equal(otraVez.statusCode, 409);
});

test("la preparación guarda sólo lo que existe en la lista", async () => {
  const r = await pedir("PUT", "/capacitacion/preparacion/playa-park", { items: ["video", "recorrido", "inventado"] });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json().items, ["video", "recorrido"]);
});
