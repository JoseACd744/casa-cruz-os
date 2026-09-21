"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSeleccion } from "@/components/Seleccion";
import { Card, Eyebrow, Falta, Foto } from "@/components/ui";
import { money } from "@casacruz/core";

export interface OpcionTipologia {
  id: string;
  nombre: string;
  precioDesde: number | null;
  recamaras: number | null;
  m2: number | null;
}

export interface OpcionDesarrollo {
  id: string;
  nombre: string;
  ciudad: string;
  entrega: string | null;
  confiabilidad: number;
  advertencia: string | null;
  tipologias: OpcionTipologia[];
}

export interface DatosCliente {
  id: string;
  nombre: string;
  presupuesto: string;
  recamaras: string;
  plaza: string;
  kommoLeadId: string | null;
  slug: string;
}

const FORMATOS = [
  { id: "ficha", titulo: "Ficha rápida", detalle: "1 página por propiedad, para WhatsApp" },
  { id: "presentacion", titulo: "Presentación", detalle: "Deck completo con quiénes somos" },
  { id: "web", titulo: "Propuesta web", detalle: "Micrositio con enlace personalizado" },
  { id: "pdf", titulo: "PDF comparativo", detalle: "Las opciones lado a lado" },
] as const;

const OPCIONES = [
  { id: "esquemaPagos", label: "Esquema de pagos" },
  { id: "costosCierre", label: "Costos de cierre" },
  { id: "comparativo", label: "Tabla comparativa final" },
  { id: "videoInstitucional", label: "Video institucional" },
  { id: "mapa", label: "Mapa de ubicaciones" },
] as const;

export function ConstructorPropuesta({
  catalogo,
  cliente,
}: {
  catalogo: OpcionDesarrollo[];
  cliente: DatosCliente;
}) {
  const router = useRouter();
  const { ids, quitar, listo } = useSeleccion();
  const [formato, setFormato] = useState<string>("web");
  const [opciones, setOpciones] = useState<Record<string, boolean>>({
    esquemaPagos: true,
    costosCierre: true,
    comparativo: true,
    videoInstitucional: false,
    mapa: true,
  });
  const [tipologias, setTipologias] = useState<Record<string, string>>({});
  const [razones, setRazones] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState(false);

  const items = ids
    .map((id) => catalogo.find((c) => c.id === id))
    .filter((d): d is OpcionDesarrollo => Boolean(d));

  const sinDatos = items.filter((d) => d.tipologias.length === 0);

  function generar() {
    setGenerando(true);
    // Aquí es donde, con backend, se guarda la propuesta, se congela el precio
    // de cada ítem y se escribe la nota en el lead de Kommo.
    const destino =
      formato === "pdf"
        ? `/doc/pdf/${cliente.slug}`
        : formato === "presentacion"
          ? `/doc/presentacion/${cliente.slug}`
          : formato === "ficha"
            ? `/doc/ficha/${items[0]?.id ?? "playa-park"}`
            : `/p/${cliente.slug}`;
    setTimeout(() => router.push(destino), 600);
  }

  return (
    <div className="flex items-start gap-7 overflow-auto p-7">
      <div className="flex w-220 shrink-0 flex-col gap-4.5">
        <Card className="flex items-center gap-5 p-5">
          <span className="flex size-5.5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
            1
          </span>
          <div className="flex w-58 flex-col gap-1">
            <Eyebrow>Cliente</Eyebrow>
            <span className="text-[16px] font-bold">{cliente.nombre}</span>
          </div>
          <div className="flex flex-col gap-1">
            <Eyebrow>Presupuesto</Eyebrow>
            <span className="text-[13.5px] font-semibold">{cliente.presupuesto}</span>
          </div>
          <div className="flex flex-col gap-1">
            <Eyebrow>Buscan</Eyebrow>
            <span className="text-[13.5px] font-semibold">{cliente.recamaras} habitaciones</span>
          </div>
          <div className="flex flex-col gap-1">
            <Eyebrow>Plaza</Eyebrow>
            <span className="text-[13.5px] font-semibold">{cliente.plaza}</span>
          </div>
          <div className="grow" />
          <span className="flex items-center gap-2 rounded-[3px] border border-line px-3 py-2 text-[11px] font-semibold text-ink-2">
            <span className="size-1.75 rounded-full bg-ok" />
            Kommo · lead #{cliente.kommoLeadId ?? "—"}
          </span>
        </Card>

        <Card className="flex flex-col gap-3.5 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-5.5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
              2
            </span>
            <Eyebrow>Propiedades de la propuesta</Eyebrow>
            <div className="grow" />
            <Link
              href="/propiedades"
              className="flex h-8.5 items-center rounded-[3px] border border-line bg-surface px-3.5 text-[10.5px] font-bold tracking-[0.08em] hover:border-[#C9C1B6]"
            >
              + AGREGAR PROPIEDAD
            </Link>
          </div>

          {!listo ? null : items.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              No has seleccionado propiedades todavía.{" "}
              <Link href="/propiedades" className="font-semibold text-tan-deep underline">
                Elige algunas del inventario
              </Link>
              .
            </p>
          ) : (
            items.map((d) => {
              const tipoId = tipologias[d.id] ?? d.tipologias[0]?.id ?? "";
              const tipo = d.tipologias.find((t) => t.id === tipoId);
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-4 rounded-[3px] border border-line p-3"
                >
                  <Foto className="h-14 w-19 shrink-0" />
                  <div className="flex w-44 flex-col gap-1">
                    <span className="text-[14.5px] font-bold">{d.nombre}</span>
                    <span className="text-[11px] text-muted">
                      {d.ciudad} · {d.entrega ?? "[entrega]"}
                    </span>
                  </div>

                  <div className="flex w-45 flex-col gap-1">
                    <Eyebrow>Tipología</Eyebrow>
                    {d.tipologias.length ? (
                      <select
                        aria-label={`Tipología de ${d.nombre}`}
                        value={tipoId}
                        onChange={(e) =>
                          setTipologias((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        className="h-8 rounded-[3px] border border-line bg-panel px-2 text-[12px] font-semibold"
                      >
                        {d.tipologias.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Falta>[SIN TIPOLOGÍAS]</Falta>
                    )}
                  </div>

                  <div className="flex w-32 flex-col gap-1">
                    <Eyebrow>Precio desde</Eyebrow>
                    <span
                      className={`text-[14px] font-bold ${tipo?.precioDesde ? "" : "text-alert"}`}
                    >
                      {money(tipo?.precioDesde ?? null)}
                    </span>
                  </div>

                  <div className="flex grow flex-col gap-1">
                    <label
                      htmlFor={`razon-${d.id}`}
                      className="eyebrow"
                    >
                      Por qué la elegimos
                    </label>
                    <input
                      id={`razon-${d.id}`}
                      value={razones[d.id] ?? ""}
                      onChange={(e) => setRazones((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="Escribe la razón que verá el cliente…"
                      className="h-8 rounded-[3px] border border-line bg-panel px-2 text-[11.5px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => quitar(d.id)}
                    aria-label={`Quitar ${d.nombre} de la propuesta`}
                    className="flex size-8 items-center justify-center rounded-[3px] border border-line hover:border-alert"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#96402F" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-5.5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
              3
            </span>
            <Eyebrow>Formato de salida</Eyebrow>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {FORMATOS.map((f) => {
              const on = formato === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormato(f.id)}
                  aria-pressed={on}
                  className={`flex flex-col gap-1.5 rounded-[3px] p-3.5 text-left ${
                    on ? "border-2 border-ink bg-tan-soft" : "border border-line bg-panel"
                  }`}
                >
                  <span className="text-[13px] font-bold">{f.titulo}</span>
                  <span className="text-[11px] leading-snug text-ink-2">{f.detalle}</span>
                </button>
              );
            })}
          </div>
          <div className="h-px bg-line" />
          <div className="flex flex-wrap gap-2.5">
            {OPCIONES.map((o) => {
              const on = opciones[o.id];
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOpciones((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                  aria-pressed={on}
                  className={`flex h-9.5 items-center gap-2 rounded-full border px-3.5 text-[12px] font-semibold ${
                    on ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-2"
                  }`}
                >
                  {on ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M4 12.5l5.5 5.5L20 7" />
                    </svg>
                  ) : null}
                  {o.label}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="flex w-115 shrink-0 flex-col gap-4">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line px-4.5 py-3.5">
            <Eyebrow>Vista previa</Eyebrow>
            <div className="grow" />
            <span className="text-[11px] text-muted">
              {FORMATOS.find((f) => f.id === formato)?.titulo}
            </span>
          </div>
          <div className="bg-surface p-4.5">
            <div className="overflow-hidden rounded-[3px] border border-line bg-panel">
              <div className="flex flex-col items-center gap-1.5 bg-ink p-4">
                <span className="text-[8px] font-bold tracking-[0.3em] text-tan">CASA CRUZ</span>
                <span className="text-[14px] font-bold text-white">
                  Hola {cliente.nombre.split(" ")[0]}
                </span>
                <span className="text-[9px] text-[#B8B1A7]">
                  Seleccionamos {items.length} opciones para ustedes
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3">
                <div className="h-13 rounded-[2px] bg-placeholder" />
                <div className="flex gap-2">
                  {items.slice(0, 3).map((d) => (
                    <div key={d.id} className="h-8.5 grow rounded-[2px] bg-[#EFE9E1]" />
                  ))}
                </div>
                <div className="h-2.5 w-3/5 rounded-[2px] bg-[#EFE9E1]" />
                <div className="h-2.5 w-4/5 rounded-[2px] bg-[#EFE9E1]" />
                <div className="h-7 rounded-[2px] bg-tan" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4.5">
          <Eyebrow>Al generar</Eyebrow>
          {[
            `Se crea el enlace propuestas.casacruz.mx/${cliente.slug}`,
            "Se descarga el PDF con las fichas y el comparativo",
            "Se registra en el lead de Kommo: fecha, propiedades y enlace",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2.5 text-[12.5px]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3F6B4F" strokeWidth="2">
                <path d="M4 12.5l5.5 5.5L20 7" />
              </svg>
              {t}
            </div>
          ))}
          {sinDatos.map((d) => (
            <div key={d.id} className="flex items-start gap-2.5 text-[12.5px] text-ink-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9A6B22" strokeWidth="2" className="mt-0.5 shrink-0">
                <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.9 17a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
              </svg>
              {d.nombre} no tiene precio capturado: se enviará como “consultar”.
            </div>
          ))}
        </Card>

        <button
          type="button"
          onClick={generar}
          disabled={items.length === 0 || generando}
          className="flex h-15 items-center justify-center gap-3 rounded-[3px] bg-ink text-[13px] font-bold tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generando ? "GENERANDO…" : "GENERAR PROPUESTA"}
          {!generando && (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
        <span className="text-center text-[11px] text-muted">
          La propuesta congela el precio de cada opción al momento de enviarse.
        </span>
      </div>
    </div>
  );
}
