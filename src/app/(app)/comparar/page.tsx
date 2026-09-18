import Link from "next/link";
import { Comparador, type FilaComparable } from "@/components/Comparador";
import { confiabilidad } from "@/lib/confiabilidad";
import { listarDesarrollos, precioDesde, precioPorM2, tipologiaMasBarata } from "@/lib/repo";

export default async function CompararPage() {
  const desarrollos = await listarDesarrollos();

  const catalogo: FilaComparable[] = desarrollos.map((d) => {
    const t = tipologiaMasBarata(d);
    return {
      id: d.id,
      nombre: d.nombre,
      ciudad: d.ciudad,
      precioDesde: precioDesde(d),
      precioM2: t ? precioPorM2(t) : null,
      recamaras: t?.recamaras ?? null,
      banos: t?.banos ?? null,
      m2: t?.m2Construccion ?? null,
      entrega: d.entrega,
      enganchePct: d.condiciones.enganchePct,
      aConsiderar: d.aConsiderar.join(" · ") || "—",
      confiabilidad: confiabilidad(d),
    };
  });

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
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">COMPARAR</span>
      </header>
      <Comparador catalogo={catalogo} />
    </>
  );
}
