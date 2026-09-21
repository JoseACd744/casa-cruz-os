import type { Desarrollo, FiltrosInventario, Tipologia } from "./types";

/** Cálculos que se hacen igual en la web y en la API. */

export function preciosDe(d: Desarrollo): number[] {
  return d.tipologias
    .flatMap((t) => t.niveles.map((n) => n.precioVenta))
    .filter((p): p is number => p !== null);
}

export function precioDesde(d: Desarrollo): number | null {
  const precios = preciosDe(d);
  return precios.length ? Math.min(...precios) : null;
}

export function precioHasta(d: Desarrollo): number | null {
  const precios = preciosDe(d);
  return precios.length ? Math.max(...precios) : null;
}

function rango(valores: number[], sufijo = ""): string | null {
  if (!valores.length) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return min === max ? `${min}${sufijo}` : `${min} – ${max}${sufijo}`;
}

export function rangoRecamaras(d: Desarrollo): string | null {
  return rango(d.tipologias.map((t) => t.recamaras).filter((r): r is number => r !== null));
}

export function rangoBanos(d: Desarrollo): string | null {
  return rango(d.tipologias.map((t) => t.banos).filter((b): b is number => b !== null));
}

export function rangoM2(d: Desarrollo): string | null {
  return rango(
    d.tipologias.map((t) => t.m2Construccion).filter((m): m is number => m !== null),
    " m²",
  );
}

export function precioPorM2(t: Tipologia): number | null {
  const precios = t.niveles.map((n) => n.precioVenta).filter((p): p is number => p !== null);
  if (!precios.length || !t.m2Construccion) return null;
  return Math.round(Math.min(...precios) / t.m2Construccion);
}

export function tipologiaMasBarata(d: Desarrollo): Tipologia | null {
  let mejor: Tipologia | null = null;
  let mejorPrecio = Infinity;
  for (const t of d.tipologias) {
    for (const n of t.niveles) {
      if (n.precioVenta !== null && n.precioVenta < mejorPrecio) {
        mejorPrecio = n.precioVenta;
        mejor = t;
      }
    }
  }
  return mejor;
}

/** Filtro del inventario. Vive aquí para que la API y el mock filtren igual. */
export function filtrarDesarrollos(
  desarrollos: Desarrollo[],
  filtros: FiltrosInventario = {},
): Desarrollo[] {
  let out = [...desarrollos];

  if (filtros.soloPublicados) out = out.filter((d) => d.estatus === "publicado");
  if (filtros.ciudad) out = out.filter((d) => d.ciudad === filtros.ciudad);

  if (filtros.q) {
    const q = filtros.q.toLowerCase();
    out = out.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        d.ciudad.toLowerCase().includes(q) ||
        (d.zona ?? "").toLowerCase().includes(q),
    );
  }

  if (filtros.recamaras) {
    out = out.filter((d) =>
      d.tipologias.some((t) => t.recamaras !== null && t.recamaras >= filtros.recamaras!),
    );
  }

  if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
    const min = filtros.precioMin ?? 0;
    const max = filtros.precioMax ?? Infinity;
    out = out.filter((d) => {
      const desde = precioDesde(d);
      // Un desarrollo sin precio capturado no se descarta: se muestra marcado
      // como dato faltante, que es justamente lo que hay que corregir.
      if (desde === null) return true;
      return desde >= min && desde <= max;
    });
  }

  return out.sort((a, b) => (precioDesde(a) ?? Infinity) - (precioDesde(b) ?? Infinity));
}
