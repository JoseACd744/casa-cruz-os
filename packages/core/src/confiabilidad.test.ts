import assert from "node:assert/strict";
import { test } from "node:test";
import { advertencia, confiabilidad, estadoValidaciones, semaforo } from "./confiabilidad.ts";
import type { Desarrollo } from "./types.ts";

function desarrolloCon(validaciones: Desarrollo["validaciones"]): Desarrollo {
  return { validaciones } as Desarrollo;
}

test("todo validado hoy da 100%", () => {
  const d = desarrolloCon([
    { campo: "precio", validadoPor: "Jorge", haceDias: 0 },
    { campo: "disponibilidad", validadoPor: "Jorge", haceDias: 0 },
    { campo: "promocion", validadoPor: "Jorge", haceDias: 0 },
    { campo: "entrega", validadoPor: "Jorge", haceDias: 0 },
    { campo: "comision", validadoPor: "Jorge", haceDias: 0 },
  ]);
  assert.equal(confiabilidad(d), 100);
  assert.equal(semaforo(100), "ok");
});

test("sin ninguna validación, la confiabilidad es cero", () => {
  assert.equal(confiabilidad(desarrolloCon([])), 0);
  assert.equal(semaforo(0), "alert");
});

test("un campo pasado de su vigencia cuenta la mitad", () => {
  // Precio pesa 30 de 100 y vence a los 15 días; a los 20 suma 15.
  const d = desarrolloCon([{ campo: "precio", validadoPor: "Jorge", haceDias: 20 }]);
  assert.equal(confiabilidad(d), 15);
  assert.equal(estadoValidaciones(d)[0].estado, "por_vencer");
});

test("la disponibilidad vencida avisa antes de enviarla al cliente", () => {
  const d = desarrolloCon([{ campo: "disponibilidad", validadoPor: "Jorge", haceDias: 40 }]);
  assert.match(advertencia(d) ?? "", /disponibilidad no se confirma desde hace 40 días/i);
});
