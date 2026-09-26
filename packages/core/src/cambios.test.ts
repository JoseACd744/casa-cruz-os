import assert from "node:assert/strict";
import { test } from "node:test";
import {
  efectoDeCambio,
  entregaDe,
  etiquetaDestino,
  interpretarValor,
  motivoParaNoAprobar,
  novedadesDe,
  resolverDestino,
  valorActual,
} from "./cambios.ts";
import { desarrollos, cambios } from "./mock.ts";
import { requiereAprobacion } from "./reglas.ts";

const playa = structuredClone(desarrollos.find((d) => d.id === "playa-park")!);
const precioPB = { campo: "precio" as const, tipologiaId: "pp-3hab", nivel: "Planta baja" };

test("el valor escrito se interpreta como dato, no como texto libre", () => {
  assert.deepEqual(interpretarValor("precio", "$3,500,000"), { ok: true, valor: 3500000, texto: "$3,500,000" });
  assert.deepEqual(interpretarValor("precio", "3500000 MXN"), { ok: true, valor: 3500000, texto: "$3,500,000" });
  assert.deepEqual(interpretarValor("disponibilidad", "12 unidades"), { ok: true, valor: 12, texto: "12 unidades" });
  assert.deepEqual(interpretarValor("comision", "4,5 %"), { ok: true, valor: 4.5, texto: "4.5%" });
  assert.deepEqual(interpretarValor("entrega", "julio de 2027"), { ok: true, valor: "Julio 2027", texto: "Julio 2027" });

  assert.equal(interpretarValor("precio", "3.5 millones").ok, false);
  assert.equal(interpretarValor("precio", "350").ok, false);
  assert.equal(interpretarValor("disponibilidad", "-2").ok, false);
  assert.equal(interpretarValor("comision", "150").ok, false);
  assert.equal(interpretarValor("entrega", "pronto").ok, false);
  assert.equal(interpretarValor("promocion", "   ").ok, false);
});

test("la entrega se entiende en varias formas y siempre queda con su ISO", () => {
  assert.deepEqual(entregaDe("Marzo 2027"), { texto: "Marzo 2027", iso: "2027-03" });
  assert.deepEqual(entregaDe("03/2027"), { texto: "Marzo 2027", iso: "2027-03" });
  assert.deepEqual(entregaDe("2027-11"), { texto: "Noviembre 2027", iso: "2027-11" });
  assert.equal(entregaDe("13/2027"), null);
});

test("el valor anterior lo sabe la Base Maestra, no quien registra el cambio", () => {
  assert.equal(valorActual(playa, precioPB), "$3,500,000");
  assert.equal(valorActual(playa, { campo: "entrega" }), "Marzo 2027");
  assert.equal(valorActual(playa, { campo: "comision" }), "[SIN CAPTURAR]");
  assert.equal(etiquetaDestino(playa, precioPB), "Precio de venta · Departamento 3 habitaciones · Planta baja");
});

test("un destino que no existe se rechaza", () => {
  assert.equal(resolverDestino(playa, { campo: "precio", tipologiaId: "pp-3hab", nivel: "Penthouse" }).ok, false);
  assert.equal(resolverDestino(playa, { campo: "precio", tipologiaId: "nada", nivel: "Planta baja" }).ok, false);
  assert.equal(resolverDestino(playa, { campo: "entrega" }).ok, true);
});

test("un precio nuevo cambia sólo su nivel, y la lista lo sigue si no había descuento", () => {
  const efecto = efectoDeCambio(playa, precioPB, 3_600_000);
  assert.equal(efecto.tipo, "tipologia");
  if (efecto.tipo !== "tipologia") return;
  const pb = efecto.tipologia.niveles.find((n) => n.nombre === "Planta baja")!;
  const n1 = efecto.tipologia.niveles.find((n) => n.nombre === "Primer nivel")!;
  assert.equal(pb.precioVenta, 3_600_000);
  assert.equal(pb.precioLista, 3_600_000);
  assert.equal(n1.precioVenta, 3_300_000);
  // El original no se toca: el efecto es una copia.
  assert.equal(playa.tipologias[1].niveles[0].precioVenta, 3_500_000);
});

test("un enganche nuevo ajusta el resto cuando lo complementaba", () => {
  const efecto = efectoDeCambio(playa, { campo: "enganche" }, 20);
  assert.deepEqual(efecto, { tipo: "desarrollo", parche: { condiciones: { enganchePct: 20, restoPct: 80 } } });
});

test("la entrega guarda también su ISO para ordenar", () => {
  assert.deepEqual(efectoDeCambio(playa, { campo: "entrega" }, "Julio 2027"), {
    tipo: "desarrollo",
    parche: { entrega: "Julio 2027", entregaIso: "2027-07" },
  });
});

test("el enganche es parte del esquema: siempre pasa por aprobación", () => {
  assert.equal(requiereAprobacion("enganche", "lista_precios", true), true);
  assert.equal(requiereAprobacion("promocion", "brochure", true), false);
});

test("nadie aprueba su propio cambio, ni uno ya resuelto", () => {
  const pendiente = { estado: "pendiente" as const, usuarioId: "u-jorge" };
  assert.equal(motivoParaNoAprobar(pendiente, { id: "u-gerente-rm", rol: "gerente" }), null);
  assert.equal(motivoParaNoAprobar(pendiente, { id: "u-jorge", rol: "corporativo" })?.codigo, 403);
  assert.equal(motivoParaNoAprobar(pendiente, { id: "u-mariana", rol: "cerrador" })?.codigo, 403);
  assert.equal(
    motivoParaNoAprobar({ ...pendiente, estado: "publicado" }, { id: "u-corp", rol: "corporativo" })?.codigo,
    409,
  );
});

test("las novedades son los cambios publicados, del más reciente al más antiguo", () => {
  const novedades = novedadesDe(cambios);
  assert.ok(novedades.length > 0);
  assert.equal(novedades[0].fecha, "14 SEP");
  assert.ok(novedades[0].detalle.includes("$3,450,000 → $3,500,000"));
  assert.ok(novedades.every((n) => !n.titulo.includes("Comisión")));
});
