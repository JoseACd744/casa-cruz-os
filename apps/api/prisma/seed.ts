import { PrismaClient } from "@prisma/client";
import { mock } from "@casacruz/core";

/**
 * Carga la Base Maestra con los datos de demostración del núcleo.
 *
 *   pnpm --filter @casacruz/api seed
 *
 * Es el mismo contenido que ve la web en modo mock, así que al conectar la base
 * real la aplicación no cambia de comportamiento. Borra todo lo que haya: es
 * para arrancar o para las pruebas, nunca para una base con datos reales.
 */

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000);

/** El id de alguien del equipo a partir de su nombre, como lo guarda el historial. */
function idPorNombre(nombre: string | null): string | null {
  if (!nombre) return null;
  return mock.usuarios.find((u) => u.nombre === nombre)?.id ?? null;
}

/** Vacía todas las tablas de la aplicación (no toca el registro de migraciones). */
export async function vaciar(prisma: PrismaClient): Promise<void> {
  const tablas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (!tablas.length) return;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tablas.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function sembrar(prisma: PrismaClient, { silencioso = false } = {}): Promise<void> {
  const log = (texto: string) => {
    if (!silencioso) console.log(texto);
  };

  log("Limpiando tablas…");
  await vaciar(prisma);

  log("Equipo y plazas…");
  for (const u of mock.usuarios) {
    await prisma.usuario.create({
      data: {
        id: u.id,
        nombre: u.nombre,
        correo: u.correo,
        telefono: u.telefono,
        rol: u.rol,
        activo: u.activo,
        debeCambiarContrasena: u.debeCambiarContrasena,
        ultimoAcceso: hace(1),
      },
    });
  }

  for (const p of mock.plazas) {
    await prisma.plaza.create({
      data: {
        id: p.id,
        nombre: p.nombre,
        activa: p.activa,
        gerenteId: mock.usuarios.some((u) => u.id === p.gerenteId) ? p.gerenteId : null,
      },
    });
  }

  for (const u of mock.usuarios) {
    const avance = mock.avanceCapacitacion[u.id];
    for (const plazaId of u.plazasCertificadas) {
      const vence = avance?.certificaciones.find((c) => c.plazaId === plazaId)?.venceIso ?? null;
      await prisma.usuarioPlaza.create({
        data: { usuarioId: u.id, plazaId, certificado: true, progreso: 100, venceEl: vence ? new Date(vence) : null },
      });
    }
    for (const plazaId of u.plazasEnProgreso) {
      await prisma.usuarioPlaza.create({
        data: { usuarioId: u.id, plazaId, certificado: false, progreso: 1 },
      });
    }
  }

  log("Desarrollos…");
  for (const d of mock.desarrollos) {
    await prisma.desarrollo.create({
      data: {
        id: d.id,
        nombre: d.nombre,
        plazaId: d.plazaId,
        ciudad: d.ciudad,
        zona: d.zona,
        direccion: d.direccion,
        mapaUrl: d.mapaUrl,
        lat: d.lat,
        lng: d.lng,
        tipo: d.tipo,
        desarrollador: d.desarrollador,
        estatus: d.estatus,
        entrega: d.entrega,
        entregaIso: d.entregaIso,
        amenidades: d.amenidades,
        aConsiderar: d.aConsiderar,
        responsableId: d.responsableId,
        condiciones: { create: { ...d.condiciones } },
        comercial: { create: { ...d.comercial } },
        interna: {
          create: {
            comisionPct: d.interna.comisionPct,
            contactoComercial: d.interna.contactoComercial,
            convenioFirmado: d.interna.convenioFirmado,
            dueDiligence: d.interna.dueDiligence,
            notasInternas: d.interna.notasInternas,
            documentos: {
              create: d.interna.documentos.map((doc) => ({
                nombre: doc.nombre,
                tipo: doc.tipo,
                url: doc.url,
                cargadoEl: hace(doc.cargadoHaceDias),
              })),
            },
          },
        },
        multimedia: { create: (d.multimedia ?? []).map((m) => ({ tipo: m.tipo, url: m.url, orden: m.orden })) },
        tipologias: {
          create: d.tipologias.map((t, i) => ({
            id: t.id,
            nombre: t.nombre,
            recamaras: t.recamaras,
            banos: t.banos,
            m2Construccion: t.m2Construccion,
            m2Terreno: t.m2Terreno,
            estacionamientos: t.estacionamientos,
            planoUrl: t.planoUrl,
            orden: i,
            niveles: {
              create: t.niveles.map((n, j) => ({
                nombre: n.nombre,
                precioLista: n.precioLista,
                precioVenta: n.precioVenta,
                disponibles: n.disponibles,
                orden: j,
              })),
            },
          })),
        },
        validaciones: {
          create: d.validaciones.map((v) => ({
            campo: v.campo,
            usuarioId: idPorNombre(v.validadoPor) ?? d.responsableId,
            validadoEl: hace(v.haceDias),
          })),
        },
      },
    });
  }

  log("Clientes…");
  for (const c of mock.clientes) {
    await prisma.cliente.create({
      data: {
        id: c.id,
        nombre: c.nombre,
        correo: c.correo,
        telefono: c.telefono,
        ciudadResidencia: c.ciudadResidencia,
        presupuestoMin: c.presupuestoMin,
        presupuestoMax: c.presupuestoMax,
        recamaras: c.recamaras,
        objetivo: c.objetivo,
        plazasInteres: c.plazasInteres,
        kommoLeadId: c.kommoLeadId,
        kommoEtapa: c.kommoEtapa,
        responsableId: c.responsableId,
        notas: c.notas,
        actividad: {
          create: c.actividad.map((a, i) => ({ texto: a.texto, fecha: hace(i * 2) })),
        },
      },
    });
  }

  log("Propuestas…");
  for (const p of mock.propuestas) {
    await prisma.propuesta.create({
      data: {
        id: p.id,
        slug: p.slug,
        clienteId: p.clienteId,
        usuarioId: p.usuarioId,
        formato: p.formato,
        opciones: p.opciones,
        estado: p.estado,
        vistas: p.vistas,
        kommoLeadId: p.kommoLeadId,
        creadaEl: new Date(p.creadaIso),
        enviadaEl: p.enviadaEl ? new Date(p.creadaIso) : null,
        items: {
          create: p.items.map((i, orden) => ({
            desarrolloId: i.desarrolloId,
            tipologiaId: i.tipologiaId || null,
            nivel: i.nivel,
            precioCongelado: i.precioCongelado,
            razon: i.razon,
            orden,
          })),
        },
      },
    });
  }

  log("Historial de cambios…");
  for (const c of mock.cambios) {
    await prisma.cambio.create({
      data: {
        id: c.id,
        desarrolloId: c.desarrolloId,
        campo: c.campo,
        campoClave: c.destino?.campo ?? null,
        tipologiaId: c.destino?.tipologiaId ?? null,
        nivel: c.destino?.nivel ?? null,
        valorAnterior: c.valorAnterior,
        valorNuevo: c.valorNuevo,
        usuarioId: c.usuarioId,
        fuente: c.fuente,
        evidenciaUrl: c.evidencia,
        nota: c.nota,
        estado: c.estado,
        fecha: new Date(c.fechaIso),
        aprobadoPorId: idPorNombre(c.aprobadoPor),
        aprobadoEl: c.resueltoIso ? new Date(c.resueltoIso) : null,
      },
    });
  }

  log("Capacitación…");
  for (const m of mock.modulosCapacitacion) await prisma.moduloCapacitacion.create({ data: m });
  for (const p of mock.preguntasEvaluacion) await prisma.preguntaEvaluacion.create({ data: p });
  for (const [usuarioId, avance] of Object.entries(mock.avanceCapacitacion)) {
    for (const c of avance.completados) {
      await prisma.progresoModulo.create({
        data: { usuarioId, moduloId: c.moduloId, completadoEl: new Date(c.fechaIso) },
      });
    }
    for (const i of avance.intentos) {
      await prisma.intentoEvaluacion.create({
        data: { usuarioId, plazaId: i.plazaId, aciertos: i.aciertos, total: i.total, aprobado: i.aprobado, fecha: new Date(i.fechaIso) },
      });
    }
    for (const p of avance.preparacion) {
      await prisma.preparacionDesarrollo.create({ data: { usuarioId, desarrolloId: p.desarrolloId, items: p.items } });
    }
  }

  log("Listo.");
}

// Ejecutado como script (pnpm seed), no importado por las pruebas.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  const prisma = new PrismaClient();
  sembrar(prisma)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
