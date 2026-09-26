import assert from "node:assert/strict";
import { test } from "node:test";
import { claveMes, fechaCorta, fechaHora, primeroDelMesSiguiente, saludo } from "./fechas.ts";
import { galeria, planoDe } from "./galeria.ts";
import { iniciales } from "./format.ts";
import { alcanza } from "./roles.ts";

test("las fechas se leen con la hora del centro de México, no con la del servidor", () => {
  // 01:30 UTC del 1 de octubre todavía es 30 de septiembre en México.
  const fecha = new Date("2026-10-01T01:30:00Z");
  assert.equal(fechaCorta(fecha), "30 sep 2026");
  assert.equal(fechaHora(fecha), "30 sep 2026 · 19:30");
  assert.equal(claveMes(fecha), "2026-09");
});

test("la rotación mensual cae el primero del mes siguiente, también en diciembre", () => {
  assert.equal(primeroDelMesSiguiente(new Date("2026-09-26T18:00:00Z")), "1 de octubre");
  assert.equal(primeroDelMesSiguiente(new Date("2026-12-15T18:00:00Z")), "1 de enero");
});

test("el saludo depende de la hora local", () => {
  assert.equal(saludo(new Date("2026-09-26T14:00:00Z")), "Buenos días"); // 08:00
  assert.equal(saludo(new Date("2026-09-26T22:00:00Z")), "Buenas tardes"); // 16:00
  assert.equal(saludo(new Date("2026-09-27T03:00:00Z")), "Buenas noches"); // 21:00
});

test("la galería no confunde planos, videos ni brochures con fotos", () => {
  const g = galeria({
    multimedia: [
      { tipo: "video", url: "v.mp4", orden: 0 },
      { tipo: "plano", url: "p1.png", orden: 1 },
      { tipo: "render", url: "fachada.jpg", orden: 2 },
      { tipo: "foto", url: "alberca.jpg", orden: 3 },
      { tipo: "brochure", url: "b.pdf", orden: 4 },
    ],
  });
  assert.equal(g.principal, "fachada.jpg");
  assert.deepEqual(g.secundarias, ["alberca.jpg"]);
  assert.deepEqual(g.planos, ["p1.png"]);
  assert.equal(g.video, "v.mp4");
  assert.equal(g.brochure, "b.pdf");
});

test("el plano propio de la tipología gana al cargado en la galería", () => {
  const d = {
    multimedia: [{ tipo: "plano" as const, url: "general.png", orden: 0 }],
    tipologias: [
      { id: "a", planoUrl: null },
      { id: "b", planoUrl: "propio.png" },
    ],
  };
  assert.equal(planoDe(d, "a"), "general.png");
  assert.equal(planoDe(d, "b"), "propio.png");
  assert.equal(planoDe(d, "z"), null);
});

test("iniciales y jerarquía de roles", () => {
  assert.equal(iniciales("Jorge Díaz"), "JD");
  assert.equal(iniciales("Berenice Gutiérrez y Fabián Dávila"), "BG");
  assert.equal(iniciales("[GERENTE RIVIERA MAYA]"), "··");
  assert.ok(alcanza("corporativo", "gerente"));
  assert.ok(!alcanza("cerrador", "gerente"));
});
