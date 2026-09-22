import assert from "node:assert/strict";
import { test } from "node:test";
import { esCampoSensible, puedePublicarse, requiereAprobacion, requisitosParaPublicar } from "./reglas.ts";

test("un precio con lista oficial y evidencia se publica solo", () => {
  assert.equal(requiereAprobacion("precio", "lista_precios", true), false);
});

test("sin evidencia documental, el cambio espera aprobación", () => {
  assert.equal(requiereAprobacion("precio", "lista_precios", false), true);
});

test("una llamada nunca basta por sí sola", () => {
  assert.equal(requiereAprobacion("precio", "llamada", true), true);
});

test("la comisión siempre pasa por aprobación, venga de donde venga", () => {
  assert.equal(requiereAprobacion("comision", "convenio", true), true);
  assert.equal(esCampoSensible("Comisión autorizada"), true);
  assert.equal(esCampoSensible("Fecha contractual de entrega"), true);
  assert.equal(esCampoSensible("promoción"), false);
});

const desarrolloCompleto = {
  tipologias: [{ niveles: [{ precioVenta: 3_070_000 }] }],
  multimedia: [{ tipo: "render" }, { tipo: "foto" }, { tipo: "foto" }],
  condiciones: { enganchePct: 10 },
  comercial: { argumentos: ["Entrega marzo 2027"], objeciones: ["Sin elevador"] },
  interna: { dueDiligence: "validado" },
};

test("un desarrollo completo puede publicarse", () => {
  assert.equal(puedePublicarse(desarrolloCompleto), true);
});

test("sin precio capturado no se publica", () => {
  const sinPrecio = {
    ...desarrolloCompleto,
    tipologias: [{ niveles: [{ precioVenta: null }] }],
  };
  assert.equal(puedePublicarse(sinPrecio), false);
  const falta = requisitosParaPublicar(sinPrecio).find((r) => !r.cumple);
  assert.equal(falta?.clave, "precio");
});

test("con menos de tres imágenes tampoco", () => {
  const pocasFotos = { ...desarrolloCompleto, multimedia: [{ tipo: "foto" }] };
  assert.equal(puedePublicarse(pocasFotos), false);
});
