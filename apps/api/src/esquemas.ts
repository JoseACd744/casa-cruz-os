import { z } from "zod";
import type {
  Cambio,
  Cliente,
  Desarrollo,
  Plaza,
  Propuesta,
  PropuestaPublica,
  Usuario,
} from "@casacruz/core";

/**
 * Esquemas de la API.
 *
 * Describen lo que entra y lo que sale de cada ruta, y de ellos sale la
 * documentación (OpenAPI → Scalar en /docs). El `satisfies z.ZodType<…>` obliga
 * a que coincidan con el modelo del núcleo: si alguien agrega un campo allá y
 * lo olvida aquí, TypeScript lo marca.
 */

export const rol = z.enum(["cliente", "cerrador", "gerente", "corporativo"]);
export const estatusListing = z.enum([
  "borrador",
  "revision",
  "due_diligence",
  "aprobado",
  "publicado",
]);
export const tipoPropiedad = z.enum(["departamento", "casa", "terreno", "local"]);
export const objetivo = z.enum(["vivienda", "inversion", "retiro"]);
export const campoValidable = z.enum([
  "precio",
  "disponibilidad",
  "promocion",
  "entrega",
  "comision",
]);
export const fuenteTipo = z.enum([
  "lista_precios",
  "brochure",
  "correo",
  "whatsapp",
  "convenio",
  "llamada",
  "contrato",
  "otro",
]);
export const estadoCambio = z.enum(["publicado", "pendiente", "rechazado"]);

export const plazaSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    gerenteId: z.string().nullable(),
    activa: z.boolean(),
  })
  .meta({ id: "Plaza", description: "Mercado donde opera Casa Cruz." }) satisfies z.ZodType<Plaza>;

export const nivelSchema = z.object({
  nombre: z.string().meta({ example: "Planta baja" }),
  precioLista: z.number().nullable(),
  precioVenta: z.number().nullable(),
  disponibles: z.number().nullable(),
});

export const tipologiaSchema = z.object({
  id: z.string(),
  desarrolloId: z.string(),
  nombre: z.string(),
  recamaras: z.number().nullable(),
  banos: z.number().nullable(),
  m2Construccion: z.number().nullable(),
  m2Terreno: z.number().nullable(),
  estacionamientos: z.number().nullable(),
  planoUrl: z.string().nullable(),
  niveles: z.array(nivelSchema),
});

export const desarrolloSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    plazaId: z.string(),
    ciudad: z.string(),
    zona: z.string().nullable(),
    direccion: z.string().nullable(),
    mapaUrl: z.string().nullable(),
    lat: z.number().nullable().meta({ example: 20.6274 }),
    lng: z.number().nullable().meta({ example: -87.0799 }),
    tipo: tipoPropiedad,
    desarrollador: z.string().nullable(),
    estatus: estatusListing,
    entrega: z.string().nullable().meta({ example: "Marzo 2027" }),
    entregaIso: z.string().nullable(),
    responsableId: z.string(),
    amenidades: z.array(z.string()),
    aConsiderar: z.array(z.string()).meta({
      description: "Advertencias que sí se muestran al cliente, como torres sin elevador.",
    }),
    multimedia: z
      .array(
        z.object({
          tipo: z.enum(["foto", "render", "plano", "video", "brochure", "mapa"]),
          url: z.string(),
          orden: z.number(),
        }),
      )
      .optional(),
    tipologias: z.array(tipologiaSchema),
    condiciones: z.object({
      enganchePct: z.number().nullable(),
      engancheNota: z.string().nullable(),
      restoPct: z.number().nullable(),
      restoNota: z.string().nullable(),
      mensualidades: z.string().nullable(),
      formasPago: z.array(z.string()),
      promocionVigente: z.string().nullable(),
      descuentoContado: z.string().nullable(),
    }),
    comercial: z.object({
      buyerPersona: z.string().nullable(),
      clienteIdeal: z.string().nullable(),
      argumentos: z.array(z.string()),
      diferenciadores: z.array(z.string()),
      objeciones: z.array(z.string()),
      comparables: z.array(z.string()),
      noDeberiaComprarlo: z.array(z.string()),
    }),
    interna: z
      .object({
        comisionPct: z.number().nullable(),
        contactoComercial: z.string().nullable(),
        convenioFirmado: z.boolean().nullable(),
        dueDiligence: z.enum(["validado", "en_proceso", "pendiente"]),
        notasInternas: z.string().nullable(),
        documentos: z.array(
          z.object({
            nombre: z.string(),
            tipo: fuenteTipo,
            cargadoHaceDias: z.number(),
          }),
        ),
      })
      .meta({ description: "Sólo para gerente y corporativo. No viaja a fichas ni propuestas." }),
    validaciones: z.array(
      z.object({
        campo: campoValidable,
        validadoPor: z.string(),
        haceDias: z.number(),
      }),
    ),
  })
  .meta({
    id: "Desarrollo",
    description:
      "Un desarrollo de la Base Maestra. Un campo en null significa que todavía no se captura: la interfaz lo muestra como [CAMPO] en lugar de inventarlo.",
  }) satisfies z.ZodType<Desarrollo>;

export const usuarioSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    correo: z.string(),
    telefono: z.string().nullable(),
    rol,
    plazasCertificadas: z.array(z.string()).meta({
      description: "Un cerrador sólo puede vender las plazas en las que está certificado.",
    }),
    plazasEnProgreso: z.array(z.string()),
    activo: z.boolean(),
    ultimoAcceso: z.string(),
    desarrollosACargo: z.number(),
  })
  .meta({ id: "Usuario" }) satisfies z.ZodType<Usuario>;

export const clienteSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    correo: z.string().nullable(),
    telefono: z.string().nullable(),
    ciudadResidencia: z.string().nullable(),
    presupuestoMin: z.number().nullable(),
    presupuestoMax: z.number().nullable(),
    recamaras: z.string().nullable(),
    objetivo: objetivo.nullable(),
    plazasInteres: z.array(z.string()),
    kommoLeadId: z.string().nullable(),
    kommoEtapa: z.string().nullable(),
    notas: z.string().nullable(),
    actividad: z.array(z.object({ fecha: z.string(), texto: z.string() })),
  })
  .meta({ id: "Cliente", description: "Espejo del lead de Kommo más lo que busca." }) satisfies z.ZodType<Cliente>;

export const propuestaSchema = z
  .object({
    id: z.string(),
    slug: z.string().meta({ example: "berenice-fabian" }),
    clienteId: z.string(),
    usuarioId: z.string(),
    formato: z.enum(["ficha", "presentacion", "web", "pdf"]),
    opciones: z.object({
      esquemaPagos: z.boolean(),
      costosCierre: z.boolean(),
      comparativo: z.boolean(),
      videoInstitucional: z.boolean(),
      mapa: z.boolean(),
    }),
    items: z.array(
      z.object({
        desarrolloId: z.string(),
        tipologiaId: z.string(),
        nivel: z.string().nullable(),
        precioCongelado: z.number().nullable().meta({
          description: "Precio al momento de enviar: lo que vio el cliente no cambia después.",
        }),
        razon: z.string().nullable(),
      }),
    ),
    creadaEl: z.string().meta({ example: "18 septiembre 2026" }),
    creadaIso: z.string().meta({ description: "La misma fecha en ISO 8601." }),
    enviadaEl: z.string().nullable(),
    estado: z.enum(["borrador", "enviada", "vista", "negociacion", "sin_respuesta"]),
    vistas: z.number(),
    kommoLeadId: z.string().nullable(),
  })
  .meta({ id: "Propuesta" }) satisfies z.ZodType<Propuesta>;

export const propuestaPublicaSchema = z
  .object({
    propuesta: propuestaSchema,
    cliente: z.object({ nombre: z.string(), recamaras: z.string().nullable() }).nullable(),
    asesor: z
      .object({
        nombre: z.string(),
        correo: z.string(),
        telefono: z.string().nullable(),
        plazas: z.array(z.string()).meta({ description: "Nombres de las plazas en las que está certificado." }),
      })
      .nullable(),
    desarrollos: z.array(desarrolloSchema),
  })
  .meta({
    id: "PropuestaPublica",
    description:
      "Lo que ve el cliente en su enlace. Los desarrollos llegan sin información interna ni argumentos comerciales.",
  }) satisfies z.ZodType<PropuestaPublica>;

export const cambioSchema = z
  .object({
    id: z.string(),
    desarrolloId: z.string(),
    desarrolloNombre: z.string(),
    campo: z.string(),
    valorAnterior: z.string(),
    valorNuevo: z.string(),
    usuario: z.string(),
    fecha: z.string(),
    fuente: fuenteTipo,
    evidencia: z.string().nullable(),
    estado: estadoCambio,
  })
  .meta({
    id: "Cambio",
    description: "Una línea del historial: quién cambió qué, cuándo y con qué respaldo.",
  }) satisfies z.ZodType<Cambio>;

export const estadoCampoSchema = z.object({
  campo: campoValidable,
  etiqueta: z.string(),
  estado: z.enum(["vigente", "por_vencer", "vencido", "sin_validar"]),
  haceDias: z.number().nullable(),
  validadoPor: z.string().nullable(),
  vigenciaDias: z.number(),
});

export const confiabilidadSchema = z
  .object({
    valor: z.number().meta({ example: 93 }),
    campos: z.array(estadoCampoSchema),
  })
  .meta({
    id: "Confiabilidad",
    description: "Se calcula desde las validaciones; nunca se captura a mano.",
  });

export const novedadSchema = z.object({
  fecha: z.string(),
  titulo: z.string(),
  detalle: z.string(),
});

export const pipelineSchema = z
  .object({
    borrador: z.number(),
    revision: z.number(),
    due_diligence: z.number(),
    aprobado: z.number(),
    publicado: z.number(),
  })
  .meta({ id: "Pipeline", description: "Conteo de desarrollos por etapa de alta." });

export const errorSchema = z
  .object({ error: z.string(), detalle: z.unknown().optional() })
  .meta({ id: "Error" });

// ── Entradas ─────────────────────────────────────────────────────────────

const booleanoDeQuery = z
  .enum(["0", "1", "true", "false"])
  .optional()
  .transform((v) => v === "1" || v === "true");

export const filtrosInventarioSchema = z.object({
  q: z.string().optional().meta({ description: "Busca en nombre, ciudad o zona." }),
  ciudad: z.string().optional().meta({ example: "Playa del Carmen" }),
  recamaras: z.coerce.number().int().positive().optional(),
  precioMin: z.coerce.number().nonnegative().optional(),
  precioMax: z.coerce.number().nonnegative().optional().meta({ example: 3500000 }),
  soloPublicados: booleanoDeQuery,
});

export const nuevoCambioSchema = z
  .object({
    desarrolloId: z.string().min(1),
    campo: z.string().min(1).meta({ example: "precio" }),
    valorAnterior: z.string(),
    valorNuevo: z.string().min(1),
    fuente: fuenteTipo,
    evidenciaUrl: z.string().min(1).nullish().meta({
      description: "Documento que respalda el cambio. Sin él, queda pendiente de aprobación.",
    }),
    nota: z.string().nullish(),
  })
  .meta({ id: "NuevoCambio" });

export const nuevaValidacionSchema = z
  .object({
    campo: campoValidable,
  })
  .meta({ id: "NuevaValidacion" });

export const respuestaCambioSchema = z.object({
  cambio: cambioSchema,
  requiereAprobacion: z.boolean().meta({
    description:
      "true cuando el campo es sensible o la fuente no admite evidencia: el cambio no se publica hasta que un gerente lo apruebe.",
  }),
});

export const saludSchema = z.object({
  ok: z.boolean(),
  servicio: z.string(),
  origenDeDatos: z.enum(["postgres", "mock"]),
  configurado: z.string(),
  aviso: z.string().nullable(),
  integraciones: z
    .object({
      archivos: z.enum(["bucket", "local", "sin_configurar"]),
      kommo: z.boolean(),
      mapas: z.enum(["google", "openstreetmap"]),
    })
    .meta({ description: "Qué está conectado, para que la interfaz no prometa lo que no hay." }),
});
