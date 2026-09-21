import { notFound } from "next/navigation";
import { BarraDoc } from "@/components/BarraDoc";
import { Falta, Foto } from "@/components/ui";
import { estadoValidaciones } from "@casacruz/core";
import { hace, money } from "@casacruz/core";
import { obtenerDesarrollo } from "@/lib/repo";

export default async function FichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const d = await obtenerDesarrollo(id);
  if (!d) notFound();

  const tipologia = d.tipologias.find((x) => x.id === t) ?? d.tipologias[0];
  const precios = tipologia
    ? tipologia.niveles.map((n) => n.precioVenta).filter((p): p is number => p !== null)
    : [];
  const desde = precios.length ? Math.min(...precios) : null;
  const enganche =
    desde !== null && d.condiciones.enganchePct !== null
      ? (desde * d.condiciones.enganchePct) / 100
      : null;

  const precioValidado = estadoValidaciones(d).find((e) => e.campo === "precio");

  return (
    <>
      <BarraDoc
        titulo={`Ficha · ${d.nombre}`}
        volverHref={`/propiedades/${d.id}`}
        volverTexto={d.nombre}
      />

      <div className="flex grow items-start justify-center overflow-auto p-8 print:p-0">
        <div className="doc-fit flex h-180 w-320 shrink-0 gap-9 bg-[#F7F5F1] px-11 py-10 shadow-2xl print:shadow-none">
          <div className="flex w-130 shrink-0 flex-col gap-3">
            <Foto label="Fachada" className="h-89 rounded-[2px]" />
            <div className="flex grow gap-3">
              <Foto label="Amenidad" className="grow rounded-[2px]" />
              <Foto label="Interiores" className="grow rounded-[2px]" />
            </div>
          </div>

          <div className="flex grow flex-col">
            <h1 className="text-[40px] leading-none font-extrabold tracking-[0.02em] uppercase">
              {tipologia ? `${tipologia.recamaras ?? "?"} habitaciones` : "[TIPOLOGÍA]"}
            </h1>
            <div className="pt-2 text-[15px] font-bold tracking-[0.04em] uppercase">
              Preventa · entrega {d.entrega ?? "[POR CONFIRMAR]"}
            </div>

            <div className="flex items-center gap-2.5 pt-4">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A98D6F" strokeWidth="1.7">
                <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <span className="text-[16px] font-medium tracking-[0.08em] text-[#3A352F] uppercase">
                {d.ciudad} / {d.nombre}
              </span>
            </div>

            <div className="flex items-center gap-6.5 pt-5">
              <span className="w-32 text-[14px] leading-snug font-medium tracking-[0.06em] uppercase">
                {tipologia?.nombre ?? "[MODELO]"}
              </span>
              <div className="flex items-center gap-2">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1C1B19" strokeWidth="1.5">
                  <path d="M3 18v-5h18v5M3 13V8M21 13v-1a3 3 0 0 0-3-3h-6v4M6.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3 18v2M21 18v2" />
                </svg>
                <span className="text-[20px] font-semibold">{tipologia?.recamaras ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1C1B19" strokeWidth="1.5">
                  <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" />
                </svg>
                <span className="text-[20px] font-semibold">{tipologia?.banos ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1C1B19" strokeWidth="1.5">
                  <path d="M4 4h16v16H4zM4 9V4h5M20 15v5h-5" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-[17px] font-semibold tracking-[0.02em]">
                    {tipologia?.m2Construccion ? `${tipologia.m2Construccion} m²` : "[ m² ]"}
                  </span>
                  <span className="text-[10.5px] font-medium tracking-[0.1em] text-ink-2 uppercase">
                    Construcción
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col pt-5.5">
              {[
                ["Precio de lista", desde === null ? null : money(desde)],
                ["Precio de venta", desde === null ? null : money(desde)],
                [
                  `Enganche (${d.condiciones.enganchePct ?? "?"}%)`,
                  enganche === null ? null : money(enganche),
                ],
                ["Equipamiento", null],
              ].map(([etiqueta, valor], i) => (
                <div key={i} className="flex">
                  <span className="w-85 border-r-2 border-[#F7F5F1] bg-tan px-4.5 py-3.5 text-[14px] font-bold uppercase">
                    {etiqueta}
                  </span>
                  <span
                    className={`grow border border-ink px-4.5 py-3.5 text-center text-[15px] font-semibold ${
                      i < 3 ? "border-b-0" : ""
                    } ${valor === null ? "text-alert" : ""}`}
                  >
                    {valor ?? "[POR CAPTURAR]"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-10 pt-5.5">
              <div className="flex flex-col gap-2.5">
                <span className="text-[15px] font-bold tracking-[0.04em] uppercase">Destacables</span>
                {d.amenidades.length ? (
                  d.amenidades.map((a) => (
                    <span key={a} className="text-[12.5px] font-medium tracking-[0.08em] uppercase">
                      · {a}
                    </span>
                  ))
                ) : (
                  <Falta>[AMENIDADES POR CAPTURAR]</Falta>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[15px] font-bold tracking-[0.04em] uppercase">Esquema</span>
                <span className="text-[12.5px] font-medium tracking-[0.08em] uppercase">
                  · {d.condiciones.enganchePct ?? "?"}% {d.condiciones.engancheNota ?? ""}
                </span>
                <span className="text-[12.5px] font-medium tracking-[0.08em] uppercase">
                  · {d.condiciones.restoPct ?? "?"}% {d.condiciones.restoNota ?? ""}
                </span>
                {d.aConsiderar.map((a) => (
                  <span key={a} className="text-[12.5px] font-medium tracking-[0.08em] uppercase">
                    · {a}
                  </span>
                ))}
              </div>
            </div>

            <div className="grow" />

            <div className="flex items-end gap-4">
              <span className="flex h-11 w-44 items-center justify-center rounded-[2px] bg-tan text-[13px] font-bold tracking-[0.1em] text-ink">
                BROCHURE
              </span>
              <span className="flex h-11 w-44 items-center justify-center rounded-[2px] bg-tan text-[13px] font-bold tracking-[0.1em] text-ink">
                VIDEO
              </span>
              <div className="grow" />
              <span className="flex size-11.5 items-center justify-center border-[1.5px] border-ink text-[13px] font-bold">
                CC
              </span>
            </div>

            <p className="pt-3.5 text-[7.6px] leading-relaxed font-medium tracking-[0.04em] text-muted uppercase">
              Imágenes únicamente ilustrativas, la propiedad puede no incluir lo mostrado en ellas.
              Los precios e imágenes aquí mostradas pueden cambiar sin previo aviso y están sujetos a
              disponibilidad. El tipo de cambio puede variar según la compra de divisas. Ficha
              generada por Casa Cruz OS · precio validado{" "}
              {precioValidado?.haceDias !== null && precioValidado?.haceDias !== undefined
                ? hace(precioValidado.haceDias)
                : "sin validar"}
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
