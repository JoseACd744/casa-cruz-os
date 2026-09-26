import type {
  Cambio,
  CampoValidable,
  CondicionComercial,
  Desarrollo,
  InfoInterna,
  Nivel,
  Rol,
  Tipologia,
} from "./types";
import { etiquetaFuente, money } from "./format";
import { fechaCorta } from "./fechas";
import { alcanza } from "./roles";

/**
 * Cambios que modifican el dato.
 *
 * Un cambio no es una nota en el historial: cuando se publica, el valor nuevo
 * pasa a la Base Maestra y el campo cuenta como validado. Para eso el cambio
 * sabe exactamente a dónde va (campo, tipología y nivel) y el servidor calcula
 * el valor anterior; nadie lo escribe a mano.
 */

export type CampoCambiable =
  | "precio"
  | "disponibilidad"
  | "promocion"
  | "entrega"
  | "comision"
  | "enganche";

export interface DestinoCambio {
  campo: CampoCambiable;
  /** Precio y disponibilidad van por tipología y nivel. */
  tipologiaId?: string | null;
  nivel?: string | null;
}

export type TipoValor = "dinero" | "entero" | "porcentaje" | "texto";

export interface DefinicionCampo {
  etiqueta: string;
  porNivel: boolean;
  tipo: TipoValor;
  /** Validación que se refresca al publicarse. */
  valida: CampoValidable | null;
  ayuda: string;
}

export const CAMPOS_CAMBIABLES: Record<CampoCambiable, DefinicionCampo> = {
  precio: {
    etiqueta: "Precio de venta",
    porNivel: true,
    tipo: "dinero",
    valida: "precio",
    ayuda: "Por ejemplo $3,500,000",
  },
  disponibilidad: {
    etiqueta: "Disponibilidad",
    porNivel: true,
    tipo: "entero",
    valida: "disponibilidad",
    ayuda: "Unidades disponibles en ese nivel",
  },
  promocion: {
    etiqueta: "Promoción vigente",
    porNivel: false,
    tipo: "texto",
    valida: "promocion",
    ayuda: "Si ya no hay, escribe “Sin promoción”",
  },
  entrega: {
    etiqueta: "Fecha de entrega",
    porNivel: false,
    tipo: "texto",
    valida: "entrega",
    ayuda: "Mes y año, por ejemplo “Marzo 2027”",
  },
  comision: {
    etiqueta: "Comisión autorizada",
    porNivel: false,
    tipo: "porcentaje",
    valida: "comision",
    ayuda: "Porcentaje, por ejemplo 4",
  },
  enganche: {
    etiqueta: "Esquema: enganche",
    porNivel: false,
    tipo: "porcentaje",
    valida: null,
    ayuda: "Porcentaje a la firma, por ejemplo 10",
  },
};

export const LISTA_CAMPOS_CAMBIABLES = Object.keys(CAMPOS_CAMBIABLES) as CampoCambiable[];

const SIN_CAPTURAR = "[SIN CAPTURAR]";

// ── Destino ──────────────────────────────────────────────────────────────

export type DestinoResuelto =
  | { ok: true; destino: DestinoCambio; tipologia: Tipologia | null; nivel: Nivel | null }
  | { ok: false; error: string };

/** Comprueba que el destino exista en el desarrollo. */
export function resolverDestino(d: Desarrollo, destino: DestinoCambio): DestinoResuelto {
  const def = CAMPOS_CAMBIABLES[destino.campo];
  if (!def) return { ok: false, error: `El campo "${destino.campo}" no se puede cambiar así.` };
  if (!def.porNivel) {
    return { ok: true, destino: { campo: destino.campo }, tipologia: null, nivel: null };
  }

  const tipologia = d.tipologias.find((t) => t.id === destino.tipologiaId);
  if (!tipologia) return { ok: false, error: "Elige la tipología a la que aplica el cambio." };
  const nivel = tipologia.niveles.find((n) => n.nombre === destino.nivel);
  if (!nivel) return { ok: false, error: `Elige el nivel de ${tipologia.nombre} al que aplica.` };

  return {
    ok: true,
    destino: { campo: destino.campo, tipologiaId: tipologia.id, nivel: nivel.nombre },
    tipologia,
    nivel,
  };
}

/** "Precio de venta · Departamento 3 habitaciones · Planta baja" */
export function etiquetaDestino(d: Desarrollo, destino: DestinoCambio): string {
  const def = CAMPOS_CAMBIABLES[destino.campo];
  if (!def.porNivel) return def.etiqueta;
  const tipologia = d.tipologias.find((t) => t.id === destino.tipologiaId);
  return [def.etiqueta, tipologia?.nombre ?? destino.tipologiaId, destino.nivel].filter(Boolean).join(" · ");
}

// ── Valores ──────────────────────────────────────────────────────────────

function unidades(n: number): string {
  return `${n} ${n === 1 ? "unidad" : "unidades"}`;
}

/** El valor que hoy tiene la Base Maestra, escrito igual que se escribirá el nuevo. */
export function valorActual(d: Desarrollo, destino: DestinoCambio): string {
  const r = resolverDestino(d, destino);
  if (!r.ok) return SIN_CAPTURAR;

  switch (destino.campo) {
    case "precio":
      return r.nivel!.precioVenta === null ? SIN_CAPTURAR : money(r.nivel!.precioVenta);
    case "disponibilidad":
      return r.nivel!.disponibles === null ? SIN_CAPTURAR : unidades(r.nivel!.disponibles);
    case "promocion":
      return d.condiciones.promocionVigente ?? SIN_CAPTURAR;
    case "entrega":
      return d.entrega ?? SIN_CAPTURAR;
    case "comision":
      return d.interna.comisionPct === null ? SIN_CAPTURAR : `${d.interna.comisionPct}%`;
    case "enganche":
      return d.condiciones.enganchePct === null ? SIN_CAPTURAR : `${d.condiciones.enganchePct}%`;
  }
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * "Marzo 2027", "marzo de 2027", "03/2027" o "2027-03" → { texto, iso }.
 * Null si no trae mes y año.
 */
export function entregaDe(texto: string): { texto: string; iso: string } | null {
  const t = sinAcentos(texto.trim());
  let mes: number | null = null;
  let anio: number | null = null;

  const conNombre = t.match(/^([a-z]+)\s+(?:de\s+|del\s+)?(\d{4})$/);
  if (conNombre) {
    const i = MESES.indexOf(conNombre[1] === "setiembre" ? "septiembre" : conNombre[1]);
    if (i >= 0) {
      mes = i + 1;
      anio = Number(conNombre[2]);
    }
  }
  const numerica = t.match(/^(\d{1,2})\s*[/-]\s*(\d{4})$/) ?? null;
  if (numerica) {
    mes = Number(numerica[1]);
    anio = Number(numerica[2]);
  }
  const iso = t.match(/^(\d{4})-(\d{2})$/);
  if (iso) {
    anio = Number(iso[1]);
    mes = Number(iso[2]);
  }

  if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000 || anio > 2100) return null;
  const nombre = MESES[mes - 1];
  return {
    texto: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`,
    iso: `${anio}-${String(mes).padStart(2, "0")}`,
  };
}

export type ValorInterpretado =
  | { ok: true; valor: number | string; texto: string }
  | { ok: false; error: string };

/**
 * Lo que escribió el cerrador, convertido al dato que se guarda.
 * `texto` es cómo queda escrito en el historial ("$3,500,000", "12 unidades").
 */
export function interpretarValor(campo: CampoCambiable, entrada: string): ValorInterpretado {
  const def = CAMPOS_CAMBIABLES[campo];
  const texto = entrada.trim();
  if (!texto) return { ok: false, error: "Escribe el valor nuevo." };

  switch (def.tipo) {
    case "dinero": {
      if (/-/.test(texto)) return { ok: false, error: "El precio no puede ser negativo." };
      const limpio = texto.replace(/mxn|\$|,|\s/gi, "");
      if (!/^\d+(\.\d{1,2})?$/.test(limpio)) {
        return { ok: false, error: `Escribe el precio en pesos, por ejemplo $3,500,000.` };
      }
      const valor = Number(limpio);
      if (valor < 10_000) return { ok: false, error: "Ese precio parece incompleto: escríbelo completo en pesos." };
      if (valor > 1_000_000_000) return { ok: false, error: "Ese precio es demasiado alto: revísalo." };
      return { ok: true, valor, texto: money(valor) };
    }
    case "entero": {
      if (/-/.test(texto)) return { ok: false, error: "La disponibilidad no puede ser negativa." };
      const numero = texto.match(/^\d+/);
      if (!numero) return { ok: false, error: "Escribe cuántas unidades hay disponibles, por ejemplo 12." };
      const valor = Number(numero[0]);
      return { ok: true, valor, texto: unidades(valor) };
    }
    case "porcentaje": {
      const limpio = texto.replace(/%|\s/g, "").replace(",", ".");
      if (!/^\d+(\.\d+)?$/.test(limpio)) return { ok: false, error: "Escribe un porcentaje, por ejemplo 4.5." };
      const valor = Number(limpio);
      if (valor > 100) return { ok: false, error: "Un porcentaje no puede pasar de 100." };
      return { ok: true, valor, texto: `${valor}%` };
    }
    case "texto": {
      if (texto.length > 200) return { ok: false, error: "Es demasiado largo: resúmelo en una línea." };
      if (campo === "entrega") {
        const entrega = entregaDe(texto);
        if (!entrega) return { ok: false, error: "Escribe el mes y el año de entrega, por ejemplo Marzo 2027." };
        return { ok: true, valor: entrega.texto, texto: entrega.texto };
      }
      return { ok: true, valor: texto, texto };
    }
  }
}

// ── Efecto en la Base Maestra ────────────────────────────────────────────

export interface ParcheDeCambio {
  entrega?: string;
  entregaIso?: string | null;
  condiciones?: Partial<CondicionComercial>;
  interna?: Partial<Pick<InfoInterna, "comisionPct">>;
}

export type EfectoDeCambio =
  | { tipo: "tipologia"; tipologia: Tipologia }
  | { tipo: "desarrollo"; parche: ParcheDeCambio };

/** Qué hay que escribir en la Base Maestra para que el cambio quede aplicado. */
export function efectoDeCambio(
  d: Desarrollo,
  destino: DestinoCambio,
  valor: number | string,
): EfectoDeCambio {
  switch (destino.campo) {
    case "precio":
    case "disponibilidad": {
      const tipologia = d.tipologias.find((t) => t.id === destino.tipologiaId);
      if (!tipologia) throw new Error("La tipología ya no existe");
      const niveles = tipologia.niveles.map((n) => {
        if (n.nombre !== destino.nivel) return { ...n };
        if (destino.campo === "disponibilidad") return { ...n, disponibles: Number(valor) };
        // Sin descuento de por medio, el precio de lista se mueve con el de venta.
        const listaIgual = n.precioLista === null || n.precioLista === n.precioVenta;
        return {
          ...n,
          precioVenta: Number(valor),
          precioLista: listaIgual ? Number(valor) : n.precioLista,
        };
      });
      return { tipo: "tipologia", tipologia: { ...tipologia, niveles } };
    }
    case "promocion":
      return { tipo: "desarrollo", parche: { condiciones: { promocionVigente: String(valor) } } };
    case "entrega":
      return {
        tipo: "desarrollo",
        parche: { entrega: String(valor), entregaIso: entregaDe(String(valor))?.iso ?? null },
      };
    case "comision":
      return { tipo: "desarrollo", parche: { interna: { comisionPct: Number(valor) } } };
    case "enganche": {
      const { enganchePct, restoPct } = d.condiciones;
      // Si el resto completaba el 100 %, se ajusta con el enganche nuevo.
      const complementa = enganchePct !== null && restoPct !== null && enganchePct + restoPct === 100;
      return {
        tipo: "desarrollo",
        parche: {
          condiciones: {
            enganchePct: Number(valor),
            ...(complementa ? { restoPct: 100 - Number(valor) } : {}),
          },
        },
      };
    }
  }
}

// ── Aprobación ───────────────────────────────────────────────────────────

/**
 * Por qué esta persona no puede aprobar o rechazar el cambio, o null si puede.
 * El código es el que responde la API.
 */
export function motivoParaNoAprobar(
  cambio: Pick<Cambio, "estado" | "usuarioId">,
  sesion: { id: string; rol: Rol },
): { codigo: 403 | 409; mensaje: string } | null {
  if (cambio.estado !== "pendiente") {
    return { codigo: 409, mensaje: `Este cambio ya está ${cambio.estado}.` };
  }
  if (!alcanza(sesion.rol, "gerente")) {
    return { codigo: 403, mensaje: "Aprobar cambios es de gerente o corporativo." };
  }
  if (cambio.usuarioId === sesion.id) {
    return {
      codigo: 403,
      mensaje: "Nadie aprueba su propio cambio: lo valida otro gerente o corporativo.",
    };
  }
  return null;
}

/** Últimos cambios publicados, para el tablero del cerrador. */
export function novedadesDe(
  cambios: Cambio[],
  limite = 6,
): { fecha: string; titulo: string; detalle: string }[] {
  return cambios
    .filter((c) => c.estado === "publicado")
    // Un cambio aprobado es noticia el día que se aprueba, no el que se registró.
    .map((c) => ({ c, cuando: c.resueltoIso ?? c.fechaIso }))
    .sort((a, b) => b.cuando.localeCompare(a.cuando))
    .slice(0, limite)
    .map(({ c, cuando }) => ({
      fecha: fechaCorta(new Date(cuando)).slice(0, 6).toUpperCase(),
      titulo: `${c.desarrolloNombre}: ${c.campo}`,
      detalle: `${c.valorAnterior} → ${c.valorNuevo}. Fuente: ${etiquetaFuente[c.fuente] ?? c.fuente}.`,
    }));
}
