import assert from "node:assert/strict";
import { test } from "node:test";
import { calificar, estadoDePlaza, publica, venceDesde } from "./capacitacion.ts";
import { avanceCapacitacion, modulosCapacitacion, preguntasEvaluacion } from "./mock.ts";

const hoy = new Date("2026-09-26T18:00:00Z");
const jorge = avanceCapacitacion["u-jorge"];

test("la evaluación se aprueba con 80 %", () => {
  const preguntas = preguntasEvaluacion.filter((p) => p.plazaId === "puebla");
  const todas = Object.fromEntries(preguntas.map((p) => [p.id, p.correcta]));
  assert.equal(calificar(preguntas, todas).aprobado, true);

  const unaMal = { ...todas, [preguntas[0].id]: (preguntas[0].correcta + 1) % 3 };
  const r = calificar(preguntas, unaMal);
  assert.deepEqual([r.aciertos, r.total, r.aprobado], [4, 5, true]);
  assert.deepEqual(r.fallidas, [preguntas[0].texto]);

  const dosMal = { ...unaMal, [preguntas[1].id]: (preguntas[1].correcta + 1) % 3 };
  assert.equal(calificar(preguntas, dosMal).aprobado, false);
  assert.equal(calificar(preguntas, {}).aprobado, false);
});

test("la respuesta correcta nunca viaja al navegador", () => {
  const p = publica(preguntasEvaluacion[0]);
  assert.equal("correcta" in p, false);
  assert.ok(p.opciones.length >= 3);
});

test("el avance cuenta módulos y evaluación; la vigencia decide si está certificado", () => {
  const puebla = estadoDePlaza("puebla", modulosCapacitacion, jorge, hoy);
  assert.equal(puebla.estado, "en_progreso");
  assert.equal(puebla.avance, 60); // 3 de 4 módulos + evaluación pendiente
  assert.equal(puebla.puedeEvaluarse, false);

  assert.equal(estadoDePlaza("riviera-maya", modulosCapacitacion, jorge, hoy).estado, "certificado");
  assert.equal(estadoDePlaza("queretaro", modulosCapacitacion, jorge, hoy).estado, "no_iniciado");

  const despues = new Date("2027-04-01T00:00:00Z");
  assert.equal(estadoDePlaza("riviera-maya", modulosCapacitacion, jorge, despues).estado, "vencido");
});

test("la certificación dura doce meses", () => {
  assert.equal(venceDesde(new Date("2026-09-26T18:00:00Z")), "2027-09-26T18:00:00.000Z");
});
