"use client";

import { useActionState, type ReactNode } from "react";
import { ESTADO_INICIAL, type EstadoAccion } from "@/lib/acciones/tipos";

/**
 * Un botón que ejecuta un server action y muestra su error en el lugar. Sirve
 * para aprobar, rechazar, confirmar, publicar: acciones de un solo clic.
 */
export function BotonAccion({
  accion,
  children,
  className = "",
  enCurso = "…",
  confirmar,
  bloque = false,
}: {
  accion: (previo: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  children: ReactNode;
  className?: string;
  enCurso?: string;
  /** Pregunta antes de ejecutar, para lo que no tiene vuelta atrás. */
  confirmar?: string;
  /** Ocupa todo el ancho en lugar de alinearse a la derecha. */
  bloque?: boolean;
}) {
  const [estado, ejecutar, pendiente] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form
      action={ejecutar}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      className={`flex flex-col gap-1 ${bloque ? "items-stretch" : "items-end"}`}
    >
      <button type="submit" disabled={pendiente} className={`${className} disabled:opacity-50`}>
        {pendiente ? enCurso : children}
      </button>
      {estado.error ? (
        <span role="alert" className="max-w-72 text-right text-[10.5px] leading-snug text-alert-ink">
          {estado.error}
        </span>
      ) : null}
    </form>
  );
}
