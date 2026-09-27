import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Cliente, Propuesta } from "@casacruz/core";
import { CORREOS, entrar, servidorDePrueba } from "./prueba";

/** Del cliente nuevo a la propuesta abierta por el cliente. */

const app = await servidorDePrueba();
after(() => app.close());

// La regla de plazas certificadas se prueba en usuarios.test.ts, donde se certifica a alguien.
const jorge = await entrar(app, CORREOS.cerrador);

let cliente: Cliente;
let propuesta: Propuesta;

const obtenerCliente = async (id: string): Promise<Cliente> =>
  (await app.inject({ method: "GET", url: `/clientes/${id}`, headers: jorge })).json();

test("un cliente nuevo queda a nombre de quien lo registra", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/clientes",
    headers: jorge,
    payload: {
      nombre: "Mónica Salas y Andrés Pérez",
      ciudadResidencia: "Monterrey",
      presupuestoMin: 2_500_000,
      presupuestoMax: 3_200_000,
      recamaras: "2",
      objetivo: "inversion",
      plazasInteres: ["riviera-maya"],
    },
  });
  assert.equal(r.statusCode, 201, r.body);
  cliente = r.json();
  assert.equal(cliente.responsableId, "u-jorge");
  assert.equal(cliente.actividad[0].texto, "Alta en Casa Cruz OS.");
  assert.ok("kommoUrl" in (await obtenerCliente(cliente.id)));
});

test("sólo lo publicado entra en una propuesta", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/propuestas",
    headers: jorge,
    payload: { clienteId: cliente.id, formato: "web", items: [{ desarrolloId: "cascatta" }] },
  });
  assert.equal(r.statusCode, 409);
  assert.match(r.json().detalle[0], /no está publicado/);
});

test("una tipología ajena al desarrollo se rechaza", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/propuestas",
    headers: jorge,
    payload: {
      clienteId: cliente.id,
      formato: "web",
      items: [{ desarrolloId: "playa-park", tipologiaId: "ra-2hab-n1" }],
    },
  });
  assert.equal(r.statusCode, 400);
});

test("la propuesta congela el precio del nivel elegido", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/propuestas",
    headers: jorge,
    payload: {
      clienteId: cliente.id,
      formato: "web",
      enviar: true,
      items: [
        { desarrolloId: "playa-park", tipologiaId: "pp-2hab", nivel: "Tercer nivel", razon: "La de mejor precio" },
        { desarrolloId: "real-aurora", tipologiaId: "ra-2hab-n1" },
      ],
    },
  });
  assert.equal(r.statusCode, 201, r.body);
  propuesta = r.json();
  assert.equal(propuesta.estado, "enviada");
  assert.equal(propuesta.items[0].precioCongelado, 2_555_000);
  assert.equal(propuesta.items[0].razon, "La de mejor precio");
});

test("la primera vez que el cliente abre su enlace queda en su actividad", async () => {
  const primera = await app.inject({ method: "POST", url: `/propuestas/${propuesta.slug}/vista` });
  assert.equal(primera.json().vistas, 1);
  const segunda = await app.inject({ method: "POST", url: `/propuestas/${propuesta.slug}/vista` });
  assert.equal(segunda.json().vistas, 2);

  const { actividad } = await obtenerCliente(cliente.id);
  assert.equal(actividad.filter((a) => a.texto.startsWith("Abrió su propuesta")).length, 1);
});

test("el interés del cliente llega a su asesor", async () => {
  const r = await app.inject({
    method: "POST",
    url: `/propuestas/${propuesta.slug}/interes`,
    payload: { accion: "conocer", desarrolloId: "playa-park" },
  });
  assert.equal(r.statusCode, 200, r.body);
  assert.match(r.json().mensaje, /Jorge Díaz/);
  assert.equal(r.json().whatsapp, null); // El asesor todavía no tiene teléfono capturado.

  const { actividad } = await obtenerCliente(cliente.id);
  assert.equal(actividad[0].texto, "Pidió conocer Playa Park desde su propuesta.");

  const ajena = await app.inject({
    method: "POST",
    url: `/propuestas/${propuesta.slug}/interes`,
    payload: { accion: "conocer", desarrolloId: "cascatta" },
  });
  assert.equal(ajena.statusCode, 400);
});
