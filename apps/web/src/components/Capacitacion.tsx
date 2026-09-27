"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { fechaDocumento, type PreguntaPublica } from "@casacruz/core";
import { AvisoAccion, BotonGuardar, CampoCasillas } from "@/components/formulario";
import { guardarPreparacion, presentarEvaluacion, type ResultadoEvaluacion } from "@/lib/acciones/capacitacion";
import { ESTADO_INICIAL } from "@/lib/acciones/tipos";

/** Lo que conviene revisar antes de presentar un desarrollo, marcado por cada cerrador. */
export function ListaPreparacion({
  desarrolloId,
  lista,
  hechos,
}: {
  desarrolloId: string;
  lista: { clave: string; texto: string }[];
  hechos: string[];
}) {
  const [estado, accion] = useActionState(guardarPreparacion.bind(null, desarrolloId), ESTADO_INICIAL);
  return (
    <form action={accion} className="flex flex-col gap-3.5">
      <CampoCasillas
        nombre="items"
        etiqueta="Marca lo que ya hiciste"
        opciones={lista.map((i) => ({ valor: i.clave, texto: i.texto }))}
        elegidas={hechos}
      />
      <AvisoAccion estado={estado} />
      <div className="flex justify-end">
        <BotonGuardar className="h-10 px-4">GUARDAR</BotonGuardar>
      </div>
    </form>
  );
}

/** La evaluación: se califica en el servidor y, si se aprueba, certifica. */
export function Evaluacion({
  plazaId,
  plaza,
  preguntas,
}: {
  plazaId: string;
  plaza: string;
  preguntas: PreguntaPublica[];
}) {
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<ResultadoEvaluacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const completas = preguntas.every((p) => respuestas[p.id] !== undefined);

  if (resultado) {
    return resultado.aprobado ? (
      <div className="flex flex-col gap-4 rounded-card border border-ok/30 bg-ok-soft p-6">
        <span className="text-[11px] font-bold tracking-[0.16em] text-ok-ink">APROBADA</span>
        <h2 className="text-[24px] font-extrabold">Ya estás certificado en {plaza}</h2>
        <p className="text-[13px] leading-relaxed text-ink-2">
          {resultado.aciertos} de {resultado.total} respuestas correctas. Desde ahora puedes proponer
          sus desarrollos
          {resultado.certificadoHasta
            ? `; la certificación vence el ${fechaDocumento(new Date(resultado.certificadoHasta))}`
            : ""}
          .
        </p>
        <div className="flex gap-3">
          <Link href="/propiedades" className="flex h-11 items-center rounded-[3px] bg-ink px-5 text-[11px] font-bold tracking-[0.1em] text-white">
            IR AL INVENTARIO
          </Link>
          <Link href="/capacitacion" className="flex h-11 items-center rounded-[3px] border border-[#C9C1B6] px-5 text-[11px] font-bold tracking-[0.1em]">
            VOLVER A CAPACITACIÓN
          </Link>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-4 rounded-card border border-warn/40 bg-warn-soft p-6">
        <span className="text-[11px] font-bold tracking-[0.16em] text-warn-ink">TODAVÍA NO</span>
        <h2 className="text-[22px] font-extrabold">
          {resultado.aciertos} de {resultado.total}: necesitas 80 %
        </h2>
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Repasa estos temas</span>
          {resultado.fallidas.map((f) => (
            <span key={f} className="text-[12.5px] leading-relaxed">
              · {f}
            </span>
          ))}
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              setResultado(null);
              setRespuestas({});
            }}
            className="h-11 rounded-[3px] bg-ink px-5 text-[11px] font-bold tracking-[0.1em] text-white"
          >
            INTENTAR DE NUEVO
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        iniciar(async () => {
          const r = await presentarEvaluacion(plazaId, respuestas);
          if ("error" in r) setError(r.error);
          else setResultado(r);
        });
      }}
      className="flex flex-col gap-4"
    >
      {preguntas.map((p, i) => (
        <fieldset key={p.id} className="flex flex-col gap-2.5 rounded-[3px] border border-line bg-panel p-4.5">
          <legend className="sr-only">Pregunta {i + 1}</legend>
          <span className="text-[13.5px] font-bold">
            {i + 1}. {p.texto}
          </span>
          {p.opciones.map((o, j) => (
            <label
              key={j}
              className="flex cursor-pointer items-start gap-2.5 rounded-[3px] px-2 py-1.5 text-[12.5px] has-checked:bg-tan-soft"
            >
              <input
                type="radio"
                name={p.id}
                checked={respuestas[p.id] === j}
                onChange={() => setRespuestas((prev) => ({ ...prev, [p.id]: j }))}
                className="mt-0.5 accent-[#1C1B19]"
              />
              {o}
            </label>
          ))}
        </fieldset>
      ))}
      {error ? (
        <div role="alert" className="rounded-[3px] border border-alert/40 bg-alert-soft px-4 py-3 text-[12.5px] font-semibold text-alert-ink">
          {error}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <span className="text-[11.5px] text-muted">
          {Object.keys(respuestas).length} de {preguntas.length} respondidas · se aprueba con 80 %
        </span>
        <div className="grow" />
        <button
          type="submit"
          disabled={!completas || enviando}
          className="flex h-12 items-center rounded-[3px] bg-ink px-6 text-[11px] font-bold tracking-[0.1em] text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "CALIFICANDO…" : "ENTREGAR EVALUACIÓN"}
        </button>
      </div>
    </form>
  );
}
