import { notFound } from "next/navigation";
import { BarraDoc } from "@/components/BarraDoc";
import { Deck, type Slide } from "@/components/Deck";
import { galeria, money } from "@casacruz/core";
import { obtenerPropuestaPublica } from "@/lib/repo";

export default async function PresentacionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publica = await obtenerPropuestaPublica(slug);
  if (!publica) notFound();
  const { propuesta, cliente } = publica;
  const asesor = publica.asesor?.nombre ?? "Casa Cruz";

  const resueltos = [];
  for (const item of propuesta.items) {
    const d = publica.desarrollos.find((x) => x.id === item.desarrolloId);
    if (!d) continue;
    const t = d.tipologias.find((x) => x.id === item.tipologiaId);
    resueltos.push({ item, d, t });
  }

  const slides: Slide[] = [
    {
      tipo: "portada",
      titulo: "Propuesta\nde propiedades",
      cliente: cliente?.nombre ?? "[CLIENTE]",
      fecha: propuesta.creadaEl.toUpperCase(),
      asesor,
    },
    {
      tipo: "quienes",
      puntos: [
        {
          titulo: "Due diligence",
          texto:
            "Revisamos jurídicamente cada desarrollo antes de presentarlo. Si no pasa, no se los mostramos.",
        },
        {
          titulo: "Acompañamiento desde EE. UU.",
          texto:
            "Coordinamos visitas, notaría y crédito para quienes están fuera de México.",
        },
        {
          titulo: "Inventario curado",
          texto: "Precios y disponibilidad verificados con el desarrollador esta semana.",
        },
      ],
    },
    ...resueltos.map((r, i): Slide => {
      const precio = r.item.precioCongelado;
      const fotos = galeria(r.d);
      return {
        tipo: "propiedad",
        fotos: { principal: fotos.principal, secundarias: fotos.secundarias.slice(0, 2) },
        orden: `OPCIÓN ${i + 1} DE ${resueltos.length}`,
        nombre: r.d.nombre,
        subtitulo: `${r.d.ciudad} · entrega ${r.d.entrega ?? "[por confirmar]"}`,
        precio: precio === null ? "Consultar" : `${money(precio)} MXN`,
        precioFalta: precio === null,
        rec: String(r.t?.recamaras ?? "—"),
        banos: String(r.t?.banos ?? "—"),
        m2: r.t?.m2Construccion ? `${r.t.m2Construccion} m²` : "—",
        enganche:
          r.d.condiciones.enganchePct === null ? "Por confirmar" : `${r.d.condiciones.enganchePct}%`,
        razon:
          r.item.razon ??
          "Tu asesor te comparte el detalle de esta opción durante la llamada.",
        aConsiderar: r.d.aConsiderar.join(" · ") || null,
      };
    }),
    {
      tipo: "comparativo",
      columnas: resueltos.map((r) => r.d.nombre),
      filas: [
        {
          campo: "PRECIO DESDE",
          valores: resueltos.map((r) =>
            r.item.precioCongelado === null ? "Consultar" : money(r.item.precioCongelado),
          ),
        },
        { campo: "RECÁMARAS", valores: resueltos.map((r) => String(r.t?.recamaras ?? "—")) },
        {
          campo: "SUPERFICIE",
          valores: resueltos.map((r) => (r.t?.m2Construccion ? `${r.t.m2Construccion} m²` : "—")),
        },
        {
          campo: "ENTREGA",
          valores: resueltos.map((r) => r.d.entrega ?? "Por confirmar"),
        },
        {
          campo: "ENGANCHE",
          valores: resueltos.map((r) =>
            r.d.condiciones.enganchePct === null ? "Por confirmar" : `${r.d.condiciones.enganchePct}%`,
          ),
        },
        {
          campo: "A CONSIDERAR",
          valores: resueltos.map((r) => r.d.aConsiderar.join(" · ") || "—"),
        },
      ],
    },
    { tipo: "cierre", asesor },
  ];

  return (
    <>
      <BarraDoc titulo="Presentación" volverHref="/propuestas" volverTexto="Propuestas" />
      <Deck slides={slides} />
    </>
  );
}
