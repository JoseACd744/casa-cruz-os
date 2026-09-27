import assert from "node:assert/strict";
import { test } from "node:test";
import { enlaceKommo, enlaceWhatsApp, motivoParaNoProponer, textoDeInteres } from "./comercial.ts";

const playa = { nombre: "Playa Park", plazaId: "riviera-maya", estatus: "publicado" as const };
const cascatta = { nombre: "Cascatta", plazaId: "puebla", estatus: "publicado" as const };

test("un cerrador sólo propone lo publicado de sus plazas certificadas", () => {
  const jorge = { rol: "cerrador" as const, plazasCertificadas: ["riviera-maya"] };
  assert.equal(motivoParaNoProponer(jorge, playa), null);
  assert.match(motivoParaNoProponer(jorge, cascatta)!, /certificado/);
  assert.match(motivoParaNoProponer(jorge, { ...playa, estatus: "aprobado" })!, /publicado/);

  // Gerente y corporativo supervisan: no se les limita por plaza.
  assert.equal(motivoParaNoProponer({ rol: "gerente", plazasCertificadas: [] }, cascatta), null);
  // Pero nadie propone lo que no está publicado.
  assert.ok(motivoParaNoProponer({ rol: "corporativo", plazasCertificadas: [] }, { ...cascatta, estatus: "aprobado" }));
});

test("el enlace de WhatsApp completa la lada de México y lleva el mensaje", () => {
  assert.equal(enlaceWhatsApp("984 555 0192", "Hola"), "https://wa.me/529845550192?text=Hola");
  assert.equal(enlaceWhatsApp("+1 (713) 555-0100", "Hola Jorge"), "https://wa.me/17135550100?text=Hola%20Jorge");
  assert.equal(enlaceWhatsApp(null, "Hola"), null);
  assert.equal(enlaceWhatsApp("123", "Hola"), null);
});

test("el interés del cliente queda escrito en su actividad", () => {
  assert.equal(textoDeInteres("conocer", "Playa Park"), "Pidió conocer Playa Park desde su propuesta.");
  assert.match(textoDeInteres("videollamada"), /videollamada/);
});

test("el enlace a Kommo sólo existe si se conoce la cuenta y el lead", () => {
  assert.equal(enlaceKommo("casacruz", "4821"), "https://casacruz.kommo.com/leads/detail/4821");
  assert.equal(enlaceKommo(null, "4821"), null);
  assert.equal(enlaceKommo("casacruz", null), null);
});
