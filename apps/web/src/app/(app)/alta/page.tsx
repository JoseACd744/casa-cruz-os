import Link from "next/link";
import { Barra, Card, Eyebrow } from "@/components/ui";

const PASOS = [
  { n: "1", label: "Identificación", estado: "Completo", st: "ok" },
  { n: "2", label: "Producto y tipologías", estado: "Completo", st: "ok" },
  { n: "3", label: "Condiciones comerciales", estado: "En captura", st: "now" },
  { n: "4", label: "Multimedia", estado: "Pendiente", st: "todo" },
  { n: "5", label: "Comercial Casa Cruz", estado: "Pendiente", st: "todo" },
  { n: "6", label: "Interna y legal", estado: "Pendiente", st: "todo" },
] as const;

const CAMPOS = [
  { id: "f1", label: "PRECIO DESDE", valor: "$2,555,000", ayuda: "Tercer nivel, 2 habitaciones", falta: false },
  { id: "f2", label: "PRECIO HASTA", valor: "$3,500,000", ayuda: "Planta baja, 3 habitaciones", falta: false },
  { id: "f3", label: "MONEDA", valor: "MXN", ayuda: "Tipo de cambio sujeto a variación", falta: false },
  { id: "f4", label: "ENGANCHE", valor: "10%", ayuda: "A la firma de contrato", falta: false },
  { id: "f5", label: "RESTO", valor: "90% crédito hipotecario", ayuda: "A la escritura", falta: false },
  { id: "f6", label: "MENSUALIDADES", valor: "", ayuda: "Obligatorio para publicar", falta: true },
  { id: "f7", label: "PROMOCIÓN VIGENTE", valor: "", ayuda: "Si no hay, escribe “sin promoción”", falta: true },
  { id: "f8", label: "DESCUENTO POR CONTADO", valor: "", ayuda: "Obligatorio para publicar", falta: true },
  { id: "f9", label: "DISPONIBILIDAD", valor: "", ayuda: "Unidades disponibles por tipología", falta: true },
];

const SECCIONES = [
  { nombre: "Identificación", ok: true, faltan: "completa" },
  { nombre: "Producto y tipologías", ok: true, faltan: "completa" },
  { nombre: "Condiciones comerciales", ok: false, faltan: "4 campos" },
  { nombre: "Multimedia", ok: false, faltan: "sin fotos" },
  { nombre: "Comercial Casa Cruz", ok: false, faltan: "6 campos" },
  { nombre: "Interna y legal", ok: false, faltan: "5 campos" },
];

const REQUISITOS = [
  { texto: "Precio, enganche y disponibilidad capturados", tono: "bg-alert" },
  { texto: "Al menos 6 fotos o renders y un video", tono: "bg-alert" },
  { texto: "Argumentos de venta y objeciones frecuentes", tono: "bg-alert" },
  { texto: "Due diligence validado por corporativo", tono: "bg-warn" },
  { texto: "Convenio comercial firmado y adjunto", tono: "bg-warn" },
];

const FLUJO = [
  { label: "Borrador", quien: "Jorge Díaz", now: true },
  { label: "Revisión", quien: "Gerente de plaza", now: false },
  { label: "Due diligence", quien: "Corporativo", now: false },
  { label: "Aprobado", quien: "Corporativo", now: false },
  { label: "Publicado", quien: "Automático", now: false },
];

export default function AltaPage() {
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
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">
          ALTA DE NUEVO DESARROLLO
        </span>
        <div className="grow" />
        <span className="rounded-[2px] border border-line bg-surface px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-ink-2">
          BORRADOR
        </span>
      </header>

      <div className="flex flex-col gap-5 overflow-auto p-7">
        <Card className="flex flex-col gap-4 px-5.5 py-4.5">
          <Eyebrow>Flujo de alta de un listing</Eyebrow>
          <div className="flex gap-2.5">
            {PASOS.map((p) => (
              <div
                key={p.n}
                className={`flex grow items-center gap-3 rounded-[3px] border p-3.5 ${
                  p.st === "now" ? "border-tan bg-tan-soft" : "border-transparent"
                }`}
              >
                <span
                  className={`flex size-6.5 items-center justify-center rounded-full text-[11px] font-bold ${
                    p.st === "todo" ? "bg-[#EFEAE2] text-muted" : "bg-ink text-white"
                  }`}
                >
                  {p.n}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span
                    className={`text-[12px] ${p.st === "now" ? "font-bold" : "font-semibold"} ${
                      p.st === "todo" ? "text-muted" : ""
                    }`}
                  >
                    {p.label}
                  </span>
                  <span className="text-[10px] text-muted">{p.estado}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex items-stretch gap-5">
          <Card className="flex w-235 shrink-0 flex-col gap-5 p-6">
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-[0.16em] text-tan-deep">
                  PASO 3 DE 6
                </span>
                <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">
                  Condiciones comerciales
                </h1>
              </div>
              <div className="grow" />
              <span className="text-[11.5px] text-muted">Guardado hace 1 minuto</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {CAMPOS.map((c) => (
                <div key={c.id} className="flex flex-col gap-2">
                  <label htmlFor={c.id} className="eyebrow">
                    {c.label}
                  </label>
                  <input
                    id={c.id}
                    defaultValue={c.valor}
                    placeholder="Sin capturar"
                    className={`h-11.5 rounded-[3px] border px-3.5 text-[13.5px] ${
                      c.falta ? "border-alert/60 bg-alert-soft/30" : "border-[#C9C1B6] bg-panel"
                    }`}
                  />
                  <span className="text-[10.5px] text-muted">{c.ayuda}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-line" />

            <div className="flex flex-col gap-2.5">
              <Eyebrow>Forma de pago</Eyebrow>
              <div className="flex gap-2.5">
                {[
                  ["Crédito hipotecario", true],
                  ["Contado con descuento", true],
                  ["Mensualidades sin intereses", false],
                  ["Infonavit / Fovissste", false],
                ].map(([t, on]) => (
                  <span
                    key={String(t)}
                    className={`rounded-full border px-3.5 py-2 text-[12px] font-semibold ${
                      on ? "border-tan bg-tan-soft text-tan-deep" : "border-line bg-surface text-ink-2"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Eyebrow>Fuente de esta información</Eyebrow>
              <div className="flex items-center gap-3.5 rounded-[3px] border border-line p-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.7">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
                </svg>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-bold">
                    Lista de precios oficial del desarrollador
                  </span>
                  <span className="text-[11.5px] text-muted">
                    lista-precios-playa-park-sep-2026.pdf · adjuntado por Jorge Díaz
                  </span>
                </div>
                <div className="grow" />
                <button className="h-9.5 rounded-[3px] border border-line bg-surface px-4 text-[10.5px] font-bold tracking-[0.06em]">
                  CAMBIAR EVIDENCIA
                </button>
              </div>
            </div>

            <div className="grow" />

            <div className="flex items-center gap-3">
              <button className="h-12 rounded-[3px] border border-[#C9C1B6] px-5 text-[11px] font-bold tracking-[0.08em]">
                ANTERIOR
              </button>
              <div className="grow" />
              <button className="h-12 rounded-[3px] border border-[#C9C1B6] px-5 text-[11px] font-bold tracking-[0.08em]">
                GUARDAR BORRADOR
              </button>
              <button className="flex h-12 items-center gap-2.5 rounded-[3px] bg-ink px-6 text-[11px] font-bold tracking-[0.1em] text-white hover:brightness-125">
                SIGUIENTE: MULTIMEDIA
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </Card>

          <div className="flex grow flex-col gap-5">
            <Card className="flex flex-col gap-3.5 p-5.5">
              <div className="flex items-baseline">
                <Eyebrow>Completitud</Eyebrow>
                <div className="grow" />
                <span className="text-[24px] font-extrabold">58%</span>
              </div>
              <Barra valor={58} tono="warn" />
              {SECCIONES.map((s) => (
                <div key={s.nombre} className="flex items-center gap-2.5">
                  <span
                    className={`flex size-4.5 shrink-0 items-center justify-center rounded-[3px] border ${
                      s.ok ? "border-ok bg-ok" : "border-[#C9C1B6] bg-panel"
                    }`}
                  >
                    {s.ok ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6">
                        <path d="M4 12.5l5.5 5.5L20 7" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="grow text-[12px]">{s.nombre}</span>
                  <span className="text-[11px] text-muted">{s.faltan}</span>
                </div>
              ))}
            </Card>

            <Card className="flex flex-col gap-3 p-5.5">
              <Eyebrow>Para poder publicar</Eyebrow>
              {REQUISITOS.map((r) => (
                <div key={r.texto} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 size-1.75 shrink-0 rounded-full ${r.tono}`} />
                  <span className="text-[12px] leading-snug">{r.texto}</span>
                </div>
              ))}
            </Card>

            <div className="flex grow flex-col gap-3.5 rounded-card bg-ink p-5.5">
              <span className="text-[10px] font-bold tracking-[0.16em] text-tan">
                FLUJO PENDIENTE
              </span>
              {FLUJO.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className={`size-2.5 rounded-full ${f.now ? "bg-tan" : "bg-[#4A463F]"}`} />
                  <span
                    className={`text-[12.5px] ${f.now ? "font-bold text-white" : "text-[#B8B1A7]"}`}
                  >
                    {f.label}
                  </span>
                  <div className="grow" />
                  <span className="text-[10.5px] text-[#A09991]">{f.quien}</span>
                </div>
              ))}
              <div className="grow" />
              <span className="text-[11px] leading-relaxed text-[#B8B1A7]">
                Al publicar, el desarrollo aparece automáticamente en el portal, en los filtros y
                queda disponible para fichas y propuestas.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
