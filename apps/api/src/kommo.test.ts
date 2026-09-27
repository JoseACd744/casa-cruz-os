import assert from "node:assert/strict";
import { after, test } from "node:test";

// La clave del webhook se lee al arrancar: se define antes de cargar el servidor.
process.env.KOMMO_WEBHOOK_SECRETO = "secreto-de-prueba";
const { CORREOS, entrar, servidorDePrueba } = await import("./prueba");

/** Lo que Kommo le avisa a Casa Cruz OS. */

const app = await servidorDePrueba();
after(() => app.close());

const gerente = await entrar(app, CORREOS.gerente);
const cerrador = await entrar(app, CORREOS.cerrador);

const avisar = (cuerpo: Record<string, string>, clave = "secreto-de-prueba") =>
  app.inject({
    method: "POST",
    url: `/webhooks/kommo?clave=${encodeURIComponent(clave)}`,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: new URLSearchParams(cuerpo).toString(),
  });

const clientePorLead = async (lead: string) => {
  const clientes = (await app.inject({ method: "GET", url: "/clientes", headers: cerrador })).json();
  return clientes.filter((c: { kommoLeadId: string | null }) => c.kommoLeadId === lead);
};

test("sin la clave correcta no entra nada", async () => {
  assert.equal((await avisar({ "leads[add][0][id]": "9001" }, "otra")).statusCode, 401);
  const sinClave = await app.inject({
    method: "POST",
    url: "/webhooks/kommo",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: "leads[add][0][id]=9001",
  });
  assert.equal(sinClave.statusCode, 401);
  assert.equal((await clientePorLead("9001")).length, 0);
});

test("un lead nuevo en Kommo aparece como cliente, una sola vez", async () => {
  const cuerpo = {
    "leads[add][0][id]": "9001",
    "leads[add][0][name]": "Familia Castañeda Rivera",
    "leads[add][0][status_id]": "142",
    "account[subdomain]": "casacruz",
  };
  const r = await avisar(cuerpo);
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().procesados, 1);
  await avisar(cuerpo); // Kommo reintenta: no debe duplicar.

  const [cliente, ...otros] = await clientePorLead("9001");
  assert.equal(otros.length, 0);
  assert.equal(cliente.nombre, "Familia Castañeda Rivera");
  assert.equal(cliente.kommoEtapa, "Ganado");
  assert.equal(cliente.actividad[0].texto, "Lead creado en Kommo.");
});

test("un cambio de etapa se refleja y queda en la actividad", async () => {
  await avisar({ "leads[status][0][id]": "9001", "leads[status][0][status_id]": "143" });
  const [cliente] = await clientePorLead("9001");
  assert.equal(cliente.kommoEtapa, "Perdido");
  assert.equal(cliente.actividad[0].texto, "Etapa en Kommo: Perdido.");
});

test("un lead de antes de conectar la integración también se da de alta", async () => {
  await avisar({ "leads[status][0][id]": "9002", "leads[status][0][status_id]": "555" });
  const [cliente] = await clientePorLead("9002");
  assert.equal(cliente.nombre, "[NOMBRE EN KOMMO] · lead 9002");
  assert.equal(cliente.kommoEtapa, "Etapa 555");
});

test("la bitácora de la integración es de gerente para arriba", async () => {
  const r = await app.inject({ method: "GET", url: "/integraciones/kommo", headers: gerente });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().webhook, true);
  assert.ok(r.json().ultimoEvento);
  assert.ok(r.json().eventos.some((e: { resultado: string }) => e.resultado === "cliente creado"));
  assert.ok(r.json().eventos.some((e: { resultado: string }) => e.resultado === "ya estaba al día"));

  const paraCerrador = (await app.inject({ method: "GET", url: "/integraciones/kommo", headers: cerrador })).json();
  assert.equal(paraCerrador.eventos.length, 0);
  assert.ok(paraCerrador.ultimoEvento);
});
