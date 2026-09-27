-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('cliente', 'cerrador', 'gerente', 'corporativo');

-- CreateEnum
CREATE TYPE "EstatusListing" AS ENUM ('borrador', 'revision', 'due_diligence', 'aprobado', 'publicado');

-- CreateEnum
CREATE TYPE "TipoPropiedad" AS ENUM ('departamento', 'casa', 'terreno', 'local');

-- CreateEnum
CREATE TYPE "Objetivo" AS ENUM ('vivienda', 'inversion', 'retiro');

-- CreateEnum
CREATE TYPE "CampoValidable" AS ENUM ('precio', 'disponibilidad', 'promocion', 'entrega', 'comision');

-- CreateEnum
CREATE TYPE "FuenteTipo" AS ENUM ('lista_precios', 'brochure', 'correo', 'whatsapp', 'convenio', 'llamada', 'contrato', 'otro');

-- CreateEnum
CREATE TYPE "EstadoCambio" AS ENUM ('publicado', 'pendiente', 'rechazado');

-- CreateEnum
CREATE TYPE "EstadoPropuesta" AS ENUM ('borrador', 'enviada', 'vista', 'negociacion', 'sin_respuesta');

-- CreateEnum
CREATE TYPE "FormatoPropuesta" AS ENUM ('ficha', 'presentacion', 'web', 'pdf');

-- CreateEnum
CREATE TYPE "DueDiligence" AS ENUM ('validado', 'en_proceso', 'pendiente');

-- CreateTable
CREATE TABLE "plazas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "gerenteId" TEXT,

    CONSTRAINT "plazas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "contrasenaHash" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'cerrador',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAcceso" TIMESTAMP(3),
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_plazas" (
    "usuarioId" TEXT NOT NULL,
    "plazaId" TEXT NOT NULL,
    "certificado" BOOLEAN NOT NULL DEFAULT false,
    "progreso" INTEGER NOT NULL DEFAULT 0,
    "venceEl" TIMESTAMP(3),

    CONSTRAINT "usuarios_plazas_pkey" PRIMARY KEY ("usuarioId","plazaId")
);

-- CreateTable
CREATE TABLE "desarrollos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "plazaId" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "zona" TEXT,
    "direccion" TEXT,
    "mapaUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "tipo" "TipoPropiedad" NOT NULL DEFAULT 'departamento',
    "desarrollador" TEXT,
    "estatus" "EstatusListing" NOT NULL DEFAULT 'borrador',
    "entrega" TEXT,
    "entregaIso" TEXT,
    "amenidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aConsiderar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsableId" TEXT NOT NULL,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desarrollos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipologias" (
    "id" TEXT NOT NULL,
    "desarrolloId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "recamaras" INTEGER,
    "banos" DOUBLE PRECISION,
    "m2Construccion" DOUBLE PRECISION,
    "m2Terreno" DOUBLE PRECISION,
    "estacionamientos" INTEGER,
    "planoUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tipologias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveles_precio" (
    "id" TEXT NOT NULL,
    "tipologiaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioLista" DECIMAL(14,2),
    "precioVenta" DECIMAL(14,2),
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "disponibles" INTEGER,
    "vigenteDesde" TIMESTAMP(3),
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "niveles_precio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condiciones_comerciales" (
    "desarrolloId" TEXT NOT NULL,
    "enganchePct" DOUBLE PRECISION,
    "engancheNota" TEXT,
    "restoPct" DOUBLE PRECISION,
    "restoNota" TEXT,
    "mensualidades" TEXT,
    "formasPago" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promocionVigente" TEXT,
    "descuentoContado" TEXT,

    CONSTRAINT "condiciones_comerciales_pkey" PRIMARY KEY ("desarrolloId")
);

-- CreateTable
CREATE TABLE "info_comercial" (
    "desarrolloId" TEXT NOT NULL,
    "buyerPersona" TEXT,
    "clienteIdeal" TEXT,
    "argumentos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "diferenciadores" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objeciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comparables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noDeberiaComprarlo" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "info_comercial_pkey" PRIMARY KEY ("desarrolloId")
);

-- CreateTable
CREATE TABLE "info_interna" (
    "desarrolloId" TEXT NOT NULL,
    "comisionPct" DOUBLE PRECISION,
    "contactoComercial" TEXT,
    "convenioFirmado" BOOLEAN,
    "dueDiligence" "DueDiligence" NOT NULL DEFAULT 'pendiente',
    "notasInternas" TEXT,

    CONSTRAINT "info_interna_pkey" PRIMARY KEY ("desarrolloId")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "desarrolloId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "FuenteTipo" NOT NULL,
    "url" TEXT,
    "cargadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multimedia" (
    "id" TEXT NOT NULL,
    "desarrolloId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "multimedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validaciones" (
    "id" TEXT NOT NULL,
    "desarrolloId" TEXT NOT NULL,
    "campo" "CampoValidable" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "validadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cambios" (
    "id" TEXT NOT NULL,
    "desarrolloId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "campoClave" TEXT,
    "tipologiaId" TEXT,
    "nivel" TEXT,
    "valorAnterior" TEXT NOT NULL,
    "valorNuevo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fuente" "FuenteTipo" NOT NULL,
    "evidenciaUrl" TEXT,
    "nota" TEXT,
    "estado" "EstadoCambio" NOT NULL DEFAULT 'pendiente',
    "aprobadoPorId" TEXT,
    "aprobadoEl" TIMESTAMP(3),

    CONSTRAINT "cambios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT,
    "telefono" TEXT,
    "ciudadResidencia" TEXT,
    "presupuestoMin" DECIMAL(14,2),
    "presupuestoMax" DECIMAL(14,2),
    "recamaras" TEXT,
    "objetivo" "Objetivo",
    "plazasInteres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kommoLeadId" TEXT,
    "kommoEtapa" TEXT,
    "responsableId" TEXT,
    "notas" TEXT,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividad" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texto" TEXT NOT NULL,

    CONSTRAINT "actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propuestas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "formato" "FormatoPropuesta" NOT NULL DEFAULT 'web',
    "opciones" JSONB NOT NULL DEFAULT '{}',
    "creadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaEl" TIMESTAMP(3),
    "estado" "EstadoPropuesta" NOT NULL DEFAULT 'borrador',
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "kommoLeadId" TEXT,

    CONSTRAINT "propuestas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propuesta_items" (
    "id" TEXT NOT NULL,
    "propuestaId" TEXT NOT NULL,
    "desarrolloId" TEXT NOT NULL,
    "tipologiaId" TEXT,
    "nivel" TEXT,
    "precioCongelado" DECIMAL(14,2),
    "razon" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "propuesta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulos_capacitacion" (
    "id" TEXT NOT NULL,
    "plazaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "url" TEXT,
    "ejemplo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "modulos_capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preguntas_evaluacion" (
    "id" TEXT NOT NULL,
    "plazaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "opciones" TEXT[],
    "correcta" INTEGER NOT NULL,

    CONSTRAINT "preguntas_evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progreso_modulos" (
    "usuarioId" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "completadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progreso_modulos_pkey" PRIMARY KEY ("usuarioId","moduloId")
);

-- CreateTable
CREATE TABLE "intentos_evaluacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "plazaId" TEXT NOT NULL,
    "aciertos" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "aprobado" BOOLEAN NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intentos_evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparacion_desarrollos" (
    "usuarioId" TEXT NOT NULL,
    "desarrolloId" TEXT NOT NULL,
    "items" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "preparacion_desarrollos_pkey" PRIMARY KEY ("usuarioId","desarrolloId")
);

-- CreateTable
CREATE TABLE "eventos_kommo" (
    "id" TEXT NOT NULL,
    "recibidoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,

    CONSTRAINT "eventos_kommo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "desarrollos_plazaId_idx" ON "desarrollos"("plazaId");

-- CreateIndex
CREATE INDEX "desarrollos_estatus_idx" ON "desarrollos"("estatus");

-- CreateIndex
CREATE INDEX "tipologias_desarrolloId_idx" ON "tipologias"("desarrolloId");

-- CreateIndex
CREATE INDEX "niveles_precio_tipologiaId_idx" ON "niveles_precio"("tipologiaId");

-- CreateIndex
CREATE INDEX "documentos_desarrolloId_idx" ON "documentos"("desarrolloId");

-- CreateIndex
CREATE INDEX "multimedia_desarrolloId_idx" ON "multimedia"("desarrolloId");

-- CreateIndex
CREATE INDEX "validaciones_desarrolloId_campo_idx" ON "validaciones"("desarrolloId", "campo");

-- CreateIndex
CREATE INDEX "cambios_desarrolloId_idx" ON "cambios"("desarrolloId");

-- CreateIndex
CREATE INDEX "cambios_estado_idx" ON "cambios"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_kommoLeadId_key" ON "clientes"("kommoLeadId");

-- CreateIndex
CREATE INDEX "actividad_clienteId_idx" ON "actividad"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "propuestas_slug_key" ON "propuestas"("slug");

-- CreateIndex
CREATE INDEX "propuestas_clienteId_idx" ON "propuestas"("clienteId");

-- CreateIndex
CREATE INDEX "propuesta_items_propuestaId_idx" ON "propuesta_items"("propuestaId");

-- CreateIndex
CREATE INDEX "modulos_capacitacion_plazaId_idx" ON "modulos_capacitacion"("plazaId");

-- CreateIndex
CREATE INDEX "preguntas_evaluacion_plazaId_idx" ON "preguntas_evaluacion"("plazaId");

-- CreateIndex
CREATE INDEX "intentos_evaluacion_usuarioId_idx" ON "intentos_evaluacion"("usuarioId");

-- CreateIndex
CREATE INDEX "eventos_kommo_recibidoEl_idx" ON "eventos_kommo"("recibidoEl");

-- AddForeignKey
ALTER TABLE "plazas" ADD CONSTRAINT "plazas_gerenteId_fkey" FOREIGN KEY ("gerenteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_plazas" ADD CONSTRAINT "usuarios_plazas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_plazas" ADD CONSTRAINT "usuarios_plazas_plazaId_fkey" FOREIGN KEY ("plazaId") REFERENCES "plazas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desarrollos" ADD CONSTRAINT "desarrollos_plazaId_fkey" FOREIGN KEY ("plazaId") REFERENCES "plazas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desarrollos" ADD CONSTRAINT "desarrollos_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveles_precio" ADD CONSTRAINT "niveles_precio_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_comerciales" ADD CONSTRAINT "condiciones_comerciales_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_comercial" ADD CONSTRAINT "info_comercial_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_interna" ADD CONSTRAINT "info_interna_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "info_interna"("desarrolloId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multimedia" ADD CONSTRAINT "multimedia_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios" ADD CONSTRAINT "cambios_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios" ADD CONSTRAINT "cambios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios" ADD CONSTRAINT "cambios_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuesta_items" ADD CONSTRAINT "propuesta_items_propuestaId_fkey" FOREIGN KEY ("propuestaId") REFERENCES "propuestas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuesta_items" ADD CONSTRAINT "propuesta_items_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "tipologias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modulos_capacitacion" ADD CONSTRAINT "modulos_capacitacion_plazaId_fkey" FOREIGN KEY ("plazaId") REFERENCES "plazas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas_evaluacion" ADD CONSTRAINT "preguntas_evaluacion_plazaId_fkey" FOREIGN KEY ("plazaId") REFERENCES "plazas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_modulos" ADD CONSTRAINT "progreso_modulos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_modulos" ADD CONSTRAINT "progreso_modulos_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "modulos_capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos_evaluacion" ADD CONSTRAINT "intentos_evaluacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparacion_desarrollos" ADD CONSTRAINT "preparacion_desarrollos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparacion_desarrollos" ADD CONSTRAINT "preparacion_desarrollos_desarrolloId_fkey" FOREIGN KEY ("desarrolloId") REFERENCES "desarrollos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
