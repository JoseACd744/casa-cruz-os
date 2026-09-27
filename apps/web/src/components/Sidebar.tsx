"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/inicio", label: "Inicio", icon: "casa" },
  { href: "/propiedades", label: "Propiedades", icon: "edificio" },
  { href: "/propuestas", label: "Propuestas", icon: "documento" },
  { href: "/clientes", label: "Clientes", icon: "persona" },
  { href: "/capacitacion", label: "Capacitación", icon: "libro" },
  { href: "/control", label: "Control del dato", icon: "barras" },
  { href: "/preguntar", label: "Preguntar", icon: "chispa" },
] as const;

function Icono({ nombre, color }: { nombre: string; color: string }) {
  const props = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (nombre) {
    case "casa":
      return (
        <svg {...props}>
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "edificio":
      return (
        <svg {...props}>
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5" />
        </svg>
      );
    case "documento":
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
        </svg>
      );
    case "persona":
      return (
        <svg {...props}>
          <path d="M16 20v-2a4 4 0 0 0-8 0v2M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        </svg>
      );
    case "libro":
      return (
        <svg {...props}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5zM9 8h6M9 12h6" />
        </svg>
      );
    case "chispa":
      return (
        <svg {...props}>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
  }
}

export interface UsuarioMenu {
  nombre: string;
  iniciales: string;
  rol: string;
  plazas: { nombre: string; certificada: boolean }[];
}

export function Sidebar({ usuario }: { usuario: UsuarioMenu }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[236px] shrink-0 flex-col bg-ink px-4.5 py-6 text-ground print:hidden">
      <Link href="/inicio" className="flex items-center gap-3 px-1.5 pb-6">
        <span className="flex size-9 items-center justify-center border-[1.5px] border-ground text-[12px] font-bold">
          CC
        </span>
        <span className="flex flex-col gap-[3px]">
          <span className="text-[12px] font-bold tracking-[0.18em]">CASA CRUZ</span>
          <span className="text-[9.5px] font-semibold tracking-[0.3em] text-tan">OS</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {nav.map((item) => {
          const activo =
            pathname === item.href ||
            (item.href !== "/inicio" && pathname.startsWith(item.href.split("/").slice(0, 2).join("/")));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 items-center gap-3 rounded-[3px] px-3 text-[12.5px] transition-colors ${
                activo
                  ? "border-l-2 border-tan bg-[#2E2C28] font-semibold text-white"
                  : "font-medium text-[#B8B1A7] hover:bg-[#26241f] hover:text-white"
              }`}
            >
              <Icono nombre={item.icon} color={activo ? "#A98D6F" : "#B8B1A7"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="grow" />

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
            <span className="text-[10.5px] text-[#A09991]">Ninguna todavía</span>
          )}
        </div>
        <div className="flex items-center gap-2.5 pt-2">
          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-tan text-[11px] font-bold text-ink">
            {usuario.iniciales}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[12px] font-semibold text-white">{usuario.nombre}</span>
            <span className="text-[10px] text-[#A09991]">{usuario.rol}</span>
          </span>
          <div className="grow" />
          <a
            href="/salir"
            aria-label="Cerrar sesión"
            className="flex size-8 items-center justify-center rounded-[3px] text-[#A09991] hover:bg-[#2E2C28] hover:text-white"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </a>
        </div>
      </div>
    </aside>
  );
}
