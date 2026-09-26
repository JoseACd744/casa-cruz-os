import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonAccion } from "@/components/BotonAccion";
import { Tabs } from "@/components/Tabs";
import { Badge, Barra, Card, Dot, Eyebrow, Falta, Foto } from "@/components/ui";
import {
  advertencia,
  confiabilidad,
  estadoValidaciones,
  galeria,
  planoDe,
  semaforo,
} from "@casacruz/core";
import { etiquetaEstatus, etiquetaFuente, hace, money, pct } from "@casacruz/core";
import { confirmarVigencia } from "@/lib/acciones/gobierno";
import { usandoApi } from "@/lib/api";
import { cambiosDe, obtenerDesarrollo, precioPorM2 } from "@/lib/repo";
import type { Desarrollo } from "@casacruz/core";

function Tipologias({ d }: { d: Desarrollo }) {
  if (!d.tipologias.length) {
    return (
      <Card className="p-6 text-[13px] text-alert">
        [TIPOLOGÍAS Y PRECIOS PENDIENTES DE CAPTURA] — este desarrollo no puede enviarse a un
        cliente hasta que tenga al menos una tipología con precio.
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {d.tipologias.map((t) => (
        <Card key={t.id} className="flex gap-5 p-4.5">
          <Foto src={planoDe(d, t.id)} label="Plano" className="h-37 w-50 shrink-0 object-contain" />
          <div className="flex w-55 flex-col gap-2.5">
            <span className="text-[17px] leading-tight font-bold">{t.nombre}</span>
            <div className="flex gap-4 text-[12.5px] text-ink-2">
              <span>{t.recamaras ?? "[ ]"} rec</span>
              <span>{t.banos ?? "[ ]"} baños</span>
            </div>
            <span className="text-[13px] font-semibold">
              {t.m2Construccion ? `${t.m2Construccion} m² totales` : <Falta>[ m² ]</Falta>}
            </span>
            <span className="text-[12px] text-muted">
              {precioPorM2(t) ? `${money(precioPorM2(t))} / m²` : ""}
            </span>
            <div className="grow" />
            <Badge tono="tan">
              {t.niveles.some((n) => n.disponibles !== null)
                ? `${t.niveles.reduce((a, n) => a + (n.disponibles ?? 0), 0)} disponibles`
                : "[DISPONIBILIDAD]"}
            </Badge>
          </div>
          <div className="flex grow flex-col">
            <div className="flex rounded-t-[2px] bg-tan">
              <span className="grow px-3 py-2 text-[10px] font-bold tracking-[0.14em] text-ink">NIVEL</span>
              <span className="px-3 py-2 text-[10px] font-bold tracking-[0.14em] text-ink">PRECIO DESDE</span>
            </div>
            {t.niveles.map((n) => (
              <div key={n.nombre} className="flex border-b border-line">
                <span className="grow px-3 py-2.5 text-[12px] font-semibold">{n.nombre}</span>
                <span className="px-3 py-2.5 text-[12px] font-bold">
                  {n.precioVenta === null ? <Falta>[PRECIO]</Falta> : `${money(n.precioVenta)} MXN`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
      <Card className="flex items-center gap-6 px-4.5 py-4">
        <Eyebrow>Esquema de pago</Eyebrow>
        <span className="text-[13px] font-bold">
          {d.condiciones.enganchePct === null ? (
            <Falta>[ENGANCHE]</Falta>
          ) : (
            `${d.condiciones.enganchePct}% enganche`
          )}
        </span>
        <span className="text-[12px] text-ink-2">{d.condiciones.engancheNota ?? ""}</span>
        <span className="text-[13px] font-bold">
          {d.condiciones.restoPct === null ? <Falta>[RESTO]</Falta> : `${d.condiciones.restoPct}%`}
        </span>
        <span className="text-[12px] text-ink-2">{d.condiciones.restoNota ?? ""}</span>
      </Card>
    </div>
  );
}

function Lista({
  titulo,
  items,
  tono = "tan",
}: {
  titulo: string;
  items: string[];
  tono?: "tan" | "alert";
}) {
  return (
    <Card className="flex flex-col gap-2.5 p-4.5">
      <span
        className={`text-[10px] font-bold tracking-[0.16em] uppercase ${
          tono === "alert" ? "text-alert" : "text-tan-deep"
        }`}
      >
        {titulo}
      </span>
      {items.length ? (
        items.map((x) => (
          <span key={x} className="text-[13px] leading-relaxed">
            · {x}
          </span>
        ))
      ) : (
        <span className="text-[13px] text-alert">[PENDIENTE DE CAPTURA]</span>
      )}
    </Card>
  );
}

export default async function PropiedadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; cambio?: string }>;
}) {
  const { id } = await params;
  const { tab, cambio } = await searchParams;
  const d = await obtenerDesarrollo(id);
  if (!d) notFound();

  const score = confiabilidad(d);
  const estados = estadoValidaciones(d);
  const traza = await cambiosDe(d.id);
  const aviso = advertencia(d);
  const fotos = galeria(d);

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
        <span className="text-[11.5px] font-semibold tracking-[0.06em] uppercase">{d.nombre}</span>
        <div className="grow" />
        <span className="font-mono text-[11px] text-muted">ID {d.id}</span>
      </header>

      <div className="flex items-start gap-7 overflow-auto p-7">
        <div className="flex w-251 flex-col gap-4.5">
          <div className="flex items-end gap-3.5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[38px] font-extrabold tracking-[-0.015em] uppercase">{d.nombre}</h1>
                <Badge tono="dark">{d.tipo}s</Badge>
              </div>
              <span className="text-[12.5px] font-semibold tracking-[0.12em] text-ink-2 uppercase">
                {d.ciudad} · entrega {d.entrega ?? "[POR CONFIRMAR]"} ·{" "}
                {d.desarrollador ?? "[DESARROLLADOR]"}
              </span>
            </div>
            <div className="grow" />
            <Badge tono={d.estatus === "publicado" ? "ok" : "warn"}>{etiquetaEstatus[d.estatus]}</Badge>
          </div>

          <div className="flex flex-col gap-3">
            <Foto src={fotos.principal} label="Render principal" className="h-68 w-full" />
            <div className="grid grid-cols-4 gap-3">
              <Foto src={fotos.secundarias[0]} label="Amenidades" className="h-23 w-full" />
              <Foto src={fotos.secundarias[1]} label="Interiores" className="h-23 w-full" />
              <Foto src={fotos.planos[0]} label="Planos" className="h-23 w-full" />
              {fotos.video ? (
                <a
                  href={fotos.video}
                  target="_blank"
                  rel="noopener"
                  className="flex h-23 items-center justify-center rounded-[3px] bg-ink text-[9.5px] font-bold tracking-[0.22em] text-ground uppercase hover:brightness-125"
                >
                  Ver video Casa Cruz
                </a>
              ) : (
                <Foto label="Video Casa Cruz" className="h-23" dark />
              )}
            </div>
          </div>

          {cambio === "publicado" || cambio === "pendiente" ? (
            <div
              role="status"
              className={`flex items-center gap-3 rounded-[3px] border px-4 py-3 ${
                cambio === "publicado" ? "border-ok/30 bg-ok-soft" : "border-warn/40 bg-warn-soft"
              }`}
            >
              <span
                className={`text-[12.5px] font-semibold ${
                  cambio === "publicado" ? "text-ok-ink" : "text-warn-ink"
                }`}
              >
                {cambio === "publicado"
                  ? "Cambio publicado: el valor nuevo ya está en la Base Maestra y el campo cuenta como validado hoy."
                  : "Cambio enviado a aprobación: el cliente sigue viendo el valor anterior hasta que un gerente lo valide."}
              </span>
            </div>
          ) : null}

          {aviso ? (
            <div className="flex items-center gap-3 rounded-[3px] border border-warn/40 bg-warn-soft px-4 py-3">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9A6B22" strokeWidth="1.8">
                <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.9 17a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
              </svg>
              <span className="text-[12px] font-semibold text-warn-ink">{aviso}</span>
            </div>
          ) : null}

          <Tabs
            inicial={tab}
            paneles={[
              { id: "tipologias", label: "TIPOLOGÍAS Y PRECIOS", contenido: <Tipologias d={d} /> },
              {
                id: "argumentos",
                label: "ARGUMENTOS COMERCIALES",
                contenido: (
                  <div className="grid grid-cols-2 gap-4">
                    <Lista titulo="Argumentos de venta" items={d.comercial.argumentos} />
                    <Lista titulo="Objeciones frecuentes" items={d.comercial.objeciones} tono="alert" />
                    <Lista
                      titulo="Buyer persona / cliente ideal"
                      items={[d.comercial.buyerPersona, d.comercial.clienteIdeal].filter(
                        (x): x is string => Boolean(x),
                      )}
                    />
                    <Lista
                      titulo="Qué cliente no debería comprarlo"
                      items={d.comercial.noDeberiaComprarlo}
                    />
                  </div>
                ),
              },
              {
                id: "interna",
                label: "INFORMACIÓN INTERNA",
                contenido: (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-3 rounded-card bg-ink px-4.5 py-3.5">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A98D6F" strokeWidth="1.8">
                        <rect x="4" y="10" width="16" height="11" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                      <span className="text-[12px] font-semibold text-white">
                        Visible para cerrador certificado, gerente y corporativo. No se incluye en
                        fichas ni propuestas.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="flex flex-col gap-3 p-4.5">
                        <Eyebrow>Condiciones Casa Cruz</Eyebrow>
                        {[
                          ["Comisión autorizada", d.interna.comisionPct === null ? "[ % ]" : pct(d.interna.comisionPct)],
                          ["Contacto comercial", d.interna.contactoComercial ?? "[NOMBRE · TELÉFONO]"],
                          [
                            "Convenio firmado",
                            d.interna.convenioFirmado === null ? "[SÍ / NO]" : d.interna.convenioFirmado ? "Sí" : "No",
                          ],
                          ["Due diligence", d.interna.dueDiligence],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[13px]">
                            <span className="text-ink-2">{k}</span>
                            <span className={`font-bold ${v.startsWith("[") ? "text-alert" : ""}`}>{v}</span>
                          </div>
                        ))}
                      </Card>
                      <Card className="flex flex-col gap-3 p-4.5">
                        <Eyebrow>Documentación</Eyebrow>
                        {d.interna.documentos.length ? (
                          d.interna.documentos.map((doc) => (
                            <div key={doc.nombre} className="flex items-center gap-2.5 text-[12.5px]">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.6">
                                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
                              </svg>
                              {doc.nombre} · {hace(doc.cargadoHaceDias)}
                            </div>
                          ))
                        ) : (
                          <span className="text-[13px] text-alert">[SIN DOCUMENTOS CARGADOS]</span>
                        )}
                      </Card>
                    </div>
                  </div>
                ),
              },
              {
                id: "trazabilidad",
                label: "TRAZABILIDAD",
                contenido: (
                  <Card className="px-4.5">
                    {traza.length ? (
                      traza.map((c) => (
                        <div key={c.id} className="flex gap-4.5 border-b border-line py-4 last:border-0">
                          <span className="w-33 font-mono text-[11px] text-muted">{c.fecha}</span>
                          <span className="w-32 text-[12px] font-semibold">{c.usuario}</span>
                          <div className="flex grow flex-col gap-1.5">
                            <span className="text-[12.5px]">{c.campo}</span>
                            <span className="text-[12px] text-muted">
                              {c.valorAnterior} → <span className="font-bold text-ink">{c.valorNuevo}</span>
                            </span>
                            {c.nota ? <span className="text-[11.5px] text-ink-2">“{c.nota}”</span> : null}
                          </div>
                          <div className="flex w-62 flex-col gap-1 self-center">
                            <span className="text-[11px] text-tan-deep">{etiquetaFuente[c.fuente]}</span>
                            {c.evidencia && /^https?:\/\//.test(c.evidencia) ? (
                              <a
                                href={c.evidencia}
                                target="_blank"
                                rel="noopener"
                                className="text-[10.5px] font-semibold text-ink-2 underline hover:text-ink"
                              >
                                Ver evidencia
                              </a>
                            ) : (
                              <span className="text-[10.5px] text-muted">
                                {c.evidencia ?? "sin evidencia adjunta"}
                              </span>
                            )}
                            {c.aprobadoPor ? (
                              <span className="text-[10.5px] text-muted">
                                {c.estado === "rechazado" ? "Rechazó" : "Aprobó"} {c.aprobadoPor}
                              </span>
                            ) : null}
                          </div>
                          {c.estado === "pendiente" ? (
                            <Badge tono="warn">pendiente</Badge>
                          ) : c.estado === "rechazado" ? (
                            <Badge tono="alert">rechazado</Badge>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-[13px] text-muted">Sin cambios registrados todavía.</p>
                    )}
                  </Card>
                ),
              },
            ]}
          />
        </div>

        <div className="flex w-86 shrink-0 flex-col gap-4">
          <Card className="flex flex-col gap-2.5 p-4.5">
            <Link
              href={`/doc/ficha/${d.id}`}
              target="_blank"
              className="flex h-11.5 items-center justify-center gap-2.5 rounded-[3px] bg-ink text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
              </svg>
              GENERAR FICHA
            </Link>
            <Link
              href="/propuestas/nueva"
              className="flex h-11.5 items-center justify-center gap-2.5 rounded-[3px] bg-tan text-[11.5px] font-bold tracking-[0.1em] text-ink hover:brightness-105"
            >
              AGREGAR A PROPUESTA
            </Link>
            <div className="flex gap-2.5">
              <Link
                href={`/propiedades/${d.id}/simulador`}
                className="flex h-10.5 grow items-center justify-center rounded-[3px] border border-[#C9C1B6] text-[10.5px] font-bold tracking-[0.08em] hover:bg-surface"
              >
                SIMULADOR
              </Link>
              <a
                href={usandoApi ? `/descargas/ficha/${d.id}` : `/doc/ficha/${d.id}`}
                target="_blank"
                rel="noopener"
                title="Descarga la ficha en PDF para enviarla por WhatsApp o correo"
                className="flex h-10.5 grow items-center justify-center rounded-[3px] border border-[#C9C1B6] text-[10.5px] font-bold tracking-[0.08em] hover:bg-surface"
              >
                COMPARTIR
              </a>
            </div>
          </Card>

          <Card className="flex scroll-mt-6 flex-col gap-3.5 p-4.5">
            <div id="confiabilidad" className="flex items-baseline">
              <Eyebrow>Confiabilidad</Eyebrow>
              <div className="grow" />
              <span
                className={`text-[26px] font-extrabold ${
                  semaforo(score) === "ok"
                    ? "text-ok-ink"
                    : semaforo(score) === "warn"
                      ? "text-warn-ink"
                      : "text-alert-ink"
                }`}
              >
                {score}%
              </span>
            </div>
            <Barra valor={score} tono={semaforo(score)} />
            {estados.map((e) => (
              <div key={e.campo} className="flex min-h-7 items-center gap-2.5">
                <Dot tono={e.estado === "vigente" ? "ok" : e.estado === "por_vencer" ? "warn" : "alert"} />
                <span className="grow text-[12px]">{e.etiqueta}</span>
                <span className="text-[11.5px] text-muted">
                  {e.haceDias === null ? "sin validar" : hace(e.haceDias)}
                </span>
                {e.haceDias === 0 ? (
                  <span className="w-19 text-right text-[10px] font-bold tracking-[0.08em] text-ok-ink">
                    AL DÍA
                  </span>
                ) : (
                  <BotonAccion
                    accion={confirmarVigencia.bind(null, d.id, e.campo)}
                    enCurso="…"
                    className="h-7 w-19 rounded-[3px] border border-line bg-surface text-[9.5px] font-bold tracking-[0.08em] hover:border-[#C9C1B6]"
                  >
                    CONFIRMAR
                  </BotonAccion>
                )}
              </div>
            ))}
            <span className="text-[10.5px] leading-relaxed text-muted">
              Confirmar es decir “lo revisé hoy y sigue igual”. Si cambió, regístralo con su fuente.
            </span>
            <Link
              href={`/propiedades/${d.id}/cambio`}
              className="flex h-10 items-center justify-center rounded-[3px] border border-line bg-surface text-[10.5px] font-bold tracking-[0.08em] hover:border-[#C9C1B6]"
            >
              REGISTRAR UN CAMBIO
            </Link>
          </Card>

          <Card className="flex flex-col gap-3 p-4.5">
            <Eyebrow>Ubicación</Eyebrow>
            <Foto label="Google Maps" className="h-33" />
            <span className="text-[12px] leading-relaxed text-ink-2">
              {d.direccion ?? "[DIRECCIÓN EXACTA]"} · {d.ciudad}
            </span>
          </Card>
        </div>
      </div>
    </>
  );
}
