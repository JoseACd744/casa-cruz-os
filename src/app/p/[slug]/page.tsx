import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Foto } from "@/components/ui";
import { money } from "@/lib/format";
import { obtenerCliente, obtenerDesarrollo, obtenerPropuesta } from "@/lib/repo";
import type { Desarrollo, PropuestaItem } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const propuesta = await obtenerPropuesta(slug);
  const cliente = propuesta ? await obtenerCliente(propuesta.clienteId) : undefined;
  const nombre = cliente?.nombre.split(" y ")[0] ?? "ti";
  return {
    title: `Propuesta Casa Cruz para ${nombre}`,
    description:
      "Seleccionamos estas propiedades con base en lo que nos compartiste. Precios, esquema de pago y comparativo en un solo lugar.",
    openGraph: {
      title: `Propuesta Casa Cruz para ${nombre}`,
      description: "Las opciones que seleccionamos para ustedes, con precios y esquema de pago.",
      type: "website",
    },
  };
}

interface ItemResuelto {
  item: PropuestaItem;
  desarrollo: Desarrollo;
  tipologiaNombre: string | null;
  recamaras: number | null;
  banos: number | null;
  m2: number | null;
}

function Bloque({ resuelto, orden }: { resuelto: ItemResuelto; orden: number }) {
  const { desarrollo: d, item } = resuelto;
  return (
    <section className="flex flex-col gap-5 border-t border-line-strong px-16 py-11">
      <div className="flex items-end gap-3.5">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold tracking-[0.22em] text-tan-deep">
            OPCIÓN {orden}
          </span>
          <h2 className="text-[34px] font-extrabold tracking-[-0.01em]">{d.nombre}</h2>
          <span className="text-[12px] font-semibold tracking-[0.1em] text-ink-2 uppercase">
            {d.ciudad} · {d.tipo}s
          </span>
        </div>
        <div className="grow" />
        <div className="flex flex-col items-end gap-1">
          <span className="eyebrow">Desde</span>
          <span
            className={`text-[30px] font-extrabold tracking-[-0.02em] ${
              item.precioCongelado === null ? "text-alert" : ""
            }`}
          >
            {item.precioCongelado === null ? "Consultar" : money(item.precioCongelado)}
          </span>
        </div>
      </div>

      <Foto label="Render / video" className="h-60" />
      <div className="grid grid-cols-3 gap-3">
        <Foto className="h-23" />
        <Foto className="h-23" />
        <Foto className="h-23" />
      </div>

      <div className="flex gap-6">
        <div className="flex w-107 shrink-0 flex-col gap-3 rounded-[3px] border border-line bg-panel p-4.5">
          <div className="flex gap-6.5">
            {[
              ["RECÁMARAS", resuelto.recamaras ?? "—"],
              ["BAÑOS", resuelto.banos ?? "—"],
              ["SUPERFICIE", resuelto.m2 ? `${resuelto.m2} m²` : "—"],
              ["ENTREGA", d.entrega ?? "Por confirmar"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-[0.12em] text-muted">{k}</span>
                <span className="text-[15px] font-bold">{v}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-line" />
          <div className="flex items-center gap-2.5">
            <span className="rounded-[2px] bg-tan-soft px-2.5 py-1.5 text-[10px] font-bold tracking-[0.14em]">
              {d.condiciones.enganchePct === null
                ? "ESQUEMA POR CONFIRMAR"
                : `${d.condiciones.enganchePct}% DE ENGANCHE`}
            </span>
            <span className="text-[12.5px] text-ink-2">
              {d.condiciones.restoPct === null
                ? ""
                : `${d.condiciones.restoPct}% ${d.condiciones.restoNota ?? ""}`}
            </span>
          </div>
          {d.aConsiderar.length ? (
            <span className="text-[12px] text-ink-2">A considerar: {d.aConsiderar.join(" · ")}</span>
          ) : null}
        </div>

        <div className="flex grow flex-col gap-2">
          <span className="text-[11px] font-bold tracking-[0.16em] text-tan-deep">
            POR QUÉ LA SELECCIONAMOS
          </span>
          <p className="text-[13.5px] leading-relaxed">
            {item.razon ?? "Tu asesor te comparte el detalle de esta opción en la llamada."}
          </p>
          <div className="grow" />
          <a
            href="#comparativo"
            className="flex h-11.5 items-center justify-center rounded-[3px] bg-ink text-[11.5px] font-bold tracking-[0.1em] text-white"
          >
            QUIERO CONOCER ESTA PROPIEDAD
          </a>
        </div>
      </div>
    </section>
  );
}

export default async function PropuestaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const propuesta = await obtenerPropuesta(slug);
  if (!propuesta) notFound();
  const cliente = await obtenerCliente(propuesta.clienteId);

  const resueltos: ItemResuelto[] = [];
  for (const item of propuesta.items) {
    const d = await obtenerDesarrollo(item.desarrolloId);
    if (!d) continue;
    const t = d.tipologias.find((x) => x.id === item.tipologiaId);
    resueltos.push({
      item,
      desarrollo: d,
      tipologiaNombre: t?.nombre ?? null,
      recamaras: t?.recamaras ?? null,
      banos: t?.banos ?? null,
      m2: t?.m2Construccion ?? null,
    });
  }

  const nombreCorto = (cliente?.nombre ?? "").replace(" y ", " y\n");

  const filas: { campo: string; valores: string[] }[] = [
    {
      campo: "PRECIO DESDE",
      valores: resueltos.map((r) =>
        r.item.precioCongelado === null ? "Consultar" : money(r.item.precioCongelado),
      ),
    },
    { campo: "RECÁMARAS", valores: resueltos.map((r) => String(r.recamaras ?? "—")) },
    { campo: "BAÑOS", valores: resueltos.map((r) => String(r.banos ?? "—")) },
    { campo: "SUPERFICIE", valores: resueltos.map((r) => (r.m2 ? `${r.m2} m²` : "—")) },
    {
      campo: "ENTREGA",
      valores: resueltos.map((r) => r.desarrollo.entrega ?? "Por confirmar"),
    },
    {
      campo: "ENGANCHE",
      valores: resueltos.map((r) =>
        r.desarrollo.condiciones.enganchePct === null
          ? "Por confirmar"
          : `${r.desarrollo.condiciones.enganchePct}%`,
      ),
    },
    {
      campo: "A CONSIDERAR",
      valores: resueltos.map((r) => r.desarrollo.aConsiderar.join(" · ") || "—"),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-250 bg-ground">
      <header className="flex flex-col bg-ink px-16 py-13 text-white">
        <div className="flex items-center gap-3">
          <span className="flex size-9.5 items-center justify-center border-[1.5px] border-ground text-[12px] font-bold">
            CC
          </span>
          <span className="text-[12px] font-bold tracking-[0.28em]">CASA CRUZ</span>
        </div>
        <span className="pt-11 text-[11px] font-bold tracking-[0.24em] text-tan">
          PROPUESTA PERSONALIZADA · SEPTIEMBRE 2026
        </span>
        <h1 className="pt-3.5 text-[52px] leading-none font-extrabold tracking-[-0.02em] whitespace-pre-line">
          Hola {nombreCorto.split(" ").slice(0, 1)[0]}
          {cliente?.nombre.includes(" y ") ? `\ny ${cliente.nombre.split(" y ")[1].split(" ")[0]}` : ""}
        </h1>
        <p className="max-w-155 pt-4.5 text-[16px] leading-relaxed text-[#D4CEC6]">
          Con base en lo que nos compartieron —{cliente?.recamaras ?? ""} habitaciones en{" "}
          {cliente?.plazasInteres.length ? "Playa del Carmen" : "México"}, con crédito hipotecario—
          seleccionamos {resueltos.length} desarrollos que cumplen lo que buscan.
        </p>
        <div className="flex items-center gap-3 pt-6.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-tan text-[12px] font-bold text-ink">
            JD
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold">Jorge Díaz</span>
            <span className="text-[11px] text-[#A09991]">Su asesor certificado · Riviera Maya</span>
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-5.5 bg-surface px-16 py-11">
        <span className="text-[11px] font-bold tracking-[0.22em] text-tan-deep">
          POR QUÉ CASA CRUZ
        </span>
        <div className="grid grid-cols-3 gap-5">
          {[
            [
              "Due diligence",
              "Revisamos jurídicamente cada desarrollo antes de presentarlo. Si no pasa, no se los mostramos.",
            ],
            [
              "Acompañamiento desde EE. UU.",
              "Coordinamos visitas, notaría y crédito para quienes están fuera de México.",
            ],
            [
              "Inventario curado",
              "Precios y disponibilidad verificados con el desarrollador esta semana.",
            ],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-col gap-2">
              <span className="text-[15px] font-bold">{t}</span>
              <span className="text-[12.5px] leading-relaxed text-ink-2">{d}</span>
            </div>
          ))}
        </div>
      </section>

      {resueltos.map((r, i) => (
        <Bloque key={r.desarrollo.id} resuelto={r} orden={i + 1} />
      ))}

      <section
        id="comparativo"
        className="flex flex-col gap-5 border-t border-line-strong bg-surface px-16 py-11"
      >
        <h2 className="text-[26px] font-extrabold tracking-[-0.01em]">
          Comparativo de las opciones
        </h2>
        <div className="overflow-hidden rounded-[3px] border border-line bg-panel">
          <div className="flex bg-tan">
            <span className="w-45 px-4 py-3" />
            {resueltos.map((r) => (
              <span
                key={r.desarrollo.id}
                className="grow px-4 py-3 text-[11px] font-bold tracking-[0.12em] text-ink uppercase"
              >
                {r.desarrollo.nombre}
              </span>
            ))}
          </div>
          {filas.map((f) => (
            <div key={f.campo} className="flex border-b border-line last:border-0">
              <span className="w-45 px-4 py-3.5 text-[11.5px] font-bold tracking-[0.06em] text-muted">
                {f.campo}
              </span>
              {f.valores.map((v, i) => (
                <span
                  key={i}
                  className={`grow px-4 py-3.5 text-[13px] font-semibold ${
                    v === "Consultar" || v === "Por confirmar" ? "text-alert" : ""
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center gap-6 px-16 py-11">
        <Foto label="Mapa de ubicaciones" className="h-50 w-107 shrink-0" />
        <div className="flex grow flex-col gap-3.5">
          <h2 className="text-[24px] font-extrabold tracking-[-0.01em]">¿Seguimos?</h2>
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            Podemos agendar una videollamada para revisar juntos las opciones, o coordinar una
            visita cuando vengan a México.
          </p>
          <div className="flex gap-3">
            <a
              href="#comparativo"
              className="flex h-12.5 items-center rounded-[3px] bg-ink px-6.5 text-[11.5px] font-bold tracking-[0.1em] text-white"
            >
              AGENDAR VIDEOLLAMADA
            </a>
            <a
              href="#comparativo"
              className="flex h-12.5 items-center rounded-[3px] border border-ink px-6.5 text-[11.5px] font-bold tracking-[0.1em]"
            >
              HABLAR CON MI ASESOR
            </a>
          </div>
        </div>
      </section>

      <footer className="flex items-center gap-4 bg-ink px-16 py-6.5 text-[#A09991]">
        <span className="flex size-8 shrink-0 items-center justify-center border border-[#A09991] text-[10px] font-bold">
          CC
        </span>
        <span className="max-w-165 text-[10px] leading-relaxed">
          Imágenes únicamente ilustrativas. Los precios pueden cambiar sin previo aviso y están
          sujetos a disponibilidad. Propuesta generada por Casa Cruz OS el {propuesta.creadaEl}.
        </span>
      </footer>
    </main>
  );
}
