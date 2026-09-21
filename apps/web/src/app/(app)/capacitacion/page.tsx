import Link from "next/link";
import { Badge, Barra, Card, Seccion } from "@/components/ui";
import { listarPlazas, obtenerUsuarioActual } from "@/lib/repo";

const MODULOS = [
  { n: "1", titulo: "El mercado de Puebla", tipo: "Video · 18 min", ok: true },
  { n: "2", titulo: "Desarrolladores y convenios de la plaza", tipo: "Documento · 12 páginas", ok: true },
  { n: "3", titulo: "Producto: Cascatta, Parque Toscana y Lomas", tipo: "Video · 26 min", ok: true },
  { n: "4", titulo: "Objeciones frecuentes en Puebla", tipo: "Documento + casos", ok: false },
  { n: "5", titulo: "Evaluación de certificación", tipo: "Examen · 20 preguntas", ok: false },
];

const CHECKLIST = [
  { texto: "Ver el video del desarrollo", ok: true },
  { texto: "Leer objeciones frecuentes y qué cliente no debería comprarlo", ok: true },
  { texto: "Conocer el esquema 10 / 90 y la fecha de entrega", ok: true },
  { texto: "Visitar el showroom o hacer recorrido virtual", ok: false },
];

const BIBLIOTECA = [
  { titulo: "Guion de primera llamada", meta: "Metodología" },
  { titulo: "Cómo explicar el due diligence de Casa Cruz", meta: "Argumentos" },
  { titulo: "Clientes que viven en Estados Unidos", meta: "Casos" },
  { titulo: "Comparables por plaza", meta: "Producto" },
  { titulo: "Certificaciones y respaldo de la empresa", meta: "Institucional" },
];

export default async function CapacitacionPage() {
  const usuario = await obtenerUsuarioActual();
  const plazas = await listarPlazas();

  const estadoPlaza = (id: string) => {
    if (usuario.plazasCertificadas.includes(id))
      return { texto: "CERTIFICADO", pct: 100, tono: "ok" as const, detalle: "Vigente hasta marzo 2027" };
    if (usuario.plazasEnProgreso.includes(id))
      return { texto: "EN PROGRESO", pct: 60, tono: "warn" as const, detalle: "3 de 5 módulos completados" };
    return {
      texto: "NO INICIADO",
      pct: 0,
      tono: "neutral" as const,
      detalle: "Puedes consultar, no vender",
    };
  };

  return (
    <div className="flex flex-col gap-5 overflow-auto p-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-extrabold tracking-[-0.015em]">
          Capacitación y certificaciones
        </h1>
        <span className="text-[13px] text-ink-2">
          La tecnología no sustituye la capacitación: sólo puedes vender las plazas en las que estás
          certificado.
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {plazas.map((p) => {
          const e = estadoPlaza(p.id);
          return (
            <Card key={p.id} className="flex flex-col gap-3 p-4.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold">{p.nombre}</span>
                <div className="grow" />
                <Badge tono={e.tono}>{p.activa ? e.texto : "PRÓXIMAMENTE"}</Badge>
              </div>
              <Barra valor={e.pct} tono={e.tono === "neutral" ? "neutral" : e.tono} />
              <span className="text-[11.5px] text-muted">
                {p.activa ? e.detalle : "Plaza en apertura"}
              </span>
            </Card>
          );
        })}
      </div>

      <div className="flex items-start gap-5">
        <Seccion
          titulo="Ruta de certificación · Puebla"
          className="w-175"
          accion={<span className="text-[11.5px] font-bold text-warn-ink">3 de 5 módulos</span>}
        >
          <div className="flex flex-col gap-3">
            {MODULOS.map((m) => (
              <div key={m.n} className="flex items-center gap-3.5 rounded-[3px] border border-line p-3.5">
                <span
                  className={`flex size-7.5 items-center justify-center rounded-full text-[12px] font-bold ${
                    m.ok ? "bg-ink text-white" : "bg-[#EFEAE2] text-muted"
                  }`}
                >
                  {m.n}
                </span>
                <div className="flex grow flex-col gap-1">
                  <span className="text-[13.5px] font-bold">{m.titulo}</span>
                  <span className="text-[11.5px] text-muted">{m.tipo}</span>
                </div>
                <Badge tono={m.ok ? "ok" : "neutral"}>{m.ok ? "completado" : "pendiente"}</Badge>
                <button className="h-8.5 rounded-[3px] border border-[#C9C1B6] px-3.5 text-[10.5px] font-bold tracking-[0.06em] hover:bg-surface">
                  {m.ok ? "REPASAR" : "EMPEZAR"}
                </button>
              </div>
            ))}
          </div>
        </Seccion>

        <div className="flex grow flex-col gap-5">
          <Seccion titulo="Antes de vender Playa Park">
            <div className="flex flex-col gap-3">
              {CHECKLIST.map((c) => (
                <div key={c.texto} className="flex items-center gap-3">
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-[3px] border ${
                      c.ok ? "border-ok bg-ok" : "border-[#C9C1B6] bg-panel"
                    }`}
                  >
                    {c.ok ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4">
                        <path d="M4 12.5l5.5 5.5L20 7" />
                      </svg>
                    ) : null}
                  </span>
                  <span className={`text-[12.5px] leading-snug ${c.ok ? "text-muted" : ""}`}>
                    {c.texto}
                  </span>
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion titulo="Biblioteca comercial">
            <div className="flex flex-col gap-3">
              {BIBLIOTECA.map((b) => (
                <Link
                  key={b.titulo}
                  href="/propiedades"
                  className="flex items-center gap-3 border-b border-line pb-3 last:border-0"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.7">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
                  </svg>
                  <span className="grow text-[12.5px] font-semibold">{b.titulo}</span>
                  <span className="text-[11px] text-muted">{b.meta}</span>
                </Link>
              ))}
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );
}
