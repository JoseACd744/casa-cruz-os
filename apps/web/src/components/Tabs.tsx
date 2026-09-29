"use client";

import { useState, type ReactNode } from "react";

export function Tabs({
  paneles,
  inicial,
}: {
  paneles: { id: string; label: string; contenido: ReactNode }[];
  inicial?: string;
}) {
  const [activo, setActivo] = useState(inicial ?? paneles[0]?.id);
  const panel = paneles.find((p) => p.id === activo) ?? paneles[0];

  return (
    <div className="flex flex-col gap-4.5">
      <div role="tablist" data-scroll-x className="flex gap-1 overflow-x-auto border-b border-line-strong">
        {paneles.map((p) => {
          const on = p.id === activo;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setActivo(p.id)}
              className={`h-11 shrink-0 border-b-2 px-4.5 text-[11px] whitespace-nowrap font-bold tracking-[0.1em] transition-colors ${
                on ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{panel?.contenido}</div>
    </div>
  );
}
