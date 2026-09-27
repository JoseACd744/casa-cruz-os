"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AvisoAccion, BotonGuardar } from "@/components/formulario";
import { cambiarMiClave } from "@/lib/acciones/equipo";
import { ESTADO_INICIAL } from "@/lib/acciones/tipos";

export function FormClave({ temporal, largoMinimo }: { temporal: boolean; largoMinimo: number }) {
  const [estado, accion] = useActionState(cambiarMiClave, ESTADO_INICIAL);
  const campo = "h-12.5 rounded-[3px] border border-[#C9C1B6] bg-panel px-4 text-[14px]";
  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="actual" className="eyebrow">
          {temporal ? "Clave temporal" : "Clave actual"}
        </label>
        <input id="actual" name="actual" type="password" required autoComplete="current-password" className={campo} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="nueva" className="eyebrow">
          Clave nueva
        </label>
        <input
          id="nueva"
          name="nueva"
          type="password"
          required
          minLength={largoMinimo}
          autoComplete="new-password"
          className={campo}
        />
        <span className="text-[11px] text-muted">
          Al menos {largoMinimo} caracteres, con letras y números. Sin tu nombre ni tu correo.
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmacion" className="eyebrow">
          Repite la clave nueva
        </label>
        <input id="confirmacion" name="confirmacion" type="password" required autoComplete="new-password" className={campo} />
      </div>
      <AvisoAccion estado={estado} />
      <BotonGuardar className="h-13.5 justify-center">GUARDAR MI CLAVE</BotonGuardar>
      <Link href={temporal ? "/salir" : "/inicio"} className="text-center text-[12px]">
        {temporal ? "Salir" : "Cancelar"}
      </Link>
    </form>
  );
}
