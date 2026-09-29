import Link from "next/link";
import { notFound } from "next/navigation";
import { Simulador, type OpcionPrecio } from "@/components/Simulador";
import { obtenerDesarrollo } from "@/lib/repo";

export default async function SimuladorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await obtenerDesarrollo(id);
  if (!d) notFound();

  const opciones: OpcionPrecio[] = d.tipologias.flatMap((t) =>
    t.niveles
      .filter((n) => n.precioVenta !== null)
      .map((n) => ({
        id: `${t.id}-${n.nombre}`,
        etiqueta: `${t.recamaras ?? "?"} hab · ${n.nombre}`,
        precio: n.precioVenta as number,
      })),
  );

  return (
    <>
      <header className="encabezado print:hidden">
        <Link
          href={`/propiedades/${d.id}`}
          className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-ink-2 uppercase hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          {d.nombre}
        </Link>
        <span className="text-[11.5px] text-faint">/</span>
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">SIMULADOR DE CRÉDITO</span>
      </header>

      {opciones.length === 0 ? (
        <p className="p-8 text-[13px] text-alert">
          Este desarrollo todavía no tiene precios capturados, así que no puede simularse. Captura al
          menos una tipología con precio.
        </p>
      ) : (
        <Simulador
          nombre={d.nombre}
          subtitulo={`${d.ciudad} · entrega ${d.entrega ?? "[por confirmar]"}`}
          opciones={opciones}
          engancheSugerido={d.condiciones.enganchePct}
          volverHref={`/propiedades/${d.id}`}
        />
      )}
    </>
  );
}
