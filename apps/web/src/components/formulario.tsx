"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { EstadoAccion } from "@/lib/acciones/tipos";

/**
 * Piezas de formulario del portal. Un campo vacío se marca en rojo: es lo que
 * falta capturar, no un error.
 */

const base = "rounded-[3px] border px-3.5 text-[13.5px]";

function clases(falta: boolean, bloqueado: boolean) {
  if (bloqueado) return `${base} border-line bg-surface text-ink-2`;
  return `${base} ${falta ? "border-alert/60 bg-alert-soft/30" : "border-[#C9C1B6] bg-panel"}`;
}

export function CampoTexto({
  id,
  nombre,
  etiqueta,
  valor,
  ayuda,
  bloqueado = false,
  requerido = false,
  tipo = "text",
  inputMode,
  placeholder = "Sin capturar",
  ancho = "",
}: {
  /** Por omisión, el nombre del campo. */
  id?: string;
  nombre: string;
  etiqueta: string;
  valor?: string | number | null;
  ayuda?: ReactNode;
  bloqueado?: boolean;
  requerido?: boolean;
  tipo?: "text" | "email" | "tel";
  inputMode?: "decimal" | "numeric" | "text";
  placeholder?: string;
  ancho?: string;
}) {
  const vacio = valor === null || valor === undefined || valor === "";
  const idCampo = id ?? nombre;
  return (
    <div className={`flex flex-col gap-2 ${ancho}`}>
      <label htmlFor={idCampo} className="eyebrow">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        name={bloqueado ? undefined : nombre}
        type={tipo}
        inputMode={inputMode}
        defaultValue={vacio ? "" : String(valor)}
        placeholder={placeholder}
        readOnly={bloqueado}
        required={requerido}
        className={`h-11.5 ${clases(vacio, bloqueado)}`}
      />
      {ayuda ? <span className="text-[10.5px] leading-snug text-muted">{ayuda}</span> : null}
    </div>
  );
}

export function CampoArea({
  nombre,
  etiqueta,
  valor,
  ayuda,
  filas = 4,
  placeholder = "Una por línea",
}: {
  nombre: string;
  etiqueta: string;
  valor?: string | string[] | null;
  ayuda?: ReactNode;
  filas?: number;
  placeholder?: string;
}) {
  const texto = Array.isArray(valor) ? valor.join("\n") : (valor ?? "");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={nombre} className="eyebrow">
        {etiqueta}
      </label>
      <textarea
        id={nombre}
        name={nombre}
        rows={filas}
        defaultValue={texto}
        placeholder={placeholder}
        className={`py-2.5 leading-relaxed ${clases(!texto, false)}`}
      />
      {ayuda ? <span className="text-[10.5px] leading-snug text-muted">{ayuda}</span> : null}
    </div>
  );
}

export function CampoOpciones({
  nombre,
  etiqueta,
  valor,
  opciones,
  bloqueado = false,
  ayuda,
}: {
  nombre: string;
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  bloqueado?: boolean;
  ayuda?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={nombre} className="eyebrow">
        {etiqueta}
      </label>
      <select
        id={nombre}
        name={bloqueado ? undefined : nombre}
        defaultValue={valor}
        disabled={bloqueado}
        className={`h-11.5 font-semibold ${clases(valor === "", bloqueado)}`}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {ayuda ? <span className="text-[10.5px] leading-snug text-muted">{ayuda}</span> : null}
    </div>
  );
}

/** Casillas con el mismo nombre: el server action las lee con getAll. */
export function CampoCasillas({
  nombre,
  etiqueta,
  opciones,
  elegidas,
}: {
  nombre: string;
  etiqueta: string;
  opciones: string[];
  elegidas: string[];
}) {
  const todas = [...new Set([...opciones, ...elegidas])];
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="eyebrow pb-2.5">{etiqueta}</legend>
      <div className="flex flex-wrap gap-2.5">
        {todas.map((o) => (
          <label
            key={o}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[12px] font-semibold text-ink-2 has-checked:border-tan has-checked:bg-tan-soft has-checked:text-tan-deep"
          >
            <input type="checkbox" name={nombre} value={o} defaultChecked={elegidas.includes(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BotonGuardar({ children = "GUARDAR", className = "" }: { children?: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex h-12 items-center gap-2.5 rounded-[3px] bg-ink px-6 text-[11px] font-bold tracking-[0.1em] text-white hover:brightness-125 disabled:opacity-50 ${className}`}
    >
      {pending ? "GUARDANDO…" : children}
    </button>
  );
}

/** Lo que respondió el servidor, en el lugar donde se guardó. */
export function AvisoAccion({ estado }: { estado: EstadoAccion }) {
  if (estado.error) {
    return (
      <div
        role="alert"
        className="rounded-[3px] border border-alert/40 bg-alert-soft px-4 py-3 text-[12.5px] font-semibold whitespace-pre-line text-alert-ink"
      >
        {estado.error}
      </div>
    );
  }
  if (estado.ok) {
    return (
      <div role="status" className="rounded-[3px] border border-ok/30 bg-ok-soft px-4 py-3 text-[12.5px] font-semibold text-ok-ink">
        {estado.ok}
      </div>
    );
  }
  return null;
}
