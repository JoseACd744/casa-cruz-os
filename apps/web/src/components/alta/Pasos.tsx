"use client";

import { conSubidaDirecta } from "@/lib/subida-directa";

import Link from "next/link";
import { useActionState, useState } from "react";
import { etiquetaFuente, money, type Desarrollo, type FuenteTipo, type Plaza, type Tipologia } from "@casacruz/core";
import { BotonAccion } from "@/components/BotonAccion";
import {
  AvisoAccion,
  BotonGuardar,
  CampoArea,
  CampoCasillas,
  CampoOpciones,
  CampoTexto,
} from "@/components/formulario";
import {
  crearDesarrollo,
  eliminarTipologia,
  guardarComercial,
  guardarCondiciones,
  guardarIdentificacion,
  guardarInterna,
  guardarTipologia,
  subirDocumento,
  subirMultimedia,
} from "@/lib/acciones/desarrollos";
import { ESTADO_INICIAL } from "@/lib/acciones/tipos";

/**
 * Los formularios de cada paso del alta. Todos guardan con un server action y
 * muestran lo que responde la API en el mismo lugar.
 */

const TIPOS = [
  { valor: "departamento", texto: "Departamentos" },
  { valor: "casa", texto: "Casas" },
  { valor: "terreno", texto: "Terrenos" },
  { valor: "local", texto: "Locales" },
];

const FORMAS_PAGO = [
  "Crédito hipotecario",
  "Contado con descuento",
  "Mensualidades sin intereses",
  "Infonavit / Fovissste",
  "Crédito directo con el desarrollador",
];

/** Enlace para cambiar un dato protegido por la vía correcta. */
function PorCambio({ id, campo }: { id: string; campo: string }) {
  return (
    <>
      Ya lo ve el cliente:{" "}
      <Link href={`/propiedades/${id}/cambio?campo=${campo}`} className="font-semibold text-tan-deep underline">
        regístralo como cambio
      </Link>
    </>
  );
}

// ── Alta · paso 1 ───────────────────────────────────────────────────────

export function FormAlta({ plazas }: { plazas: Plaza[] }) {
  const [estado, accion] = useActionState(crearDesarrollo, ESTADO_INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoTexto nombre="nombre" etiqueta="Nombre del desarrollo" requerido ancho="col-span-2" placeholder="Como lo conoce el cliente" />
        <CampoOpciones nombre="tipo" etiqueta="Tipo" valor="departamento" opciones={TIPOS} />
        <CampoOpciones
          nombre="plazaId"
          etiqueta="Plaza"
          valor={plazas[0]?.id ?? ""}
          opciones={plazas.map((p) => ({ valor: p.id, texto: p.nombre }))}
          ayuda="Decide quién puede venderlo: sólo los certificados en la plaza."
        />
        <CampoTexto nombre="ciudad" etiqueta="Ciudad" requerido placeholder="Playa del Carmen" />
        <CampoTexto nombre="zona" etiqueta="Zona" placeholder="Opcional" />
        <CampoTexto nombre="entrega" etiqueta="Fecha de entrega" ayuda="Mes y año, por ejemplo Marzo 2027" placeholder="Opcional" />
      </div>
      <AvisoAccion estado={estado} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11.5px] leading-relaxed text-muted">
          Nace como borrador, a tu nombre. Nada se ve en el portal hasta que corporativo lo publique.
        </span>
        <div className="grow" />
        <BotonGuardar>CREAR Y SEGUIR CON LAS TIPOLOGÍAS</BotonGuardar>
      </div>
    </form>
  );
}

// ── Paso 1 · Identificación ─────────────────────────────────────────────

export function PasoIdentificacion({ d, entregaProtegida }: { d: Desarrollo; entregaProtegida: boolean }) {
  const [estado, accion] = useActionState(guardarIdentificacion.bind(null, d.id), ESTADO_INICIAL);
  const mapa = d.lat !== null && d.lng !== null ? `https://www.google.com/maps?q=${d.lat},${d.lng}` : null;

  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoTexto nombre="nombre" etiqueta="Nombre" valor={d.nombre} requerido ancho="col-span-2" />
        <CampoOpciones nombre="tipo" etiqueta="Tipo" valor={d.tipo} opciones={TIPOS} />
        <CampoTexto nombre="ciudad" etiqueta="Ciudad" valor={d.ciudad} requerido />
        <CampoTexto nombre="zona" etiqueta="Zona" valor={d.zona} />
        <CampoTexto
          nombre="entrega"
          etiqueta="Fecha de entrega"
          valor={d.entrega}
          bloqueado={entregaProtegida}
          ayuda={entregaProtegida ? <PorCambio id={d.id} campo="entrega" /> : "Mes y año, por ejemplo Marzo 2027"}
        />
        <CampoTexto nombre="direccion" etiqueta="Dirección" valor={d.direccion} ancho="col-span-2" />
        <CampoTexto nombre="desarrollador" etiqueta="Desarrollador" valor={d.desarrollador} />
        <CampoTexto nombre="lat" etiqueta="Latitud" valor={d.lat} inputMode="decimal" placeholder="20.6274" />
        <CampoTexto nombre="lng" etiqueta="Longitud" valor={d.lng} inputMode="decimal" placeholder="-87.0799" />
        <div className="flex flex-col justify-center gap-1 text-[11px] leading-snug text-muted">
          {mapa ? (
            <a href={mapa} target="_blank" rel="noopener" className="font-semibold text-tan-deep underline">
              Ver el punto en Google Maps
            </a>
          ) : (
            <span>En Google Maps, clic derecho sobre el desarrollo: el primer renglón son las coordenadas.</span>
          )}
          <span>Con ellas se genera el mapa de la ficha y del análisis.</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoArea
          nombre="amenidades"
          etiqueta="Amenidades"
          valor={d.amenidades}
          ayuda="Una por línea: salen en la ficha como destacables."
        />
        <CampoArea
          nombre="aConsiderar"
          etiqueta="A considerar (lo ve el cliente)"
          valor={d.aConsiderar}
          ayuda="Advertencias honestas, como “las torres no tienen elevador”."
        />
      </div>
      <AvisoAccion estado={estado} />
      <div className="flex justify-end">
        <BotonGuardar />
      </div>
    </form>
  );
}

// ── Paso 2 · Tipologías ──────────────────────────────────────────────────

interface Fila {
  clave: number;
  nombre: string;
  precioVenta: number | null;
  precioLista: number | null;
  disponibles: number | null;
  existente: boolean;
}

function EditorTipologia({
  id,
  tipologia,
  protegido,
  alCancelar,
}: {
  id: string;
  tipologia: Tipologia | null;
  protegido: boolean;
  alCancelar?: () => void;
}) {
  const [estado, accion] = useActionState(guardarTipologia.bind(null, id), ESTADO_INICIAL);
  const [filas, setFilas] = useState<Fila[]>(() =>
    tipologia?.niveles.length
      ? tipologia.niveles.map((n, i) => ({ clave: i, ...n, existente: true }))
      : [{ clave: 0, nombre: "Planta baja", precioVenta: null, precioLista: null, disponibles: null, existente: false }],
  );
  const siguiente = () => Math.max(0, ...filas.map((f) => f.clave)) + 1;
  const prefijo = tipologia?.id ?? "nueva";
  const celda = "h-10 w-full rounded-[3px] border border-[#C9C1B6] bg-panel px-3 text-[13px]";
  const bloqueada = "h-10 w-full rounded-[3px] border border-line bg-surface px-3 text-[13px] text-ink-2";

  return (
    <div className="flex flex-col gap-3 rounded-[3px] border border-line p-4.5">
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-bold">{tipologia?.nombre ?? "Tipología nueva"}</span>
        <div className="grow" />
        {tipologia && !protegido ? (
          <BotonAccion
            accion={eliminarTipologia.bind(null, id, tipologia.id)}
            confirmar={`¿Eliminar la tipología ${tipologia.nombre} con sus precios?`}
            className="h-8.5 rounded-[3px] border border-[#C9C1B6] px-3 text-[10px] font-bold tracking-[0.08em] text-alert-ink hover:bg-alert-soft"
          >
            ELIMINAR
          </BotonAccion>
        ) : null}
        {!tipologia && alCancelar ? (
          <button
            type="button"
            onClick={alCancelar}
            className="h-8.5 rounded-[3px] border border-[#C9C1B6] px-3 text-[10px] font-bold tracking-[0.08em]"
          >
            CANCELAR
          </button>
        ) : null}
      </div>

      <form action={accion} className="flex flex-col gap-4">
        {tipologia ? <input type="hidden" name="tipologiaId" value={tipologia.id} /> : null}
        <div className="grid grid-cols-2 gap-3 app:grid-cols-6">
          <div className="col-span-2">
            <CampoTexto id={`${prefijo}-nombre`} nombre="nombre" etiqueta="Nombre" valor={tipologia?.nombre} requerido placeholder="Departamento 2 habitaciones" />
          </div>
          <CampoTexto id={`${prefijo}-recamaras`} nombre="recamaras" etiqueta="Recámaras" valor={tipologia?.recamaras} inputMode="numeric" placeholder="—" />
          <CampoTexto id={`${prefijo}-banos`} nombre="banos" etiqueta="Baños" valor={tipologia?.banos} inputMode="decimal" placeholder="—" />
          <CampoTexto id={`${prefijo}-m2`} nombre="m2Construccion" etiqueta="m² totales" valor={tipologia?.m2Construccion} inputMode="decimal" placeholder="—" />
          <CampoTexto id={`${prefijo}-cajones`} nombre="estacionamientos" etiqueta="Cajones" valor={tipologia?.estacionamientos} inputMode="numeric" placeholder="—" />
        </div>
        {/* Lo que este formulario no edita viaja tal cual, para no borrarlo al guardar. */}
        <input type="hidden" name="m2Terreno" value={tipologia?.m2Terreno ?? ""} />
        <input type="hidden" name="planoUrl" value={tipologia?.planoUrl ?? ""} />

        <div className="flex flex-col">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.7fr_2rem] gap-2 rounded-t-[2px] bg-tan px-3 py-2 app:grid">
            {["NIVEL", "PRECIO DE VENTA", "PRECIO DE LISTA", "DISPONIBLES", ""].map((t, i) => (
              <span key={i} className="text-[9.5px] font-bold tracking-[0.12em] text-ink">
                {t}
              </span>
            ))}
          </div>
          {filas.map((f) => {
            const fija = protegido && f.existente;
            return (
              <div key={f.clave} className="grid grid-cols-2 items-end gap-2 border-b border-line px-3 py-3 app:grid-cols-[1.4fr_1fr_1fr_0.7fr_2rem] app:items-center app:py-2">
                <label className="col-span-2 flex flex-col gap-1 app:col-span-1"><span className="eyebrow app:hidden">Nivel</span><input name="nivelNombre" defaultValue={f.nombre} readOnly={fija} aria-label="Nivel" className={fija ? bloqueada : celda} /></label>
                <label className="flex flex-col gap-1"><span className="eyebrow app:hidden">Precio de venta</span><input name="nivelPrecio" defaultValue={f.precioVenta === null ? "" : money(f.precioVenta)} readOnly={fija} inputMode="decimal" placeholder="$0" aria-label="Precio de venta" className={fija ? bloqueada : celda} /></label>
                <label className="flex flex-col gap-1"><span className="eyebrow app:hidden">Precio de lista</span><input name="nivelLista" defaultValue={f.precioLista === null ? "" : money(f.precioLista)} readOnly={fija} inputMode="decimal" placeholder="igual a venta" aria-label="Precio de lista" className={fija ? bloqueada : celda} /></label>
                <label className="flex flex-col gap-1"><span className="eyebrow app:hidden">Disponibles</span><input name="nivelDisponibles" defaultValue={f.disponibles ?? ""} readOnly={fija} inputMode="numeric" placeholder="—" aria-label="Disponibles" className={fija ? bloqueada : celda} /></label>
                {fija ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    aria-label={`Quitar ${f.nombre}`}
                    onClick={() => setFilas((todas) => todas.filter((x) => x.clave !== f.clave))}
                    disabled={filas.length === 1}
                    className="flex size-11 items-center justify-center justify-self-end rounded-[3px] border border-line hover:border-alert disabled:opacity-30 app:size-8 app:justify-self-auto"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#96402F" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setFilas((todas) => [
                ...todas,
                { clave: siguiente(), nombre: "", precioVenta: null, precioLista: null, disponibles: null, existente: false },
              ])
            }
            className="h-9 rounded-[3px] border border-line bg-surface px-3.5 text-[10.5px] font-bold tracking-[0.08em] hover:border-[#C9C1B6]"
          >
            + NIVEL
          </button>
          {protegido && tipologia ? (
            <span className="text-[11px] text-muted">
              Precio y disponibilidad ya los ve el cliente:{" "}
              <Link href={`/propiedades/${id}/cambio`} className="font-semibold text-tan-deep underline">
                regístralos como cambio
              </Link>
              .
            </span>
          ) : null}
          <div className="grow" />
          <BotonGuardar className="h-10.5 px-5">{tipologia ? "GUARDAR TIPOLOGÍA" : "AGREGAR TIPOLOGÍA"}</BotonGuardar>
        </div>
        <AvisoAccion estado={estado} />
      </form>
    </div>
  );
}

export function PasoTipologias({ d, protegido }: { d: Desarrollo; protegido: boolean }) {
  const [nueva, setNueva] = useState(d.tipologias.length === 0);
  return (
    <div className="flex flex-col gap-4">
      {d.tipologias.map((t) => (
        <EditorTipologia key={t.id} id={d.id} tipologia={t} protegido={protegido} />
      ))}
      {nueva ? (
        <EditorTipologia
          key={`nueva:${d.tipologias.length}`}
          id={d.id}
          tipologia={null}
          protegido={false}
          alCancelar={d.tipologias.length ? () => setNueva(false) : undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => setNueva(true)}
          className="h-11 rounded-[3px] border border-dashed border-[#C9C1B6] text-[11px] font-bold tracking-[0.1em] text-ink-2 hover:border-ink hover:text-ink"
        >
          + AGREGAR TIPOLOGÍA
        </button>
      )}
    </div>
  );
}

// ── Paso 3 · Condiciones ─────────────────────────────────────────────────

export function PasoCondiciones({ d, protegido }: { d: Desarrollo; protegido: boolean }) {
  const [estado, accion] = useActionState(guardarCondiciones.bind(null, d.id), ESTADO_INICIAL);
  const c = d.condiciones;
  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoTexto
          nombre="enganchePct"
          etiqueta="Enganche %"
          valor={c.enganchePct}
          inputMode="decimal"
          bloqueado={protegido}
          ayuda={protegido ? <PorCambio id={d.id} campo="enganche" /> : "Porcentaje a la firma"}
        />
        <CampoTexto nombre="engancheNota" etiqueta="Cuándo se paga el enganche" valor={c.engancheNota} placeholder="A la firma de contrato" />
        <CampoTexto nombre="restoPct" etiqueta="Resto %" valor={c.restoPct} inputMode="decimal" />
        <CampoTexto nombre="restoNota" etiqueta="Cómo se paga el resto" valor={c.restoNota} ancho="col-span-2" placeholder="Crédito hipotecario a la escritura" />
        <CampoTexto nombre="mensualidades" etiqueta="Mensualidades" valor={c.mensualidades} placeholder="Ej. 12 sin intereses" />
        <CampoTexto
          nombre="promocionVigente"
          etiqueta="Promoción vigente"
          valor={c.promocionVigente}
          bloqueado={protegido}
          ayuda={protegido ? <PorCambio id={d.id} campo="promocion" /> : "Si no hay, escribe “Sin promoción”"}
          ancho="col-span-2"
        />
        <CampoTexto nombre="descuentoContado" etiqueta="Descuento por contado" valor={c.descuentoContado} placeholder="Ej. 8%" />
      </div>
      <CampoCasillas nombre="formasPago" etiqueta="Formas de pago" opciones={FORMAS_PAGO} elegidas={c.formasPago} />
      <AvisoAccion estado={estado} />
      <div className="flex justify-end">
        <BotonGuardar />
      </div>
    </form>
  );
}

// ── Paso 4 · Multimedia (la carga; la galería la pinta la página) ────────

export function FormMultimedia({ id, sinAlmacenamiento }: { id: string; sinAlmacenamiento: boolean }) {
  const [estado, accion] = useActionState(conSubidaDirecta(subirMultimedia.bind(null, id), "archivos", "multimedia", id), ESTADO_INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-3 rounded-[3px] border border-dashed border-[#C9C1B6] p-4.5">
      <div className="flex flex-col items-stretch gap-4 app:flex-row app:items-end">
        <CampoOpciones
          nombre="tipo"
          etiqueta="Qué es"
          valor="render"
          opciones={[
            { valor: "render", texto: "Render" },
            { valor: "foto", texto: "Foto" },
            { valor: "plano", texto: "Plano" },
            { valor: "video", texto: "Video" },
            { valor: "brochure", texto: "Brochure (PDF)" },
          ]}
        />
        <div className="flex min-w-0 grow flex-col gap-2">
          <label htmlFor="archivos" className="eyebrow">
            Archivos
          </label>
          <input
            id="archivos"
            name="archivos"
            type="file"
            multiple
            required
            disabled={sinAlmacenamiento}
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,application/pdf"
            className="h-11.5 rounded-[3px] border border-[#C9C1B6] bg-panel px-3 py-2.5 text-[12.5px] file:mr-3 file:rounded-[2px] file:border-0 file:bg-surface file:px-3 file:py-1 file:text-[11px] file:font-bold"
          />
        </div>
        <BotonGuardar className="h-11.5">SUBIR</BotonGuardar>
      </div>
      <span className="text-[10.5px] text-muted">
        {sinAlmacenamiento
          ? "El almacenamiento de archivos no está configurado todavía."
          : "JPG, PNG, WebP, MP4 o PDF, hasta 15 MB cada uno. Se agregan al final; reordénalos abajo."}
      </span>
      <AvisoAccion estado={estado} />
    </form>
  );
}

// ── Paso 5 · Comercial ───────────────────────────────────────────────────

export function PasoComercial({ d }: { d: Desarrollo }) {
  const [estado, accion] = useActionState(guardarComercial.bind(null, d.id), ESTADO_INICIAL);
  const c = d.comercial;
  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoArea nombre="buyerPersona" etiqueta="Buyer persona" valor={c.buyerPersona} filas={3} placeholder="Quién suele comprar aquí" />
        <CampoArea nombre="clienteIdeal" etiqueta="Cliente ideal" valor={c.clienteIdeal} filas={3} placeholder="A quién se lo ofrecemos primero" />
        <CampoArea nombre="argumentos" etiqueta="Argumentos de venta" valor={c.argumentos} ayuda="Uno por línea. Obligatorio para publicar." />
        <CampoArea nombre="objeciones" etiqueta="Objeciones frecuentes" valor={c.objeciones} ayuda="Una por línea, con la respuesta si la hay. Obligatorio para publicar." />
        <CampoArea nombre="diferenciadores" etiqueta="Diferenciadores" valor={c.diferenciadores} />
        <CampoArea nombre="comparables" etiqueta="Comparables" valor={c.comparables} ayuda="Desarrollos con los que el cliente lo va a comparar." />
        <CampoArea nombre="noDeberiaComprarlo" etiqueta="Qué cliente no debería comprarlo" valor={c.noDeberiaComprarlo} />
      </div>
      <span className="text-[11px] text-muted">
        Todo esto es del equipo: no viaja a fichas, propuestas ni al micrositio.
      </span>
      <AvisoAccion estado={estado} />
      <div className="flex justify-end">
        <BotonGuardar />
      </div>
    </form>
  );
}

// ── Paso 6 · Interna y legal ─────────────────────────────────────────────

export function PasoInterna({ d, esCorporativo }: { d: Desarrollo; esCorporativo: boolean }) {
  const [estado, accion] = useActionState(guardarInterna.bind(null, d.id), ESTADO_INICIAL);
  const i = d.interna;
  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoTexto nombre="contactoComercial" etiqueta="Contacto comercial" valor={i.contactoComercial} ancho="col-span-2" placeholder="Nombre · teléfono" />
        <CampoOpciones
          nombre="convenioFirmado"
          etiqueta="Convenio firmado"
          valor={i.convenioFirmado === null ? "" : i.convenioFirmado ? "si" : "no"}
          opciones={[
            { valor: "", texto: "Sin capturar" },
            { valor: "si", texto: "Sí" },
            { valor: "no", texto: "No" },
          ]}
        />
        <CampoOpciones
          nombre="dueDiligence"
          etiqueta="Due diligence"
          valor={i.dueDiligence}
          bloqueado={!esCorporativo}
          ayuda={esCorporativo ? "Validado es requisito para aprobar." : "Lo valida corporativo."}
          opciones={[
            { valor: "pendiente", texto: "Pendiente" },
            { valor: "en_proceso", texto: "En proceso" },
            { valor: "validado", texto: "Validado" },
          ]}
        />
        <div className="col-span-2 flex flex-col gap-2">
          <span className="eyebrow">Comisión autorizada</span>
          <div className="flex h-11.5 items-center gap-3 rounded-[3px] border border-line bg-surface px-3.5">
            <span className={`text-[13.5px] font-bold ${i.comisionPct === null ? "text-alert" : ""}`}>
              {i.comisionPct === null ? "[SIN CAPTURAR]" : `${i.comisionPct}%`}
            </span>
            <div className="grow" />
            <Link href={`/propiedades/${d.id}/cambio?campo=comision`} className="text-[11px] font-semibold text-tan-deep underline">
              {i.comisionPct === null ? "Capturar con su convenio" : "Registrar un cambio"}
            </Link>
          </div>
          <span className="text-[10.5px] text-muted">Siempre pasa por aprobación de un gerente o corporativo.</span>
        </div>
      </div>
      <CampoArea nombre="notasInternas" etiqueta="Notas internas" valor={i.notasInternas} filas={3} placeholder="Riesgos, acuerdos, lo que el equipo debe saber" />
      <AvisoAccion estado={estado} />
      <div className="flex justify-end">
        <BotonGuardar />
      </div>
    </form>
  );
}

const TIPOS_DOCUMENTO: FuenteTipo[] = ["convenio", "contrato", "lista_precios", "brochure", "correo", "otro"];

export function FormDocumento({ id, sinAlmacenamiento }: { id: string; sinAlmacenamiento: boolean }) {
  const [estado, accion] = useActionState(conSubidaDirecta(subirDocumento.bind(null, id), "archivo", "documento", id), ESTADO_INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-3 rounded-[3px] border border-dashed border-[#C9C1B6] p-4">
      <div className="grid grid-cols-1 items-end gap-3 app:grid-cols-[10rem_1fr_1fr_auto]">
        <CampoOpciones
          nombre="tipo"
          etiqueta="Tipo"
          valor="convenio"
          opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t, texto: etiquetaFuente[t] }))}
        />
        <CampoTexto nombre="nombre" etiqueta="Nombre" placeholder="Convenio comercial 2026" />
        <div className="flex flex-col gap-2">
          <label htmlFor="documento" className="eyebrow">
            Archivo
          </label>
          <input
            id="documento"
            name="archivo"
            type="file"
            required
            disabled={sinAlmacenamiento}
            accept="application/pdf,image/*,.eml"
            className="h-11.5 rounded-[3px] border border-[#C9C1B6] bg-panel px-3 py-2.5 text-[12px] file:mr-2 file:rounded-[2px] file:border-0 file:bg-surface file:px-2 file:py-1 file:text-[11px] file:font-bold"
          />
        </div>
        <BotonGuardar className="h-11.5 px-5">SUBIR</BotonGuardar>
      </div>
      <AvisoAccion estado={estado} />
    </form>
  );
}
