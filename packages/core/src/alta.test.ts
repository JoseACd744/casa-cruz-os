import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cambiosProtegidosEnParche,
  cambiosProtegidosEnTipologia,
  completitud,
  estaProtegido,
  motivoParaNoMover,
} from "./alta.ts";
import { desarrollos } from "./mock.ts";
import type { Desarrollo } from "./types.ts";

const publicado = structuredClone(desarrollos.find((d) => d.id === "playa-park")!);
const borrador: Desarrollo = { ...structuredClone(publicado), estatus: "borrador" };

test("en captura se edita libre; ya aprobado, lo que ve el cliente va por cambios", () => {
  assert.equal(estaProtegido("borrador", "precio"), false);
  assert.equal(estaProtegido("publicado", "precio"), true);
  assert.equal(estaProtegido("aprobado", "entrega"), true);
  // La comisión siempre es un cambio con aprobación, aun en borrador.
  assert.equal(estaProtegido("borrador", "comision"), true);
});

test("un parche que toca la entrega de un publicado se detiene", () => {
  assert.deepEqual(cambiosProtegidosEnParche(publicado, { entrega: "Junio 2027" }), ["Fecha de entrega"]);
  assert.deepEqual(cambiosProtegidosEnParche(borrador, { entrega: "Junio 2027" }), []);
  // Mandar el mismo valor no es un cambio.
  assert.deepEqual(cambiosProtegidosEnParche(publicado, { entrega: publicado.entrega }), []);
  assert.deepEqual(cambiosProtegidosEnParche(borrador, { interna: { comisionPct: 4 } }), ["Comisión autorizada"]);
});

test("en un publicado se agregan tipologías, pero sus precios no se editan a mano", () => {
  const tipo = publicado.tipologias[1];
  const niveles = tipo.niveles.map((n) => ({ ...n }));
  assert.deepEqual(cambiosProtegidosEnTipologia(publicado, { id: tipo.id, niveles }), []);

  niveles[0].precioVenta = 3_999_000;
  assert.deepEqual(cambiosProtegidosEnTipologia(publicado, { id: tipo.id, niveles }), ["Precio de Planta baja"]);
  assert.deepEqual(cambiosProtegidosEnTipologia(borrador, { id: tipo.id, niveles }), []);

  const nueva = { id: "pp-penthouse", niveles: [{ nombre: "PH", precioVenta: 6_000_000 }] };
  assert.deepEqual(cambiosProtegidosEnTipologia(publicado, nueva), []);

  const sinUnNivel = tipo.niveles.slice(1).map((n) => ({ ...n }));
  assert.deepEqual(cambiosProtegidosEnTipologia(publicado, { id: tipo.id, niveles: sinUnNivel }), [
    "Planta baja (se quitaría)",
  ]);
});

test("la completitud dice qué falta, sección por sección", () => {
  const { porcentaje, secciones } = completitud(publicado);
  assert.ok(porcentaje > 0 && porcentaje < 100);
  const multimedia = secciones.find((s) => s.seccion === "multimedia")!;
  assert.ok(multimedia.faltan.includes("3 fotos o renders"));
  const identificacion = secciones.find((s) => s.seccion === "identificacion")!;
  assert.ok(identificacion.faltan.includes("dirección"));
});

test("el alta va paso por paso y cada paso tiene su dueño", () => {
  assert.equal(motivoParaNoMover(borrador, "revision", "cerrador"), null);
  assert.equal(motivoParaNoMover(borrador, "publicado", "corporativo")?.codigo, 409);

  const enRevision: Desarrollo = { ...borrador, estatus: "revision" };
  assert.equal(motivoParaNoMover(enRevision, "due_diligence", "cerrador")?.codigo, 403);
  assert.equal(motivoParaNoMover(enRevision, "due_diligence", "gerente"), null);

  const enDD: Desarrollo = {
    ...borrador,
    estatus: "due_diligence",
    interna: { ...borrador.interna, dueDiligence: "en_proceso" },
  };
  assert.match(motivoParaNoMover(enDD, "aprobado", "corporativo")!.mensaje, /due diligence/);

  const aprobado: Desarrollo = { ...borrador, estatus: "aprobado" };
  const sinFotos = motivoParaNoMover(aprobado, "publicado", "corporativo");
  assert.equal(sinFotos?.codigo, 409);
  assert.ok(sinFotos?.detalle?.some((t) => t.includes("fotos")));
});
