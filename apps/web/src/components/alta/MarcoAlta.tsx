import Link from "next/link";
import type { ReactNode } from "react";
import { etiquetaEstatus, PASOS_ALTA, type EstadoSeccion, type EstatusListing } from "@casacruz/core";
import { Card } from "@/components/ui";

/**
 * Marco común del alta y la edición: la barra de pasos arriba, el formulario del
 * paso a la izquierda y el estado del desarrollo a la derecha.
 */
export function MarcoAlta({
  titulo,
  volver,
  estatus,
  paso,
  secciones,
  base,
  columna,
  children,
}: {
  titulo: string;
  volver: { href: string; texto: string };
  estatus: EstatusListing;
  paso: number;
  /** Null mientras el desarrollo no existe: los pasos siguientes no se pueden abrir. */
  secciones: EstadoSeccion[] | null;
  /** URL del editor; los pasos agregan ?paso=N. */
  base: string | null;
  columna: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex h-15 shrink-0 items-center gap-3.5 border-b border-line bg-panel px-8">
        <Link
          href={volver.href}
          className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-ink-2 uppercase hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          {volver.texto}
        </Link>
        <span className="text-[11.5px] text-faint">/</span>
        <span className="text-[11.5px] font-semibold tracking-[0.06em] uppercase">{titulo}</span>
        <div className="grow" />
        <span className="rounded-[2px] border border-line bg-surface px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-ink-2 uppercase">
          {etiquetaEstatus[estatus]}
        </span>
      </header>

      <div className="flex flex-col gap-5 overflow-auto p-7">
        <Card className="flex gap-2.5 px-5.5 py-4.5">
          {PASOS_ALTA.map((p, i) => {
            const n = i + 1;
            const seccion = secciones?.find((s) => s.seccion === p.seccion);
            const actual = n === paso;
            const completo = seccion ? seccion.faltan.length === 0 : false;
            const estado = actual
              ? "En captura"
              : !seccion
                ? "Pendiente"
                : completo
                  ? "Completo"
                  : `Faltan ${seccion.faltan.length}`;
            const contenido = (
              <>
                <span
                  className={`flex size-6.5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    actual || completo ? "bg-ink text-white" : "bg-[#EFEAE2] text-muted"
                  }`}
                >
                  {n}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className={`text-[12px] ${actual ? "font-bold" : "font-semibold"}`}>{p.nombre}</span>
                  <span className="text-[10px] text-muted">{estado}</span>
                </span>
              </>
            );
            const estilo = `flex grow items-center gap-3 rounded-[3px] border p-3.5 ${
              actual ? "border-tan bg-tan-soft" : "border-transparent"
            }`;
            return base ? (
              <Link key={p.seccion} href={`${base}?paso=${n}`} className={`${estilo} hover:border-line`}>
                {contenido}
              </Link>
            ) : (
              <div key={p.seccion} className={`${estilo} ${actual ? "" : "opacity-60"}`}>
                {contenido}
              </div>
            );
          })}
        </Card>

        <div className="flex items-start gap-5">
          <Card className="flex w-235 shrink-0 flex-col gap-5 p-6">{children}</Card>
          <div className="flex grow flex-col gap-5">{columna}</div>
        </div>
      </div>
    </>
  );
}

/** Encabezado del paso dentro de la tarjeta. */
export function TituloPaso({ paso, titulo, detalle }: { paso: number; titulo: string; detalle?: ReactNode }) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold tracking-[0.16em] text-tan-deep">PASO {paso} DE 6</span>
        <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">{titulo}</h1>
      </div>
      <div className="grow" />
      {detalle ? <span className="text-[11.5px] text-muted">{detalle}</span> : null}
    </div>
  );
}

/** Anterior y siguiente, al pie de cada paso. */
export function NavegacionPasos({ base, paso }: { base: string; paso: number }) {
  const anterior = PASOS_ALTA[paso - 2];
  const siguiente = PASOS_ALTA[paso];
  const estilo =
    "flex h-12 items-center gap-2.5 rounded-[3px] border border-[#C9C1B6] px-5 text-[11px] font-bold tracking-[0.08em] hover:bg-surface";
  return (
    <div className="flex items-center gap-3 border-t border-line pt-5">
      {anterior ? (
        <Link href={`${base}?paso=${paso - 1}`} className={estilo}>
          ANTERIOR: {anterior.nombre.toUpperCase()}
        </Link>
      ) : null}
      <div className="grow" />
      {siguiente ? (
        <Link href={`${base}?paso=${paso + 1}`} className={estilo}>
          SIGUIENTE: {siguiente.nombre.toUpperCase()}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      ) : null}
    </div>
  );
}
