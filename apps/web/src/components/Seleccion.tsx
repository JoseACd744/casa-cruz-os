"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const CLAVE = "cc-os:seleccion";
const SEMILLA = ["playa-park", "real-aurora"];
const VACIO: string[] = [];

/**
 * La selección vive fuera de React (localStorage) para que sobreviva a la
 * navegación entre pantallas y a un refresh, sin efectos de hidratación.
 */
const almacen = {
  cache: null as string[] | null,
  oyentes: new Set<() => void>(),
  leer(): string[] {
    if (almacen.cache === null) {
      try {
        const guardado = window.localStorage.getItem(CLAVE);
        almacen.cache = guardado ? (JSON.parse(guardado) as string[]) : SEMILLA;
      } catch {
        almacen.cache = SEMILLA;
      }
    }
    return almacen.cache;
  },
  escribir(siguiente: string[]) {
    almacen.cache = siguiente;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(siguiente));
    } catch {
      // Sin almacenamiento disponible: la selección vive sólo en memoria.
    }
    almacen.oyentes.forEach((o) => o());
  },
  suscribir(oyente: () => void) {
    almacen.oyentes.add(oyente);
    return () => {
      almacen.oyentes.delete(oyente);
    };
  },
};

interface Ctx {
  ids: string[];
  listo: boolean;
  tiene: (id: string) => boolean;
  alternar: (id: string) => void;
  quitar: (id: string) => void;
  limpiar: () => void;
}

const SeleccionCtx = createContext<Ctx | null>(null);

export function SeleccionProvider({ children }: { children: ReactNode }) {
  const ids = useSyncExternalStore(almacen.suscribir, almacen.leer, () => VACIO);
  const listo = useSyncExternalStore(
    almacen.suscribir,
    () => true,
    () => false,
  );

  const alternar = useCallback((id: string) => {
    const actual = almacen.leer();
    almacen.escribir(actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]);
  }, []);

  const quitar = useCallback((id: string) => {
    almacen.escribir(almacen.leer().filter((x) => x !== id));
  }, []);

  const limpiar = useCallback(() => almacen.escribir([]), []);

  const valor = useMemo<Ctx>(
    () => ({ ids, listo, tiene: (id) => ids.includes(id), alternar, quitar, limpiar }),
    [ids, listo, alternar, quitar, limpiar],
  );

  return <SeleccionCtx.Provider value={valor}>{children}</SeleccionCtx.Provider>;
}

export function useSeleccion() {
  const ctx = useContext(SeleccionCtx);
  if (!ctx) throw new Error("useSeleccion debe usarse dentro de SeleccionProvider");
  return ctx;
}

export function BotonSeleccion({ id }: { id: string }) {
  const { tiene, alternar, listo } = useSeleccion();
  const activo = listo && tiene(id);
  return (
    <button
      type="button"
      onClick={() => alternar(id)}
      aria-pressed={activo}
      aria-label={activo ? "Quitar de la propuesta" : "Agregar a la propuesta"}
      className={`flex size-7 items-center justify-center rounded-[3px] border transition-colors ${
        activo ? "border-ink bg-ink" : "border-[#C9C1B6] bg-panel hover:border-ink"
      }`}
    >
      {activo ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2">
          <path d="M4 12.5l5.5 5.5L20 7" />
        </svg>
      ) : null}
    </button>
  );
}

export function BarraSeleccion({ catalogo }: { catalogo: { id: string; nombre: string }[] }) {
  const { ids, listo } = useSeleccion();
  if (!listo) return null;

  const nombres = ids
    .map((id) => catalogo.find((c) => c.id === id)?.nombre)
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="flex h-19 shrink-0 items-center gap-4 bg-ink px-8">
      <span className="text-[12px] font-semibold text-white">
        {ids.length} {ids.length === 1 ? "propiedad seleccionada" : "propiedades seleccionadas"}
      </span>
      <span className="text-[11.5px] text-[#A09991]">{nombres}</span>
      <div className="grow" />
      <Link
        href="/comparar"
        className="flex h-10.5 items-center rounded-[3px] border border-[#55504A] px-4 text-[11px] font-bold tracking-[0.1em] text-ground hover:bg-[#2E2C28]"
      >
        COMPARAR
      </Link>
      <Link
        href="/propuestas/nueva"
        className="flex h-10.5 items-center gap-2.5 rounded-[3px] bg-tan px-5 text-[11px] font-bold tracking-[0.1em] text-ink hover:brightness-105"
      >
        GENERAR PROPUESTA
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1C1B19" strokeWidth="2">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}
