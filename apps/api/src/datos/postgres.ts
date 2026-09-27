import { PrismaClient, type Prisma } from "@prisma/client";
import {
  fechaCorta,
  fechaDocumento,
  fechaHora,
  novedadesDe,
  type Cambio,
  type CampoCambiable,
  type Cliente,
  type Desarrollo,
  type EstatusListing,
  type Propuesta,
  type Usuario,
} from "@casacruz/core";
import type { FuenteDeDatos, NuevoCambio } from "./tipos";

/** Fuente real: Postgres a través de Prisma. */

export const prisma = new PrismaClient();

/** El cliente normal o el de una transacción en curso: el adaptador sirve con los dos. */
type Cliente_ = PrismaClient | Prisma.TransactionClient;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Id legible a partir del nombre, como los que ya existen (playa-park). */
function idDesde(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function diasDesde(fecha: Date): number {
  return Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 86_400_000));
}

const incluirDesarrollo = {
  tipologias: { include: { niveles: { orderBy: { orden: "asc" } } }, orderBy: { orden: "asc" } },
  condiciones: true,
  comercial: true,
  interna: { include: { documentos: true } },
  multimedia: { orderBy: { orden: "asc" } },
  validaciones: { include: { validadoPor: true } },
} satisfies Prisma.DesarrolloInclude;

type FilaDesarrollo = Prisma.DesarrolloGetPayload<{ include: typeof incluirDesarrollo }>;

function aDesarrollo(d: FilaDesarrollo): Desarrollo {
  return {
    id: d.id,
    nombre: d.nombre,
    plazaId: d.plazaId,
    ciudad: d.ciudad,
    zona: d.zona,
    direccion: d.direccion,
    mapaUrl: d.mapaUrl,
    lat: num(d.lat),
    lng: num(d.lng),
    tipo: d.tipo,
    desarrollador: d.desarrollador,
    estatus: d.estatus,
    entrega: d.entrega,
    entregaIso: d.entregaIso,
    responsableId: d.responsableId,
    amenidades: d.amenidades,
    aConsiderar: d.aConsiderar,
    multimedia: d.multimedia.map((m) => ({
      tipo: m.tipo as "foto" | "render" | "plano" | "video" | "brochure" | "mapa",
      url: m.url,
      orden: m.orden,
    })),
    tipologias: d.tipologias.map((t) => ({
      id: t.id,
      desarrolloId: t.desarrolloId,
      nombre: t.nombre,
      recamaras: t.recamaras,
      banos: num(t.banos),
      m2Construccion: num(t.m2Construccion),
      m2Terreno: num(t.m2Terreno),
      estacionamientos: t.estacionamientos,
      planoUrl: t.planoUrl,
      niveles: t.niveles.map((n) => ({
        nombre: n.nombre,
        precioLista: num(n.precioLista),
        precioVenta: num(n.precioVenta),
        disponibles: n.disponibles,
      })),
    })),
    condiciones: {
      enganchePct: num(d.condiciones?.enganchePct),
      engancheNota: d.condiciones?.engancheNota ?? null,
      restoPct: num(d.condiciones?.restoPct),
      restoNota: d.condiciones?.restoNota ?? null,
      mensualidades: d.condiciones?.mensualidades ?? null,
      formasPago: d.condiciones?.formasPago ?? [],
      promocionVigente: d.condiciones?.promocionVigente ?? null,
      descuentoContado: d.condiciones?.descuentoContado ?? null,
    },
    comercial: {
      buyerPersona: d.comercial?.buyerPersona ?? null,
      clienteIdeal: d.comercial?.clienteIdeal ?? null,
      argumentos: d.comercial?.argumentos ?? [],
      diferenciadores: d.comercial?.diferenciadores ?? [],
      objeciones: d.comercial?.objeciones ?? [],
      comparables: d.comercial?.comparables ?? [],
      noDeberiaComprarlo: d.comercial?.noDeberiaComprarlo ?? [],
    },
    interna: {
      comisionPct: num(d.interna?.comisionPct),
      contactoComercial: d.interna?.contactoComercial ?? null,
      convenioFirmado: d.interna?.convenioFirmado ?? null,
      dueDiligence: d.interna?.dueDiligence ?? "pendiente",
      notasInternas: d.interna?.notasInternas ?? null,
      documentos: (d.interna?.documentos ?? []).map((doc) => ({
        nombre: doc.nombre,
        tipo: doc.tipo,
        cargadoHaceDias: diasDesde(doc.cargadoEl),
        url: doc.url,
      })),
    },
    // Sólo la validación más reciente de cada campo: de ahí sale la confiabilidad.
    validaciones: Object.values(
      d.validaciones.reduce<Record<string, (typeof d.validaciones)[number]>>((acc, v) => {
        const previa = acc[v.campo];
        if (!previa || v.validadoEl > previa.validadoEl) acc[v.campo] = v;
        return acc;
      }, {}),
    ).map((v) => ({
      campo: v.campo,
      validadoPor: v.validadoPor.nombre,
      haceDias: diasDesde(v.validadoEl),
    })),
  };
}

const incluirCambio = { autor: true, desarrollo: true, aprobadoPor: true } as const;

const incluirUsuario = { plazas: true, desarrollos: { select: { id: true } } } as const;

function aUsuario(u: Prisma.UsuarioGetPayload<{ include: typeof incluirUsuario }>): Usuario {
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    telefono: u.telefono,
    rol: u.rol,
    // Una certificación vencida ya no deja vender la plaza.
    plazasCertificadas: u.plazas
      .filter((p) => p.certificado && (!p.venceEl || p.venceEl > new Date()))
      .map((p) => p.plazaId),
    plazasEnProgreso: u.plazas.filter((p) => !p.certificado && p.progreso > 0).map((p) => p.plazaId),
    activo: u.activo,
    debeCambiarContrasena: u.debeCambiarContrasena,
    ultimoAcceso: u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : "nunca",
    desarrollosACargo: u.desarrollos.length,
  };
}

/** Las plazas del usuario: certificadas al 100, en progreso con su avance. */
function filasDePlazas(certificadas: string[], enProgreso: string[]) {
  return [
    ...certificadas.map((plazaId) => ({ plazaId, certificado: true, progreso: 100 })),
    ...enProgreso
      .filter((p) => !certificadas.includes(p))
      .map((plazaId) => ({ plazaId, certificado: false, progreso: 1 })),
  ];
}

type FilaCambio = Prisma.CambioGetPayload<{ include: typeof incluirCambio }>;

function aCambio(c: FilaCambio): Cambio {
  return {
    id: c.id,
    desarrolloId: c.desarrolloId,
    desarrolloNombre: c.desarrollo.nombre,
    campo: c.campo,
    destino: c.campoClave
      ? { campo: c.campoClave as CampoCambiable, tipologiaId: c.tipologiaId, nivel: c.nivel }
      : null,
    valorAnterior: c.valorAnterior,
    valorNuevo: c.valorNuevo,
    usuarioId: c.usuarioId,
    usuario: c.autor.nombre,
    fecha: fechaHora(c.fecha),
    fechaIso: c.fecha.toISOString(),
    fuente: c.fuente,
    evidencia: c.evidenciaUrl,
    nota: c.nota,
    estado: c.estado,
    aprobadoPor: c.aprobadoPor?.nombre ?? null,
    resueltoIso: c.aprobadoEl?.toISOString() ?? null,
  };
}

export function fuentePostgres(db: Cliente_ = prisma): FuenteDeDatos {
  // Dentro de una transacción no se abre otra: se usa la que ya está en curso.
  const enLote = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> =>
    "$transaction" in db ? (db as PrismaClient).$transaction(fn) : fn(db);

  return {
    nombre: "postgres",

    async listarPlazas() {
      const filas = await db.plaza.findMany({ orderBy: { nombre: "asc" } });
      return filas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        gerenteId: p.gerenteId,
        activa: p.activa,
      }));
    },

    async listarDesarrollos(filtros) {
      const filas = await db.desarrollo.findMany({
        where: {
          ...(filtros.ciudad ? { ciudad: filtros.ciudad } : {}),
          ...(filtros.soloPublicados ? { estatus: "publicado" as const } : {}),
          ...(filtros.q
            ? {
                OR: [
                  { nombre: { contains: filtros.q, mode: "insensitive" as const } },
                  { ciudad: { contains: filtros.q, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        include: incluirDesarrollo,
      });

      // El filtro por precio y recámaras se aplica sobre el objeto ya armado,
      // con la misma función que usa la web.
      const { filtrarDesarrollos } = await import("@casacruz/core");
      return filtrarDesarrollos(filas.map(aDesarrollo), {
        recamaras: filtros.recamaras,
        precioMin: filtros.precioMin,
        precioMax: filtros.precioMax,
      });
    },

    async obtenerDesarrollo(id) {
      const fila = await db.desarrollo.findUnique({ where: { id }, include: incluirDesarrollo });
      return fila ? aDesarrollo(fila) : null;
    },

    async listarUsuarios(): Promise<Usuario[]> {
      const filas = await db.usuario.findMany({ include: incluirUsuario, orderBy: { nombre: "asc" } });
      return filas.map(aUsuario);
    },

    async obtenerUsuario(id) {
      const fila = await db.usuario.findUnique({ where: { id }, include: incluirUsuario });
      return fila ? aUsuario(fila) : null;
    },

    async hashDeContrasena(usuarioId: string) {
      const fila = await db.usuario.findUnique({
        where: { id: usuarioId },
        select: { contrasenaHash: true },
      });
      return fila?.contrasenaHash ?? null;
    },

    async obtenerUsuarioActual() {
      // Sin autenticación todavía: el primer cerrador activo.
      const todos = await this.listarUsuarios();
      return todos.find((u) => u.rol === "cerrador" && u.activo) ?? todos[0];
    },

    async listarClientes(): Promise<Cliente[]> {
      const filas = await db.cliente.findMany({
        include: { actividad: { orderBy: { fecha: "desc" } } },
        orderBy: { creadoEl: "desc" },
      });
      return filas.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        correo: c.correo,
        telefono: c.telefono,
        ciudadResidencia: c.ciudadResidencia,
        presupuestoMin: num(c.presupuestoMin),
        presupuestoMax: num(c.presupuestoMax),
        recamaras: c.recamaras,
        objetivo: c.objetivo,
        plazasInteres: c.plazasInteres,
        kommoLeadId: c.kommoLeadId,
        kommoEtapa: c.kommoEtapa,
        responsableId: c.responsableId,
        notas: c.notas,
        actividad: c.actividad.map((a) => ({
          fecha: fechaCorta(a.fecha).slice(0, 6),
          texto: a.texto,
        })),
      }));
    },

    async obtenerCliente(id) {
      const todos = await this.listarClientes();
      return todos.find((c) => c.id === id) ?? null;
    },

    async listarPropuestas(): Promise<Propuesta[]> {
      const filas = await db.propuesta.findMany({
        include: { items: { orderBy: { orden: "asc" } } },
        orderBy: { creadaEl: "desc" },
      });
      return filas.map((p) => ({
        id: p.id,
        slug: p.slug,
        clienteId: p.clienteId,
        usuarioId: p.usuarioId,
        formato: p.formato,
        opciones: p.opciones as Propuesta["opciones"],
        items: p.items.map((i) => ({
          desarrolloId: i.desarrolloId,
          tipologiaId: i.tipologiaId ?? "",
          nivel: i.nivel,
          precioCongelado: num(i.precioCongelado),
          razon: i.razon,
        })),
        creadaEl: fechaDocumento(p.creadaEl),
        creadaIso: p.creadaEl.toISOString(),
        enviadaEl: p.enviadaEl ? fechaHora(p.enviadaEl) : null,
        estado: p.estado,
        vistas: p.vistas,
        kommoLeadId: p.kommoLeadId,
      }));
    },

    async obtenerPropuesta(slug) {
      const todas = await this.listarPropuestas();
      return todas.find((p) => p.slug === slug) ?? null;
    },

    async listarCambios(estado) {
      const filas = await db.cambio.findMany({
        where: estado ? { estado } : {},
        include: incluirCambio,
        orderBy: { fecha: "desc" },
      });
      return filas.map(aCambio);
    },

    async cambiosDe(desarrolloId) {
      const filas = await db.cambio.findMany({
        where: { desarrolloId },
        include: incluirCambio,
        orderBy: { fecha: "desc" },
      });
      return filas.map(aCambio);
    },

    async conteoPipeline() {
      const filas = await db.desarrollo.groupBy({ by: ["estatus"], _count: true });
      const base: Record<EstatusListing, number> = {
        borrador: 0,
        revision: 0,
        due_diligence: 0,
        aprobado: 0,
        publicado: 0,
      };
      for (const f of filas) base[f.estatus] = f._count;
      return base;
    },

    async novedades() {
      const filas = await db.cambio.findMany({
        where: { estado: "publicado" },
        include: incluirCambio,
        orderBy: { fecha: "desc" },
        take: 6,
      });
      return novedadesDe(filas.map(aCambio));
    },

    async guardarCambio(entrada: NuevoCambio) {
      const creado = await db.cambio.create({
        data: {
          desarrolloId: entrada.desarrolloId,
          campo: entrada.campo,
          campoClave: entrada.destino?.campo ?? null,
          tipologiaId: entrada.destino?.tipologiaId ?? null,
          nivel: entrada.destino?.nivel ?? null,
          valorAnterior: entrada.valorAnterior,
          valorNuevo: entrada.valorNuevo,
          usuarioId: entrada.usuarioId,
          fuente: entrada.fuente,
          evidenciaUrl: entrada.evidenciaUrl ?? null,
          nota: entrada.nota ?? null,
          estado: entrada.estado,
        },
        include: incluirCambio,
      });
      return aCambio(creado);
    },

    async obtenerCambio(id) {
      const fila = await db.cambio.findUnique({ where: { id }, include: incluirCambio });
      return fila ? aCambio(fila) : null;
    },

    async resolverCambio(id, estado, aprobadorId) {
      const { count } = await db.cambio.updateMany({
        where: { id },
        data: { estado, aprobadoPorId: aprobadorId, aprobadoEl: new Date() },
      });
      return count ? this.obtenerCambio(id) : null;
    },

    async registrarValidacion(desarrolloId, campo, usuarioId) {
      await db.validacion.create({
        data: {
          desarrolloId,
          campo: campo as never,
          usuarioId,
        },
      });
    },

    async enTransaccion(fn) {
      if (!("$transaction" in db)) return fn(this);
      return (db as PrismaClient).$transaction((tx) => fn(fuentePostgres(tx)));
    },

    async crearDesarrollo(entrada) {
      const id = idDesde(entrada.nombre);
      const creado = await db.desarrollo.create({
        data: {
          id,
          nombre: entrada.nombre,
          plazaId: entrada.plazaId,
          ciudad: entrada.ciudad,
          zona: entrada.zona ?? null,
          tipo: entrada.tipo,
          entrega: entrada.entrega ?? null,
          entregaIso: entrada.entregaIso ?? null,
          responsableId: entrada.responsableId,
          estatus: "borrador",
          condiciones: { create: {} },
          comercial: { create: {} },
          interna: { create: {} },
        },
        include: incluirDesarrollo,
      });
      return aDesarrollo(creado);
    },

    async actualizarDesarrollo(id, parche) {
      const { condiciones, comercial, interna, ...resto } = parche;
      await db.desarrollo.update({
        where: { id },
        data: {
          ...resto,
          ...(condiciones
            ? { condiciones: { upsert: { create: condiciones, update: condiciones } } }
            : {}),
          ...(comercial ? { comercial: { upsert: { create: comercial, update: comercial } } } : {}),
          ...(interna ? { interna: { upsert: { create: interna, update: interna } } } : {}),
        },
      });
      return this.obtenerDesarrollo(id);
    },

    async cambiarEstatus(id, estatus) {
      await db.desarrollo.update({ where: { id }, data: { estatus } });
      return this.obtenerDesarrollo(id);
    },

    async guardarTipologia(desarrolloId, entrada) {
      const id = entrada.id ?? idDesde(`${desarrolloId}-${entrada.nombre}`);
      const datosTipologia = {
        nombre: entrada.nombre,
        recamaras: entrada.recamaras ?? null,
        banos: entrada.banos ?? null,
        m2Construccion: entrada.m2Construccion ?? null,
        m2Terreno: entrada.m2Terreno ?? null,
        estacionamientos: entrada.estacionamientos ?? null,
        planoUrl: entrada.planoUrl ?? null,
      };

      await enLote(async (tx) => {
        await tx.tipologia.upsert({
          where: { id },
          create: { id, desarrolloId, ...datosTipologia },
          update: datosTipologia,
        });
        // Los niveles se reemplazan completos: es una lista, no un parche.
        await tx.nivelPrecio.deleteMany({ where: { tipologiaId: id } });
        await tx.nivelPrecio.createMany({
          data: entrada.niveles.map((n, orden) => ({
            tipologiaId: id,
            nombre: n.nombre,
            precioLista: n.precioLista ?? n.precioVenta,
            precioVenta: n.precioVenta,
            disponibles: n.disponibles ?? null,
            orden,
          })),
        });
      });

      const desarrollo = await this.obtenerDesarrollo(desarrolloId);
      return desarrollo?.tipologias.find((t) => t.id === id) ?? null;
    },

    async eliminarTipologia(desarrolloId, tipologiaId) {
      const { count } = await db.tipologia.deleteMany({
        where: { id: tipologiaId, desarrolloId },
      });
      return count > 0;
    },

    async agregarMultimedia(desarrolloId, item) {
      await db.multimedia.create({
        data: { desarrolloId, tipo: item.tipo, url: item.url, orden: item.orden },
      });
      const desarrollo = await this.obtenerDesarrollo(desarrolloId);
      return desarrollo?.multimedia ?? null;
    },

    async eliminarMultimedia(desarrolloId, url) {
      await db.multimedia.deleteMany({ where: { desarrolloId, url } });
      const desarrollo = await this.obtenerDesarrollo(desarrolloId);
      return desarrollo?.multimedia ?? null;
    },

    async ordenarMultimedia(desarrolloId, urls) {
      const actual = await this.obtenerDesarrollo(desarrolloId);
      if (!actual) return null;
      const lista = actual.multimedia ?? [];
      const posicion = (url: string) => {
        const i = urls.indexOf(url);
        return i >= 0 ? i : urls.length + lista.findIndex((m) => m.url === url);
      };
      const ordenada = [...lista].sort((x, y) => posicion(x.url) - posicion(y.url));
      await enLote(async (tx) => {
        for (const [orden, m] of ordenada.entries()) {
          await tx.multimedia.updateMany({ where: { desarrolloId, url: m.url }, data: { orden } });
        }
      });
      const desarrollo = await this.obtenerDesarrollo(desarrolloId);
      return desarrollo?.multimedia ?? null;
    },

    async agregarDocumento(desarrolloId, documento) {
      const existe = await db.desarrollo.findUnique({ where: { id: desarrolloId }, select: { id: true } });
      if (!existe) return null;
      await db.infoInterna.upsert({
        where: { desarrolloId },
        create: { desarrolloId },
        update: {},
      });
      await db.documento.create({ data: { desarrolloId, ...documento } });
      const desarrollo = await this.obtenerDesarrollo(desarrolloId);
      return desarrollo?.interna.documentos ?? null;
    },

    async crearUsuario(entrada, hashTemporal) {
      const creado = await db.usuario.create({
        data: {
          nombre: entrada.nombre,
          correo: entrada.correo.toLowerCase(),
          telefono: entrada.telefono ?? null,
          rol: entrada.rol,
          contrasenaHash: hashTemporal,
          debeCambiarContrasena: true,
          plazas: {
            create: filasDePlazas(entrada.plazasCertificadas ?? [], entrada.plazasEnProgreso ?? []),
          },
        },
        include: incluirUsuario,
      });
      return aUsuario(creado);
    },

    async actualizarUsuario(id, parche) {
      const actual = await this.obtenerUsuario(id);
      if (!actual) return null;
      const { plazasCertificadas, plazasEnProgreso, ...resto } = parche;
      await enLote(async (tx) => {
        await tx.usuario.update({ where: { id }, data: resto });
        if (plazasCertificadas || plazasEnProgreso) {
          await tx.usuarioPlaza.deleteMany({ where: { usuarioId: id } });
          await tx.usuarioPlaza.createMany({
            data: filasDePlazas(
              plazasCertificadas ?? actual.plazasCertificadas,
              plazasEnProgreso ?? actual.plazasEnProgreso,
            ).map((f) => ({ ...f, usuarioId: id })),
          });
        }
      });
      return this.obtenerUsuario(id);
    },

    async guardarContrasena(id, hash, debeCambiar) {
      await db.usuario.updateMany({
        where: { id },
        data: { contrasenaHash: hash, debeCambiarContrasena: debeCambiar },
      });
    },

    async registrarAcceso(id) {
      await db.usuario.updateMany({ where: { id }, data: { ultimoAcceso: new Date() } });
    },

    async modulosCapacitacion() {
      const filas = await db.moduloCapacitacion.findMany({ orderBy: [{ plazaId: "asc" }, { orden: "asc" }] });
      return filas.map((m) => ({ ...m, tipo: m.tipo as "video" | "documento" }));
    },

    async preguntasDe(plazaId) {
      return db.preguntaEvaluacion.findMany({ where: { plazaId }, orderBy: { orden: "asc" } });
    },

    async avanceDe(usuarioId) {
      const [plazas, completados, intentos, preparacion] = await Promise.all([
        db.usuarioPlaza.findMany({ where: { usuarioId, certificado: true } }),
        db.progresoModulo.findMany({ where: { usuarioId } }),
        db.intentoEvaluacion.findMany({ where: { usuarioId }, orderBy: { fecha: "desc" } }),
        db.preparacionDesarrollo.findMany({ where: { usuarioId } }),
      ]);
      return {
        completados: completados.map((c) => ({ moduloId: c.moduloId, fechaIso: c.completadoEl.toISOString() })),
        intentos: intentos.map((i) => ({
          plazaId: i.plazaId,
          aciertos: i.aciertos,
          total: i.total,
          aprobado: i.aprobado,
          fechaIso: i.fecha.toISOString(),
        })),
        certificaciones: plazas.map((p) => ({ plazaId: p.plazaId, venceIso: p.venceEl?.toISOString() ?? null })),
        preparacion: preparacion.map((p) => ({ desarrolloId: p.desarrolloId, items: p.items })),
      };
    },

    async completarModulo(usuarioId, moduloId) {
      const modulo = await db.moduloCapacitacion.findUnique({ where: { id: moduloId } });
      if (!modulo) return;
      await enLote(async (tx) => {
        await tx.progresoModulo.upsert({
          where: { usuarioId_moduloId: { usuarioId, moduloId } },
          create: { usuarioId, moduloId },
          update: {},
        });
        // Empezar un módulo pone la plaza "en progreso", si no estaba certificado.
        await tx.usuarioPlaza.upsert({
          where: { usuarioId_plazaId: { usuarioId, plazaId: modulo.plazaId } },
          create: { usuarioId, plazaId: modulo.plazaId, certificado: false, progreso: 1 },
          update: {},
        });
      });
    },

    async registrarIntento(usuarioId, intento) {
      await db.intentoEvaluacion.create({
        data: {
          usuarioId,
          plazaId: intento.plazaId,
          aciertos: intento.aciertos,
          total: intento.total,
          aprobado: intento.aprobado,
          fecha: new Date(intento.fechaIso),
        },
      });
    },

    async certificar(usuarioId, plazaId, venceIso) {
      const venceEl = venceIso ? new Date(venceIso) : null;
      await db.usuarioPlaza.upsert({
        where: { usuarioId_plazaId: { usuarioId, plazaId } },
        create: { usuarioId, plazaId, certificado: true, progreso: 100, venceEl },
        update: { certificado: true, progreso: 100, venceEl },
      });
    },

    async guardarPreparacion(usuarioId, desarrolloId, items) {
      await db.preparacionDesarrollo.upsert({
        where: { usuarioId_desarrolloId: { usuarioId, desarrolloId } },
        create: { usuarioId, desarrolloId, items },
        update: { items },
      });
    },

    async crearCliente(entrada) {
      const creado = await db.cliente.create({
        data: {
          nombre: entrada.nombre,
          correo: entrada.correo ?? null,
          telefono: entrada.telefono ?? null,
          ciudadResidencia: entrada.ciudadResidencia ?? null,
          presupuestoMin: entrada.presupuestoMin ?? null,
          presupuestoMax: entrada.presupuestoMax ?? null,
          recamaras: entrada.recamaras ?? null,
          objetivo: entrada.objetivo ?? null,
          plazasInteres: entrada.plazasInteres ?? [],
          kommoLeadId: entrada.kommoLeadId ?? null,
          kommoEtapa: entrada.kommoEtapa ?? null,
          responsableId: entrada.responsableId ?? null,
          notas: entrada.notas ?? null,
          actividad: { create: { texto: "Alta en Casa Cruz OS." } },
        },
      });
      const cliente = await this.obtenerCliente(creado.id);
      return cliente!;
    },

    async actualizarCliente(id, parche) {
      const { count } = await db.cliente.updateMany({ where: { id }, data: parche });
      return count ? this.obtenerCliente(id) : null;
    },

    async registrarActividad(clienteId, texto) {
      await db.actividad.create({ data: { clienteId, texto } });
    },

    async obtenerClientePorLead(kommoLeadId) {
      const fila = await db.cliente.findUnique({ where: { kommoLeadId }, select: { id: true } });
      return fila ? this.obtenerCliente(fila.id) : null;
    },

    async registrarEventoKommo(evento) {
      await db.eventoKommo.create({
        data: {
          recibidoEl: new Date(evento.recibidoIso),
          tipo: evento.tipo,
          leadId: evento.leadId,
          resultado: evento.resultado,
        },
      });
    },

    async eventosKommo(limite) {
      const filas = await db.eventoKommo.findMany({ orderBy: { recibidoEl: "desc" }, take: limite });
      return filas.map((e) => ({
        recibidoIso: e.recibidoEl.toISOString(),
        tipo: e.tipo,
        leadId: e.leadId,
        resultado: e.resultado,
      }));
    },

    async crearPropuesta(entrada) {
      const cliente = await this.obtenerCliente(entrada.clienteId);

      // El precio se congela aquí: lo que ve el cliente no cambia después.
      const items = [];
      for (const [orden, item] of entrada.items.entries()) {
        const desarrollo = await this.obtenerDesarrollo(item.desarrolloId);
        const tipologia = desarrollo?.tipologias.find((t) => t.id === item.tipologiaId);
        const precios = (tipologia?.niveles ?? [])
          .filter((n) => (item.nivel ? n.nombre === item.nivel : true))
          .map((n) => n.precioVenta)
          .filter((precio): precio is number => precio !== null);
        items.push({
          desarrolloId: item.desarrolloId,
          tipologiaId: item.tipologiaId || null,
          nivel: item.nivel ?? null,
          precioCongelado: precios.length ? Math.min(...precios) : null,
          razon: item.razon ?? null,
          orden,
        });
      }

      const creada = await db.propuesta.create({
        data: {
          slug: idDesde(`${cliente?.nombre ?? "propuesta"}-${Date.now().toString(36)}`),
          clienteId: entrada.clienteId,
          usuarioId: entrada.usuarioId,
          formato: entrada.formato,
          opciones: {
            esquemaPagos: true,
            costosCierre: false,
            comparativo: true,
            videoInstitucional: false,
            mapa: true,
            ...entrada.opciones,
          },
          estado: entrada.enviar ? "enviada" : "borrador",
          enviadaEl: entrada.enviar ? new Date() : null,
          kommoLeadId: cliente?.kommoLeadId ?? null,
          items: { create: items },
        },
      });

      const propuesta = await this.obtenerPropuesta(creada.slug);
      return propuesta!;
    },

    async marcarPropuestaEnviada(slug) {
      await db.propuesta.update({
        where: { slug },
        data: { estado: "enviada", enviadaEl: new Date() },
      });
      return this.obtenerPropuesta(slug);
    },

    async sumarVistaPropuesta(slug) {
      const actualizada = await db.propuesta.update({
        where: { slug },
        data: { vistas: { increment: 1 }, estado: "vista" },
      });
      return actualizada.vistas;
    },
  };
}
