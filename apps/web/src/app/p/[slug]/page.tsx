import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonInteres, RegistroVista } from "@/components/Micrositio";
import { Foto } from "@/components/ui";
import { galeria, iniciales, mesAnio, money } from "@casacruz/core";
import { obtenerPropuestaPublica } from "@/lib/repo";
import { tokenDeSesion } from "@/lib/sesion";
import type { Desarrollo, PropuestaItem } from "@casacruz/core";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const publica = await obtenerPropuestaPublica(slug);
  const nombre = publica?.cliente?.nombre.split(" y ")[0] ?? "ti";
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

/** "Playa del Carmen", "Playa del Carmen y Puebla", "A, B y C". */
function enumerar(lista: string[]): string {
  if (lista.length <= 1) return lista[0] ?? "";
  return `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
}

interface ItemResuelto {
  item: PropuestaItem;
  desarrollo: Desarrollo;
  tipologiaNombre: string | null;
  recamaras: number | null;
  banos: number | null;
  m2: number | null;
}

function Bloque({
  resuelto,
  orden,
  slug,
  esEquipo,
}: {
  resuelto: ItemResuelto;
  orden: number;
  slug: string;
  esEquipo: boolean;
}) {
  const { desarrollo: d, item } = resuelto;
  const fotos = galeria(d);
  return (
    <section className="flex flex-col gap-5 border-t border-line-strong px-6 py-8 md:px-16 md:py-11">
      <div className="flex items-end gap-3.5">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold tracking-[0.22em] text-tan-deep">
            OPCIÓN {orden}
          </span>
          <h2 className="text-[26px] font-extrabold tracking-[-0.01em] md:text-[34px]">{d.nombre}</h2>
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

      <Foto src={fotos.principal} label="Render / video" className="h-44 w-full md:h-60" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Foto key={i} src={fotos.secundarias[i]} className="h-23 w-full" />
        ))}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-col gap-3 rounded-[3px] border border-line bg-panel p-4.5 md:w-107 md:shrink-0">
          <div className="flex flex-wrap gap-5 md:gap-6.5">
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
          <BotonInteres
            slug={slug}
            accion="conocer"
            desarrolloId={d.id}
            esEquipo={esEquipo}
            className="flex h-11.5 w-full items-center justify-center rounded-[3px] bg-ink text-[11.5px] font-bold tracking-[0.1em] text-white"
          >
            QUIERO CONOCER ESTA PROPIEDAD
          </BotonInteres>
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
  const publica = await obtenerPropuestaPublica(slug);
  if (!publica) notFound();
  const { propuesta, cliente, asesor } = publica;
  // Si quien mira tiene sesión del equipo, no se cuenta como vista del cliente.
  const esEquipo = Boolean(await tokenDeSesion());

  const resueltos: ItemResuelto[] = [];
  for (const item of propuesta.items) {
    const d = publica.desarrollos.find((x) => x.id === item.desarrolloId);
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
  const ciudades = enumerar([...new Set(resueltos.map((r) => r.desarrollo.ciudad))]);

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
      <RegistroVista slug={propuesta.slug} esEquipo={esEquipo} />
      <header className="flex flex-col bg-ink px-6 py-10 text-white md:px-16 md:py-13">
        <div className="flex items-center gap-3">
          <span className="flex size-9.5 items-center justify-center border-[1.5px] border-ground text-[12px] font-bold">
            CC
          </span>
          <span className="text-[12px] font-bold tracking-[0.28em]">CASA CRUZ</span>
        </div>
        <span className="pt-11 text-[11px] font-bold tracking-[0.24em] text-tan">
          PROPUESTA PERSONALIZADA · {mesAnio(new Date(propuesta.creadaIso)).toUpperCase()}
        </span>
        <h1 className="pt-3.5 text-[34px] leading-none font-extrabold tracking-[-0.02em] whitespace-pre-line md:text-[52px]">
          Hola {nombreCorto.split(" ").slice(0, 1)[0]}
          {cliente?.nombre.includes(" y ") ? `\ny ${cliente.nombre.split(" y ")[1].split(" ")[0]}` : ""}
        </h1>
        <p className="max-w-155 pt-4.5 text-[16px] leading-relaxed text-[#D4CEC6]">
          Con base en lo que nos compartieron
          {cliente?.recamaras ? ` —${cliente.recamaras} habitaciones en ${ciudades}—` : ""},
          seleccionamos {resueltos.length}{" "}
          {resueltos.length === 1 ? "desarrollo que cumple" : "desarrollos que cumplen"} lo que buscan.
        </p>
        {asesor ? (
          <div className="flex items-center gap-3 pt-6.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-tan text-[12px] font-bold text-ink">
              {iniciales(asesor.nombre)}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold">{asesor.nombre}</span>
              <span className="text-[11px] text-[#A09991]">
                Su asesor certificado{asesor.plazas.length ? ` · ${asesor.plazas.join(" · ")}` : ""}
              </span>
            </span>
          </div>
        ) : null}
      </header>

      <section className="flex flex-col gap-5.5 bg-surface px-6 py-8 md:px-16 md:py-11">
        <span className="text-[11px] font-bold tracking-[0.22em] text-tan-deep">
          POR QUÉ CASA CRUZ
        </span>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
        <Bloque key={r.desarrollo.id} resuelto={r} orden={i + 1} slug={propuesta.slug} esEquipo={esEquipo} />
      ))}

      <section
        id="comparativo"
        className="flex flex-col gap-5 border-t border-line-strong bg-surface px-6 py-8 md:px-16 md:py-11"
      >
        <h2 className="text-[26px] font-extrabold tracking-[-0.01em]">
          Comparativo de las opciones
        </h2>
        <div className="overflow-x-auto rounded-[3px] border border-line bg-panel">
          <div className="flex min-w-160 bg-tan">
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
            <div key={f.campo} className="flex min-w-160 border-b border-line last:border-0">
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

      <section className="flex flex-col items-start gap-6 px-6 py-8 md:flex-row md:items-center md:px-16 md:py-11">
        <Foto label="Mapa de ubicaciones" className="h-44 w-full md:h-50 md:w-107 md:shrink-0" />
        <div className="flex grow flex-col gap-3.5">
          <h2 className="text-[24px] font-extrabold tracking-[-0.01em]">¿Seguimos?</h2>
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            Podemos agendar una videollamada para revisar juntos las opciones, o coordinar una
            visita cuando vengan a México.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <BotonInteres
              slug={propuesta.slug}
              accion="videollamada"
              esEquipo={esEquipo}
              className="flex h-12.5 items-center rounded-[3px] bg-ink px-6.5 text-[11.5px] font-bold tracking-[0.1em] text-white"
            >
              AGENDAR VIDEOLLAMADA
            </BotonInteres>
            <BotonInteres
              slug={propuesta.slug}
              accion="asesor"
              esEquipo={esEquipo}
              className="flex h-12.5 items-center rounded-[3px] border border-ink px-6.5 text-[11.5px] font-bold tracking-[0.1em]"
            >
              HABLAR CON MI ASESOR
            </BotonInteres>
          </div>
        </div>
      </section>

      <footer className="flex items-center gap-4 bg-ink px-6 py-6.5 text-[#A09991] md:px-16">
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
