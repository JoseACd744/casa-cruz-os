import { PrismaClient } from "@prisma/client";
import { mock } from "@casacruz/core";

/**
 * Carga la Base Maestra con los datos de demostración del núcleo.
 *
 *   pnpm --filter @casacruz/api seed
 *
 * Es el mismo contenido que ve la web en modo mock, así que al conectar la base
 * real la aplicación no cambia de comportamiento.
 */

const prisma = new PrismaClient();

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000);

async function main() {
  console.log("Limpiando tablas…");
  await prisma.propuestaItem.deleteMany();
  await prisma.propuesta.deleteMany();
  await prisma.actividad.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.cambio.deleteMany();
  await prisma.validacion.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.infoInterna.deleteMany();
  await prisma.infoComercial.deleteMany();
  await prisma.condicionComercial.deleteMany();
  await prisma.nivelPrecio.deleteMany();
  await prisma.tipologia.deleteMany();
  await prisma.multimedia.deleteMany();
  await prisma.desarrollo.deleteMany();
  await prisma.usuarioPlaza.deleteMany();
  await prisma.plaza.deleteMany();
  await prisma.usuario.deleteMany();

  console.log("Usuarios y plazas…");
  for (const u of mock.usuarios) {
    await prisma.usuario.create({
      data: {
        id: u.id,
        nombre: u.nombre,
        correo: u.correo === "[CORREO]" ? `${u.id}@casacruz.mx` : u.correo,
        rol: u.rol,
        activo: u.activo,
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
    for (const plazaId of u.plazasCertificadas) {
      if (!mock.plazas.some((p) => p.id === plazaId)) continue;
      await prisma.usuarioPlaza.create({
        data: { usuarioId: u.id, plazaId, certificado: true, progreso: 100 },
      });
    }
    for (const plazaId of u.plazasEnProgreso) {
      if (!mock.plazas.some((p) => p.id === plazaId)) continue;
      await prisma.usuarioPlaza.create({
        data: { usuarioId: u.id, plazaId, certificado: false, progreso: 60 },
      });
    }
  }

  console.log("Desarrollos…");
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
        tipo: d.tipo,
        desarrollador: d.desarrollador,
        estatus: d.estatus,
        entrega: d.entrega,
        entregaIso: d.entregaIso,
        amenidades: d.amenidades,
        aConsiderar: d.aConsiderar,
        responsableId: d.responsableId,
        condiciones: {
          create: {
            enganchePct: d.condiciones.enganchePct,
            engancheNota: d.condiciones.engancheNota,
            restoPct: d.condiciones.restoPct,
            restoNota: d.condiciones.restoNota,
            mensualidades: d.condiciones.mensualidades,
            formasPago: d.condiciones.formasPago,
            promocionVigente: d.condiciones.promocionVigente,
            descuentoContado: d.condiciones.descuentoContado,
          },
        },
        comercial: {
          create: {
            buyerPersona: d.comercial.buyerPersona,
            clienteIdeal: d.comercial.clienteIdeal,
            argumentos: d.comercial.argumentos,
            diferenciadores: d.comercial.diferenciadores,
            objeciones: d.comercial.objeciones,
            comparables: d.comercial.comparables,
            noDeberiaComprarlo: d.comercial.noDeberiaComprarlo,
          },
        },
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
                cargadoEl: hace(doc.cargadoHaceDias),
              })),
            },
          },
        },
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
            usuarioId:
              mock.usuarios.find((u) => u.nombre === v.validadoPor)?.id ?? d.responsableId,
            validadoEl: hace(v.haceDias),
          })),
        },
      },
    });
  }

  console.log("Clientes…");
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
        notas: c.notas,
        actividad: {
          create: c.actividad.map((a, i) => ({ texto: a.texto, fecha: hace(i * 2) })),
        },
      },
    });
  }

  console.log("Propuestas…");
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
        enviadaEl: p.enviadaEl ? hace(1) : null,
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

  console.log("Historial de cambios…");
  for (const c of mock.cambios) {
    await prisma.cambio.create({
      data: {
        desarrolloId: c.desarrolloId,
        campo: c.campo,
        valorAnterior: c.valorAnterior,
        valorNuevo: c.valorNuevo,
        usuarioId:
          mock.usuarios.find((u) => u.nombre === c.usuario)?.id ?? mock.usuarios[0].id,
        fuente: c.fuente,
        evidenciaUrl: c.evidencia,
        estado: c.estado,
        fecha: hace(3),
      },
    });
  }

  console.log("Listo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
