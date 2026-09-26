"use client";

import Link from "next/link";
import { BotonSeleccion, useSeleccion } from "@/components/Seleccion";
import { Badge, Dot, Foto } from "@/components/ui";

export interface VistaPropiedad {
  id: string;
  nombre: string;
  foto: string | null;
  zona: string;
  estatus: string;
  precio: string;
  precioFalta: boolean;
  recamaras: string;
  banos: string;
  m2: string;
  confiabilidad: number;
  tono: "ok" | "warn" | "alert";
  actualizado: string;
}

export function TarjetaPropiedad({ p }: { p: VistaPropiedad }) {
  const { tiene, listo } = useSeleccion();
  const activa = listo && tiene(p.id);

  return (
    <article
      className={`overflow-hidden rounded-card bg-panel transition-shadow ${
        activa ? "border-2 border-ink" : "border border-line hover:shadow-sm"
      }`}
    >
      <div className="relative">
        <Foto src={p.foto} className="h-37 w-full rounded-none" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <Badge>{p.estatus}</Badge>
          <BotonSeleccion id={p.id} />
        </div>
      </div>

      <div className="flex flex-col p-4">
        <Link
          href={`/propiedades/${p.id}`}
          className="text-[16px] font-bold tracking-[0.01em] hover:text-tan-deep"
        >
          {p.nombre}
        </Link>
        <span className="pt-1.5 text-[11px] font-medium tracking-[0.06em] text-muted uppercase">
          {p.zona}
        </span>

        <div className="flex items-baseline gap-1.5 pt-3">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-muted">DESDE</span>
          <span
            className={
              p.precioFalta
                ? "text-[15px] font-bold text-alert"
                : "text-[21px] font-bold tracking-[-0.01em]"
            }
          >
            {p.precio}
          </span>
        </div>

        <div className="flex gap-3.5 pt-2.5 text-[11.5px] text-ink-2">
          <span>{p.recamaras} rec</span>
          <span>{p.banos} baños</span>
          <span>{p.m2}</span>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <Dot tono={p.tono} />
          <span className="text-[10.5px] font-semibold text-ink-2">
            {p.confiabilidad}% confiabilidad
          </span>
          <div className="grow" />
          <span className="text-[10.5px] text-muted">{p.actualizado}</span>
        </div>
      </div>
    </article>
  );
}
