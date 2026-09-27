import assert from "node:assert/strict";
import { after, test } from "node:test";
import { CORREOS, entrar, servidorDePrueba } from "./prueba";

/** Accesos: invitar, cambiar la clave, certificar y desactivar surten efecto de inmediato. */

const app = await servidorDePrueba();
after(() => app.close());

const corporativo = await entrar(app, CORREOS.corporativo);
const cerrador = await entrar(app, CORREOS.cerrador);

const iniciar = (correo: string, contrasena: string) =>
  app.inject({ method: "POST", url: "/sesion", payload: { correo, contrasena } });
const conToken = (token: string) => ({ authorization: `Bearer ${token}` });

let ana = { id: "", clave: "", token: "" };

test("corporativo invita a alguien con una clave temporal", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/usuarios",
    headers: corporativo,
    payload: {
      nombre: "Ana Torres",
      correo: "Ana.Torres@casacruz.mx",
      rol: "cerrador",
      telefono: "984 555 0192",
      plazasCertificadas: ["riviera-maya"],
    },
  });
  assert.equal(r.statusCode, 201, r.body);
  const { usuario, claveTemporal } = r.json();
  assert.equal(usuario.correo, "ana.torres@casacruz.mx");
  assert.equal(usuario.debeCambiarContrasena, true);
  assert.match(claveTemporal, /^\w{4}-\w{4}-\w{4}$/);
  ana = { ...ana, id: usuario.id, clave: claveTemporal };

  const repetida = await app.inject({
    method: "POST",
    url: "/usuarios",
    headers: corporativo,
    payload: { nombre: "Otra Ana", correo: "ana.torres@casacruz.mx", rol: "cerrador" },
  });
  assert.equal(repetida.statusCode, 409);

  const porCerrador = await app.inject({
    method: "POST",
    url: "/usuarios",
    headers: cerrador,
    payload: { nombre: "Nadie", correo: "nadie@casacruz.mx", rol: "corporativo" },
  });
  assert.equal(porCerrador.statusCode, 403);
});

test("con la clave temporal sólo se puede cambiarla", async () => {
  const r = await iniciar("ana.torres@casacruz.mx", ana.clave);
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().sesion.debeCambiarContrasena, true);
  ana.token = r.json().token;

  const clientes = await app.inject({ method: "GET", url: "/clientes", headers: conToken(ana.token) });
  assert.equal(clientes.statusCode, 403);
  assert.match(clientes.json().error, /clave temporal/);

  const yo = await app.inject({ method: "GET", url: "/sesion", headers: conToken(ana.token) });
  assert.equal(yo.statusCode, 200);

  const debil = await app.inject({
    method: "POST",
    url: "/sesion/contrasena",
    headers: conToken(ana.token),
    payload: { actual: ana.clave, nueva: "torres2026x" },
  });
  assert.equal(debil.statusCode, 400);

  const cambio = await app.inject({
    method: "POST",
    url: "/sesion/contrasena",
    headers: conToken(ana.token),
    payload: { actual: ana.clave, nueva: "selva-tulum-2031" },
  });
  assert.equal(cambio.statusCode, 200, cambio.body);

  // El mismo token ya sirve: no hace falta volver a entrar.
  const ahora = await app.inject({ method: "GET", url: "/clientes", headers: conToken(ana.token) });
  assert.equal(ahora.statusCode, 200);

  assert.equal((await iniciar("ana.torres@casacruz.mx", ana.clave)).statusCode, 401);
  assert.equal((await iniciar("ana.torres@casacruz.mx", "selva-tulum-2031")).statusCode, 200);
});

test("certificar a alguien le abre la plaza en su siguiente petición", async () => {
  // Luis está inactivo en los datos de demostración: primero se reactiva.
  const equipo = (await app.inject({ method: "GET", url: "/usuarios", headers: corporativo })).json();
  const luis = equipo.find((u: { correo: string }) => u.correo === CORREOS.cerradorPuebla);
  assert.equal((await iniciar(CORREOS.cerradorPuebla, "casacruz")).statusCode, 401);

  const reactivar = await app.inject({
    method: "PATCH",
    url: `/usuarios/${luis.id}`,
    headers: corporativo,
    payload: { activo: true },
  });
  assert.equal(reactivar.statusCode, 200);
  const token = (await iniciar(CORREOS.cerradorPuebla, "casacruz")).json().token;

  const propuesta = {
    clienteId: "c-lead-4903",
    formato: "web",
    items: [{ desarrolloId: "playa-park", tipologiaId: "pp-2hab" }],
  };
  const antes = await app.inject({ method: "POST", url: "/propuestas", headers: conToken(token), payload: propuesta });
  assert.equal(antes.statusCode, 403);

  const certificar = await app.inject({
    method: "PATCH",
    url: `/usuarios/${luis.id}`,
    headers: corporativo,
    payload: { plazasCertificadas: ["puebla", "riviera-maya"] },
  });
  assert.equal(certificar.statusCode, 200);

  const despues = await app.inject({ method: "POST", url: "/propuestas", headers: conToken(token), payload: propuesta });
  assert.equal(despues.statusCode, 201, despues.body);
});

test("desactivar corta el acceso aunque la sesión siga abierta", async () => {
  const r = await app.inject({
    method: "PATCH",
    url: `/usuarios/${ana.id}`,
    headers: corporativo,
    payload: { activo: false },
  });
  assert.equal(r.statusCode, 200);
  const despues = await app.inject({ method: "GET", url: "/clientes", headers: conToken(ana.token) });
  assert.equal(despues.statusCode, 401);
});

test("un cambio de rol vale desde la siguiente petición", async () => {
  const equipo = (await app.inject({ method: "GET", url: "/usuarios", headers: corporativo })).json();
  const mariana = equipo.find((u: { correo: string }) => u.correo === CORREOS.otroCerrador);
  const token = (await iniciar(CORREOS.otroCerrador, "casacruz")).json().token;

  assert.equal((await app.inject({ method: "GET", url: "/usuarios", headers: conToken(token) })).statusCode, 403);
  await app.inject({ method: "PATCH", url: `/usuarios/${mariana.id}`, headers: corporativo, payload: { rol: "gerente" } });
  assert.equal((await app.inject({ method: "GET", url: "/usuarios", headers: conToken(token) })).statusCode, 200);
  await app.inject({ method: "PATCH", url: `/usuarios/${mariana.id}`, headers: corporativo, payload: { rol: "cerrador" } });
});

test("no se puede dejar a la empresa sin corporativo", async () => {
  const yo = (await app.inject({ method: "GET", url: "/sesion", headers: corporativo })).json();
  const bajar = await app.inject({ method: "PATCH", url: `/usuarios/${yo.id}`, headers: corporativo, payload: { rol: "gerente" } });
  assert.equal(bajar.statusCode, 409);
  const apagarme = await app.inject({ method: "PATCH", url: `/usuarios/${yo.id}`, headers: corporativo, payload: { activo: false } });
  assert.equal(apagarme.statusCode, 409);
});

test("restablecer da una clave nueva y obliga a cambiarla", async () => {
  const r = await app.inject({ method: "POST", url: `/usuarios/${ana.id}/restablecer`, headers: corporativo });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().usuario.debeCambiarContrasena, true);
  await app.inject({ method: "PATCH", url: `/usuarios/${ana.id}`, headers: corporativo, payload: { activo: true } });
  const entrada = await iniciar("ana.torres@casacruz.mx", r.json().claveTemporal);
  assert.equal(entrada.statusCode, 200);
  assert.equal(entrada.json().sesion.debeCambiarContrasena, true);
});
