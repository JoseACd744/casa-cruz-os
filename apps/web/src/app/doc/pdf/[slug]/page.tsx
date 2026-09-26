import { notFound } from "next/navigation";
import { BarraDoc } from "@/components/BarraDoc";
import { Foto } from "@/components/ui";
import { etiquetaRol, galeria, money } from "@casacruz/core";
import { usandoApi } from "@/lib/api";
import { obtenerPropuestaPublica } from "@/lib/repo";
import type { Desarrollo, PropuestaItem } from "@casacruz/core";

interface Resuelto {
  item: PropuestaItem;
  d: Desarrollo;
  rec: number | null;
  banos: number | null;
  m2: number | null;
}

export default async function PdfComparativoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publica = await obtenerPropuestaPublica(slug);
  if (!publica) notFound();
  const { propuesta, cliente, asesor } = publica;

  const resueltos: Resuelto[] = [];
  for (const item of propuesta.items) {
    const d = publica.desarrollos.find((x) => x.id === item.desarrolloId);
    if (!d) continue;
    const t = d.tipologias.find((x) => x.id === item.tipologiaId);
    resueltos.push({
      item,
      d,
      rec: t?.recamaras ?? null,
      banos: t?.banos ?? null,
      m2: t?.m2Construccion ?? null,
    });
  }

  const filas: { campo: string; valores: string[] }[] = [
    {
      campo: "PRECIO DESDE",
      valores: resueltos.map((r) =>
        r.item.precioCongelado === null ? "Consultar" : money(r.item.precioCongelado),
      ),
    },
    { campo: "RECÁMARAS", valores: resueltos.map((r) => String(r.rec ?? "—")) },
    { campo: "BAÑOS", valores: resueltos.map((r) => String(r.banos ?? "—")) },
    { campo: "SUPERFICIE", valores: resueltos.map((r) => (r.m2 ? `${r.m2} m²` : "—")) },
    {
      campo: "PRECIO POR M²",
      valores: resueltos.map((r) =>
        r.item.precioCongelado && r.m2 ? money(Math.round(r.item.precioCongelado / r.m2)) : "—",
      ),
    },
    { campo: "ENTREGA", valores: resueltos.map((r) => r.d.entrega ?? "Por confirmar") },
    {
      campo: "ENGANCHE",
      valores: resueltos.map((r) =>
        r.d.condiciones.enganchePct === null ? "Por confirmar" : `${r.d.condiciones.enganchePct}%`,
      ),
    },
    { campo: "UBICACIÓN", valores: resueltos.map((r) => r.d.ciudad) },
    {
      campo: "A CONSIDERAR",
      valores: resueltos.map((r) => r.d.aConsiderar.join(" · ") || "—"),
    },
  ];

  return (
    <>
      <BarraDoc
        titulo="PDF comparativo"
        volverHref="/propuestas"
        volverTexto="Propuestas"
        pdfUrl={usandoApi ? `/descargas/analisis/${propuesta.slug}` : null}
      />

      <div className="flex grow items-start justify-center overflow-auto p-8 print:p-0">
        <div className="doc-fit flex h-264 w-204 shrink-0 flex-col bg-white px-12 py-11.5 shadow-2xl print:shadow-none">
          <div className="flex items-start gap-3.5 border-b-2 border-ink pb-5">
            <span className="flex size-9.5 shrink-0 items-center justify-center border-[1.4px] border-ink text-[12px] font-bold">
              CC
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-[0.26em]">CASA CRUZ</span>
              <span className="text-[16px] font-extrabold tracking-[-0.01em]">
                Propuesta comparativa
              </span>
            </div>
            <div className="grow" />
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold tracking-[0.14em] text-muted">
                PREPARADA PARA
              </span>
              <span className="text-[13px] font-bold">{cliente?.nombre ?? "[CLIENTE]"}</span>
              <span className="text-[10.5px] text-muted">
                {propuesta.creadaEl}
                {asesor ? ` · ${asesor.nombre}` : ""}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-5.5">
            {resueltos.map((r, i) => (
              <div key={r.d.id} className="flex grow flex-col gap-2.5">
                <Foto src={galeria(r.d).principal} className="h-26 w-full rounded-[2px]" />
                <span className="text-[9.5px] font-bold tracking-[0.14em] text-tan-deep">
                  OPCIÓN {i + 1}
                </span>
                <span className="text-[17px] font-extrabold tracking-[-0.01em]">{r.d.nombre}</span>
                <span className="text-[10px] font-semibold tracking-[0.06em] text-muted uppercase">
                  {r.d.ciudad}
                </span>
                <span
                  className={`text-[16px] font-extrabold tracking-[-0.01em] ${
                    r.item.precioCongelado === null ? "text-alert" : ""
                  }`}
                >
                  {r.item.precioCongelado === null
                    ? "Consultar"
                    : money(r.item.precioCongelado)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col pt-6">
            <div className="flex bg-tan">
              <span className="w-39 px-3 py-2.5 text-[9px] font-bold tracking-[0.12em] text-ink">
                CRITERIO
              </span>
              {resueltos.map((r) => (
                <span
                  key={r.d.id}
                  className="grow px-3 py-2.5 text-[9px] font-bold tracking-[0.12em] text-ink uppercase"
                >
                  {r.d.nombre}
                </span>
              ))}
            </div>
            {filas.map((f, i) => (
              <div
                key={f.campo}
                className={`flex border-b border-line ${i % 2 ? "bg-[#FAF8F5]" : ""}`}
              >
                <span className="w-39 px-3 py-2.5 text-[9.5px] font-bold tracking-[0.06em] text-muted">
                  {f.campo}
                </span>
                {f.valores.map((v, j) => (
                  <span
                    key={j}
                    className={`grow px-3 py-2.5 text-[11px] font-semibold ${
                      v === "Consultar" || v === "Por confirmar" ? "text-alert" : ""
                    }`}
                  >
                    {v}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-3.5 pt-6">
            {resueltos.map((r) => (
              <div
                key={r.d.id}
                className={`flex grow flex-col gap-2 rounded-[3px] border p-3.5 ${
                  r.d.condiciones.enganchePct === null ? "border-dashed border-[#C9C1B6]" : "border-line"
                }`}
              >
                <span
                  className={`text-[9.5px] font-bold tracking-[0.14em] uppercase ${
                    r.d.condiciones.enganchePct === null ? "text-alert" : "text-tan-deep"
                  }`}
                >
                  Esquema {r.d.nombre}
                </span>
                <span className="text-[12px] font-bold">
                  {r.d.condiciones.enganchePct === null
                    ? "[POR CONFIRMAR]"
                    : `${r.d.condiciones.enganchePct}% a la firma · ${r.d.condiciones.restoPct}% crédito`}
                </span>
                <span className="text-[10.5px] text-ink-2">
                  {r.item.precioCongelado && r.d.condiciones.enganchePct
                    ? `Enganche estimado: ${money(
                        (r.item.precioCongelado * r.d.condiciones.enganchePct) / 100,
                      )} MXN`
                    : "Se confirma con el asesor"}
                </span>
              </div>
            ))}
          </div>

          <div className="grow" />

          <div className="flex items-center gap-4.5 rounded-[3px] bg-ink px-5.5 py-5">
            <div className="flex flex-col gap-2">
              <span className="text-[9.5px] font-bold tracking-[0.18em] text-tan">
                SIGUIENTE PASO
              </span>
              <span className="text-[15px] font-bold text-white">
                Agendemos una videollamada para revisar las opciones
              </span>
              <span className="text-[11px] text-[#B8B1A7]">
                {asesor
                  ? [
                      asesor.nombre,
                      `${etiquetaRol.cerrador}${asesor.plazas.length ? ` ${asesor.plazas.join(" · ")}` : ""}`,
                      asesor.telefono ?? "[TELÉFONO]",
                      asesor.correo,
                    ].join(" · ")
                  : "[ASESOR]"}
              </span>
            </div>
            <div className="grow" />
            <span className="flex size-18 items-center justify-center rounded-[2px] bg-white text-[8px] font-bold tracking-[0.1em] text-muted">
              QR
            </span>
          </div>

          <p className="pt-3.5 text-[7.4px] leading-relaxed tracking-[0.03em] text-muted uppercase">
            Imágenes únicamente ilustrativas, la propiedad puede no incluir lo mostrado en ellas. Los
            precios e imágenes aquí mostradas pueden cambiar sin previo aviso y están sujetos a
            disponibilidad. El tipo de cambio puede variar según la compra de divisas. Documento
            generado automáticamente por Casa Cruz OS; los precios quedaron congelados el{" "}
            {propuesta.creadaEl}.
          </p>
        </div>
      </div>
    </>
  );
}
