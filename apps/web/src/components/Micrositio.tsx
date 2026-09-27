"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { AccionDeInteres } from "@casacruz/core";
import { registrarInteres, registrarVista } from "@/lib/acciones/comercial";

/**
 * Lo que hace el micrositio cuando lo abre el cliente: contar la vista una vez
 * por visita y avisar al asesor cuando pide algo. Si quien mira es del equipo,
 * no se cuenta nada: la analítica es del cliente.
 */

export function RegistroVista({ slug, esEquipo }: { slug: string; esEquipo: boolean }) {
  useEffect(() => {
    if (esEquipo) return;
    const clave = `cc-vista:${slug}`;
    try {
      if (window.sessionStorage.getItem(clave)) return;
      window.sessionStorage.setItem(clave, "1");
    } catch {
      // Sin almacenamiento: se cuenta igual.
    }
    void registrarVista(slug);
  }, [slug, esEquipo]);
  return null;
}

export function BotonInteres({
  slug,
  accion,
  desarrolloId = null,
  esEquipo,
  className,
  children,
}: {
  slug: string;
  accion: AccionDeInteres;
  desarrolloId?: string | null;
  esEquipo: boolean;
  className: string;
  children: ReactNode;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={enviando}
        className={`${className} disabled:opacity-60`}
        onClick={() => {
          if (esEquipo) {
            setMensaje("Vista del equipo: el interés sólo se registra cuando lo pide el cliente.");
            return;
          }
          iniciar(async () => {
            const r = await registrarInteres(slug, accion, desarrolloId);
            if ("error" in r) {
              setMensaje(r.error);
            } else if (r.whatsapp) {
              window.location.href = r.whatsapp;
            } else {
              setMensaje(r.mensaje);
            }
          });
        }}
      >
        {enviando ? "AVISANDO A TU ASESOR…" : children}
      </button>
      {mensaje ? (
        <span role="status" className="text-[12px] leading-snug text-ink-2">
          {mensaje}
        </span>
      ) : null}
    </div>
  );
}
