"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSeleccion } from "@/components/Seleccion";
import { Card, Eyebrow, Falta, Foto } from "@/components/ui";
import { money } from "@casacruz/core";
import type { Propuesta } from "@casacruz/core";
import { crearPropuesta } from "@/lib/acciones/comercial";
import { Logotipo } from "./Marca";

export interface OpcionTipologia {
  id: string;
  nombre: string;
  niveles: { nombre: string; precio: number | null }[];
}

export interface OpcionDesarrollo {
  id: string;
  nombre: string;
  foto: string | null;
  ciudad: string;
  entrega: string | null;
  confiabilidad: number;
  advertencia: string | null;
  /** Por qué no puede ir en esta propuesta (no publicado, plaza sin certificar). */
  motivo: string | null;
  tipologias: OpcionTipologia[];
}

export interface DatosCliente {
  id: string;
  nombre: string;
  presupuesto: string;
  recamaras: string;
  plazas: string;
  kommoLeadId: string | null;
}

type Formato = Propuesta["formato"];
type Opciones = Propuesta["opciones"];

const FORMATOS: { id: Formato; titulo: string; detalle: string }[] = [
  { id: "ficha", titulo: "Ficha rápida", detalle: "1 página por propiedad, para WhatsApp" },
  { id: "presentacion", titulo: "Presentación", detalle: "Deck completo con quiénes somos" },
  { id: "web", titulo: "Propuesta web", detalle: "Micrositio con enlace personalizado" },
  { id: "pdf", titulo: "PDF comparativo", detalle: "Las opciones lado a lado" },
];

const OPCIONES: { id: keyof Opciones; label: string }[] = [
  { id: "esquemaPagos", label: "Esquema de pagos" },
  { id: "costosCierre", label: "Costos de cierre" },
  { id: "comparativo", label: "Tabla comparativa final" },
  { id: "videoInstitucional", label: "Video institucional" },
  { id: "mapa", label: "Mapa de ubicaciones" },
];

function precioDe(t: OpcionTipologia | undefined, nivel: string): number | null {
  const precios = (t?.niveles ?? [])
    .filter((n) => (nivel ? n.nombre === nivel : true))
    .map((n) => n.precio)
    .filter((p): p is number => p !== null);
  return precios.length ? Math.min(...precios) : null;
}

export function ConstructorPropuesta({
  catalogo,
  cliente,
  kommo,
}: {
  catalogo: OpcionDesarrollo[];
  cliente: DatosCliente;
  /** Si la API tiene Kommo conectado. */
  kommo: boolean;
}) {
  const router = useRouter();
  const { ids, quitar, limpiar, listo } = useSeleccion();
  const [formato, setFormato] = useState<Formato>("web");
  const [opciones, setOpciones] = useState<Opciones>({
    esquemaPagos: true,
    costosCierre: false,
    comparativo: true,
    videoInstitucional: false,
    mapa: true,
  });
  const [tipologias, setTipologias] = useState<Record<string, string>>({});
  const [niveles, setNiveles] = useState<Record<string, string>>({});
  const [razones, setRazones] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [generando, iniciar] = useTransition();

  const items = ids
    .map((id) => catalogo.find((c) => c.id === id))
    .filter((d): d is OpcionDesarrollo => Boolean(d));
  const bloqueados = items.filter((d) => d.motivo);
  const sinPrecio = items.filter(
    (d) => !d.motivo && d.tipologias.every((t) => t.niveles.every((n) => n.precio === null)),
  );

  function generar(enviar: boolean) {
    setError(null);
    iniciar(async () => {
      const r = await crearPropuesta({
        clienteId: cliente.id,
        formato,
        enviar,
        opciones,
        items: items.map((d) => ({
          desarrolloId: d.id,
          tipologiaId: tipologias[d.id] ?? d.tipologias[0]?.id ?? null,
          nivel: niveles[d.id] || null,
          razon: razones[d.id]?.trim() || null,
        })),
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      const primera = items[0]?.id;
      limpiar();
      router.push(
        formato === "pdf"
          ? `/doc/pdf/${r.slug}`
          : formato === "presentacion"
            ? `/doc/presentacion/${r.slug}`
            : formato === "ficha" && primera
              ? `/doc/ficha/${primera}`
              : `/p/${r.slug}`,
      );
    });
  }

  const puedeGenerar = listo && items.length > 0 && bloqueados.length === 0 && !generando;

  const kommoTexto = !kommo
    ? "Kommo sin conectar: la nota no se escribe"
    : cliente.kommoLeadId
      ? `Se registra en el lead #${cliente.kommoLeadId} de Kommo: fecha, propiedades y enlace`
      : "El cliente no tiene lead de Kommo: la nota no se escribe";
  const avisos: [string, boolean][] = [
    ["Se crea un enlace personal para el cliente y se congela el precio de cada opción", true],
    ["El PDF y la presentación salen de los mismos datos", true],
    [kommoTexto, kommo && Boolean(cliente.kommoLeadId)],
  ];

  return (
    <div className="flex items-start gap-7 overflow-auto p-7">
      {/* Las columnas ceden ancho en proporción hasta su mínimo: así caben en laptops sin scroll
          lateral. Con menos de 840px (lo que pide una propiedad en un renglón), el cliente y cada
          propiedad se acomodan en dos renglones. */}
      <div className="@container flex w-220 min-w-140 flex-col gap-4.5">
        <Card className="flex items-start gap-5 p-5 @min-[840px]:items-center">
          <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
            1
          </span>
          <div className="flex min-w-0 grow flex-wrap items-center gap-x-5 gap-y-3.5">
            <div className="flex w-58 grow flex-col gap-1 @min-[840px]:grow-0">
              <Eyebrow>Cliente</Eyebrow>
              <Link href={`/clientes/${cliente.id}`} className="text-[16px] font-bold hover:text-tan-deep">
                {cliente.nombre}
              </Link>
            </div>
            <div className="flex basis-full gap-5 @min-[840px]:basis-auto">
              <div className="flex flex-col gap-1">
                <Eyebrow>Presupuesto</Eyebrow>
                <span className="text-[13.5px] font-semibold">{cliente.presupuesto}</span>
              </div>
              <div className="flex flex-col gap-1">
                <Eyebrow>Buscan</Eyebrow>
                <span className="text-[13.5px] font-semibold">{cliente.recamaras}</span>
              </div>
              <div className="flex flex-col gap-1">
                <Eyebrow>Plazas</Eyebrow>
                <span className="text-[13.5px] font-semibold">{cliente.plazas}</span>
              </div>
            </div>
          </div>
          <Link href="/propuestas/nueva" className="text-[11px] font-semibold text-tan-deep underline hover:text-ink">
            Cambiar
          </Link>
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
              const nivel = niveles[d.id] ?? "";
              const precio = precioDe(tipo, nivel);
              return (
                <div
                  key={d.id}
                  className={`flex flex-col gap-2.5 rounded-[3px] border p-3 ${
                    d.motivo ? "border-alert/50 bg-alert-soft/30" : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3 @min-[840px]:flex-nowrap">
                    <Foto src={d.foto} className="h-14 w-19 shrink-0" />
                    <div className="flex w-40 flex-col gap-1">
                      <span className="text-[14.5px] font-bold">{d.nombre}</span>
                      <span className="text-[11px] text-muted">
                        {d.ciudad} · {d.entrega ?? "[entrega]"}
                      </span>
                    </div>

                    {/* Angosto: tipología, nivel y precio bajan a su propio renglón, bajo la foto. */}
                    <div className="order-last flex basis-full items-center gap-4 @min-[840px]:order-none @min-[840px]:basis-auto">
                      {d.tipologias.length ? (
                        <>
                          <div className="flex w-40 grow flex-col gap-1 @min-[840px]:grow-0">
                            <Eyebrow>Tipología</Eyebrow>
                            <select
                              aria-label={`Tipología de ${d.nombre}`}
                              value={tipoId}
                              onChange={(e) => {
                                setTipologias((prev) => ({ ...prev, [d.id]: e.target.value }));
                                setNiveles((prev) => ({ ...prev, [d.id]: "" }));
                              }}
                              className="h-8 rounded-[3px] border border-line bg-panel px-2 text-[12px] font-semibold"
                            >
                              {d.tipologias.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex w-34 flex-col gap-1">
                            <Eyebrow>Nivel</Eyebrow>
                            <select
                              aria-label={`Nivel de ${d.nombre}`}
                              value={nivel}
                              onChange={(e) => setNiveles((prev) => ({ ...prev, [d.id]: e.target.value }))}
                              className="h-8 rounded-[3px] border border-line bg-panel px-2 text-[12px] font-semibold"
                            >
                              <option value="">El más accesible</option>
                              {(tipo?.niveles ?? []).map((n) => (
                                <option key={n.nombre} value={n.nombre}>
                                  {n.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="w-74 grow @min-[840px]:grow-0">
                          <Falta>[SIN TIPOLOGÍAS]</Falta>
                        </div>
                      )}

                      <div className="flex w-28 flex-col gap-1">
                        <Eyebrow>Precio desde</Eyebrow>
                        <span className={`text-[14px] font-bold ${precio ? "" : "text-alert"}`}>
                          {precio ? money(precio) : "Consultar"}
                        </span>
                      </div>
                    </div>

                    <div className="grow" />
                    <button
                      type="button"
                      onClick={() => quitar(d.id)}
                      aria-label={`Quitar ${d.nombre} de la propuesta`}
                      className="flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-line hover:border-alert"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#96402F" strokeWidth="2">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  {d.motivo ? (
                    <span className="text-[11.5px] font-semibold text-alert-ink">
                      {d.motivo} Quítala para poder generar la propuesta.
                    </span>
                  ) : (
                    <input
                      aria-label={`Por qué elegimos ${d.nombre}`}
                      value={razones[d.id] ?? ""}
                      onChange={(e) => setRazones((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="Por qué la elegimos: la razón que va a leer el cliente…"
                      className="h-9 rounded-[3px] border border-line bg-panel px-3 text-[12px]"
                    />
                  )}
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
          <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
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

      <div className="flex w-115 min-w-85 flex-col gap-4">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line px-4.5 py-3.5">
            <Eyebrow>Vista previa</Eyebrow>
            <div className="grow" />
            <span className="text-[11px] text-muted">{FORMATOS.find((f) => f.id === formato)?.titulo}</span>
          </div>
          <div className="bg-surface p-4.5">
            <div className="overflow-hidden rounded-[3px] border border-line bg-panel">
              <div className="flex flex-col items-center gap-1.5 bg-ink p-4">
                <Logotipo className="h-4.5 text-white" />
                <span className="text-[14px] font-bold text-white">Hola {cliente.nombre.split(" ")[0]}</span>
                <span className="text-[9px] text-[#B8B1A7]">
                  Seleccionamos {items.length} {items.length === 1 ? "opción" : "opciones"} para ustedes
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3">
                <Foto src={items[0]?.foto} className="h-13 w-full rounded-[2px]" />
                <div className="flex gap-2">
                  {items.slice(0, 3).map((d) => (
                    <Foto key={d.id} src={d.foto} className="h-8.5 w-0 grow rounded-[2px]" />
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
          {avisos.map(([t, ok]) => (
            <div key={t} className="flex items-start gap-2.5 text-[12.5px]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ok ? "#3F6B4F" : "#9A8F82"}
                strokeWidth="2"
                className="mt-0.5 shrink-0"
              >
                <path d={ok ? "M4 12.5l5.5 5.5L20 7" : "M5 12h14"} />
              </svg>
              <span className={ok ? "" : "text-ink-2"}>{t}</span>
            </div>
          ))}
          {sinPrecio.map((d) => (
            <div key={d.id} className="flex items-start gap-2.5 text-[12.5px] text-ink-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9A6B22" strokeWidth="2" className="mt-0.5 shrink-0">
                <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.9 17a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
              </svg>
              {d.nombre} no tiene precio capturado: se enviará como “consultar”.
            </div>
          ))}
        </Card>

        {error ? (
          <div
            role="alert"
            className="rounded-[3px] border border-alert/40 bg-alert-soft px-4 py-3 text-[12.5px] font-semibold whitespace-pre-line text-alert-ink"
          >
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => generar(true)}
          disabled={!puedeGenerar}
          className="flex h-15 items-center justify-center gap-3 rounded-[3px] bg-ink text-[13px] font-bold tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generando ? "GENERANDO…" : "GENERAR Y ENVIAR"}
          {!generando && (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => generar(false)}
          disabled={!puedeGenerar}
          className="h-11 rounded-[3px] border border-[#C9C1B6] text-[11px] font-bold tracking-[0.1em] hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          GUARDAR COMO BORRADOR
        </button>
        <span className="text-center text-[11px] text-muted">
          La propuesta congela el precio de cada opción al momento de generarse.
        </span>
      </div>
    </div>
  );
}
