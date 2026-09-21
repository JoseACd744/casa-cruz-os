import { PrismaClient, type Prisma } from "@prisma/client";
import { requiereAprobacion, type Cambio, type Cliente, type Desarrollo, type EstatusListing, type Propuesta, type Usuario } from "@casacruz/core";
import type { FuenteDeDatos, NuevoCambio } from "./tipos";

/** Fuente real: Postgres a través de Prisma. */

export const prisma = new PrismaClient();

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

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

function aCambio(c: {
  id: string;
  desarrolloId: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  fecha: Date;
  fuente: Cambio["fuente"];
  evidenciaUrl: string | null;
  estado: Cambio["estado"];
  autor: { nombre: string };
  desarrollo: { nombre: string };
}): Cambio {
  return {
    id: c.id,
    desarrolloId: c.desarrolloId,
    desarrolloNombre: c.desarrollo.nombre,
    campo: c.campo,
    valorAnterior: c.valorAnterior,
    valorNuevo: c.valorNuevo,
    usuario: c.autor.nombre,
    fecha: c.fecha.toLocaleString("es-MX"),
    fuente: c.fuente,
    evidencia: c.evidenciaUrl,
    estado: c.estado,
  };
}

export function fuentePostgres(): FuenteDeDatos {
  const incluirCambio = { autor: true, desarrollo: true } as const;

  return {
    nombre: "postgres",

    async listarPlazas() {
      const filas = await prisma.plaza.findMany({ orderBy: { nombre: "asc" } });
      return filas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        gerenteId: p.gerenteId,
        activa: p.activa,
      }));
    },

    async listarDesarrollos(filtros) {
      const filas = await prisma.desarrollo.findMany({
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
      const fila = await prisma.desarrollo.findUnique({ where: { id }, include: incluirDesarrollo });
      return fila ? aDesarrollo(fila) : null;
    },

    async listarUsuarios(): Promise<Usuario[]> {
      const filas = await prisma.usuario.findMany({
        include: { plazas: true, desarrollos: { select: { id: true } } },
        orderBy: { nombre: "asc" },
      });
      return filas.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        correo: u.correo,
        rol: u.rol,
        plazasCertificadas: u.plazas.filter((p) => p.certificado).map((p) => p.plazaId),
        plazasEnProgreso: u.plazas.filter((p) => !p.certificado && p.progreso > 0).map((p) => p.plazaId),
        activo: u.activo,
        ultimoAcceso: u.ultimoAcceso ? u.ultimoAcceso.toLocaleString("es-MX") : "nunca",
        desarrollosACargo: u.desarrollos.length,
      }));
    },

    async obtenerUsuarioActual() {
      // Sin autenticación todavía: el primer cerrador activo.
      const todos = await this.listarUsuarios();
      return todos.find((u) => u.rol === "cerrador" && u.activo) ?? todos[0];
    },

    async listarClientes(): Promise<Cliente[]> {
      const filas = await prisma.cliente.findMany({
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
        notas: c.notas,
        actividad: c.actividad.map((a) => ({
          fecha: a.fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
          texto: a.texto,
        })),
      }));
    },

    async obtenerCliente(id) {
      const todos = await this.listarClientes();
      return todos.find((c) => c.id === id) ?? null;
    },

    async listarPropuestas(): Promise<Propuesta[]> {
      const filas = await prisma.propuesta.findMany({
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
        creadaEl: p.creadaEl.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        enviadaEl: p.enviadaEl ? p.enviadaEl.toLocaleString("es-MX") : null,
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
      const filas = await prisma.cambio.findMany({
        where: estado ? { estado } : {},
        include: incluirCambio,
        orderBy: { fecha: "desc" },
      });
      return filas.map(aCambio);
    },

    async cambiosDe(desarrolloId) {
      const filas = await prisma.cambio.findMany({
        where: { desarrolloId },
        include: incluirCambio,
        orderBy: { fecha: "desc" },
      });
      return filas.map(aCambio);
    },

    async conteoPipeline() {
      const filas = await prisma.desarrollo.groupBy({ by: ["estatus"], _count: true });
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
      const filas = await prisma.cambio.findMany({
        where: { estado: "publicado" },
        include: incluirCambio,
        orderBy: { fecha: "desc" },
        take: 6,
      });
      return filas.map((c) => ({
        fecha: c.fecha
          .toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
          .toUpperCase(),
        titulo: `${c.desarrollo.nombre}: ${c.campo}`,
        detalle: `${c.valorAnterior} → ${c.valorNuevo}. Fuente: ${c.fuente}.`,
      }));
    },

    async registrarCambio(entrada: NuevoCambio) {
      const pendiente = requiereAprobacion(
        entrada.campo,
        entrada.fuente,
        Boolean(entrada.evidenciaUrl),
      );
      const creado = await prisma.cambio.create({
        data: {
          desarrolloId: entrada.desarrolloId,
          campo: entrada.campo,
          valorAnterior: entrada.valorAnterior,
          valorNuevo: entrada.valorNuevo,
          usuarioId: entrada.usuarioId,
          fuente: entrada.fuente,
          evidenciaUrl: entrada.evidenciaUrl ?? null,
          nota: entrada.nota ?? null,
          estado: pendiente ? "pendiente" : "publicado",
        },
        include: incluirCambio,
      });
      return aCambio(creado);
    },

    async aprobarCambio(id, aprobadorId) {
      const actualizado = await prisma.cambio.update({
        where: { id },
        data: { estado: "publicado", aprobadoPorId: aprobadorId, aprobadoEl: new Date() },
        include: incluirCambio,
      });
      return aCambio(actualizado);
    },

    async registrarValidacion(desarrolloId, campo, usuarioId) {
      await prisma.validacion.create({
        data: {
          desarrolloId,
          campo: campo as never,
          usuarioId,
        },
      });
    },

    async sumarVistaPropuesta(slug) {
      const actualizada = await prisma.propuesta.update({
        where: { slug },
        data: { vistas: { increment: 1 }, estado: "vista" },
      });
      return actualizada.vistas;
    },
  };
}
