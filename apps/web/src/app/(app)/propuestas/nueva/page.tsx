import Link from "next/link";
import {
  ConstructorPropuesta,
  type OpcionDesarrollo,
} from "@/components/ConstructorPropuesta";
import { advertencia, confiabilidad, galeria } from "@casacruz/core";
import { moneyCorto } from "@casacruz/core";
import { listarDesarrollos, obtenerCliente } from "@/lib/repo";

export default async function NuevaPropuestaPage() {
  const desarrollos = await listarDesarrollos();
  const cliente = await obtenerCliente("c-berenice-fabian");

  const catalogo: OpcionDesarrollo[] = desarrollos.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    foto: galeria(d).principal,
    ciudad: d.ciudad,
    entrega: d.entrega,
    confiabilidad: confiabilidad(d),
    advertencia: advertencia(d),
    tipologias: d.tipologias.map((t) => {
      const precios = t.niveles
        .map((n) => n.precioVenta)
        .filter((p): p is number => p !== null);
      return {
        id: t.id,
        nombre: t.nombre,
        precioDesde: precios.length ? Math.min(...precios) : null,
        recamaras: t.recamaras,
        m2: t.m2Construccion,
      };
    }),
  }));

  return (
    <>
      <header className="flex h-15 shrink-0 items-center gap-3.5 border-b border-line bg-panel px-8">
        <Link
          href="/propiedades"
          className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-ink-2 hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          PROPIEDADES
        </Link>
        <span className="text-[11.5px] text-faint">/</span>
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">NUEVA PROPUESTA</span>
        <div className="grow" />
        <span className="text-[11px] text-muted">Borrador guardado automáticamente</span>
      </header>

      <ConstructorPropuesta
        catalogo={catalogo}
        cliente={{
          id: cliente?.id ?? "",
          nombre: cliente?.nombre ?? "[CLIENTE]",
          presupuesto: `${moneyCorto(cliente?.presupuestoMin)} – ${moneyCorto(cliente?.presupuestoMax)} MXN`,
          recamaras: cliente?.recamaras ?? "[ ]",
          plaza: "Playa del Carmen",
          kommoLeadId: cliente?.kommoLeadId ?? null,
          slug: "berenice-fabian",
        }}
      />
    </>
  );
}
