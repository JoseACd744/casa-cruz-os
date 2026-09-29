"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icono, esActivo, nav, type UsuarioMenu } from "./Sidebar";

/**
 * Navegación del teléfono: barra inferior con lo que más se usa y una hoja
 * «Más» con el resto, las plazas y la cuenta. Desde md la reemplaza el menú lateral.
 */

const PRINCIPALES = nav.slice(0, 4);
const RESTO = nav.slice(4);

export function NavegacionMovil({ usuario }: { usuario: UsuarioMenu }) {
  const pathname = usePathname();
  const [abierta, setAbierta] = useState(false);
  const enResto = RESTO.some((item) => esActivo(pathname, item.href));

  useEffect(() => {
    if (!abierta) return;
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [abierta]);

  const base = "flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold";

  return (
    <div className="md:hidden print:hidden">
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#35322E] bg-ink pb-[env(safe-area-inset-bottom)] text-[#B8B1A7]"
      >
        {PRINCIPALES.map((item) => {
          const activo = esActivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo ? "page" : undefined}
              className={`${base} ${activo ? "text-white" : ""}`}
            >
              <Icono nombre={item.icon} color={activo ? "#A98D6F" : "#B8B1A7"} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={abierta}
          aria-haspopup="dialog"
          onClick={() => setAbierta(true)}
          className={`${base} ${enResto ? "text-white" : ""}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={enResto ? "#A98D6F" : "#B8B1A7"}>
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
          Más
        </button>
      </nav>

      {abierta ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setAbierta(false)}
            className="absolute inset-0 bg-black/55"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-4 overflow-auto rounded-t-[10px] bg-ink px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-ground">
            <span className="mx-auto h-1 w-10 rounded-full bg-[#4A463F]" aria-hidden />

            <div className="flex flex-col gap-0.5">
              {RESTO.map((item) => {
                const activo = esActivo(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAbierta(false)}
                    className={`flex h-12 items-center gap-3 rounded-[3px] px-3 text-[14px] ${
                      activo ? "border-l-2 border-tan bg-[#2E2C28] font-semibold text-white" : "font-medium text-[#B8B1A7]"
                    }`}
                  >
                    <Icono nombre={item.icon} color={activo ? "#A98D6F" : "#B8B1A7"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#35322E] pt-4">
              <span className="text-[9px] font-bold tracking-[0.22em] text-[#7D766C]">
                MIS PLAZAS CERTIFICADAS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {usuario.plazas.length ? (
                  usuario.plazas.map((p) => (
                    <span
                      key={p.nombre}
                      className={`rounded-[2px] border border-[#4A463F] px-[7px] py-1 text-[10px] font-semibold tracking-[0.06em] uppercase ${
                        p.certificada ? "" : "text-[#A09991]"
                      }`}
                    >
                      {p.nombre}
                      {p.certificada ? "" : " · en curso"}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-[#A09991]">Ninguna todavía</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#35322E] pt-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tan text-[12px] font-bold text-ink">
                {usuario.iniciales}
              </span>
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-white">{usuario.nombre}</span>
                <span className="text-[11px] text-[#A09991]">{usuario.rol}</span>
              </span>
              <Link
                href="/cuenta/contrasena"
                onClick={() => setAbierta(false)}
                className="flex h-10 items-center rounded-[3px] border border-[#4A463F] px-3 text-[11px] font-semibold"
              >
                Cambiar clave
              </Link>
              <a
                href="/salir"
                aria-label="Cerrar sesión"
                className="flex size-10 items-center justify-center rounded-[3px] border border-[#4A463F] text-[#B8B1A7]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
