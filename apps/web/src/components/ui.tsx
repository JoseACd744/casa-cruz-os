import type { ReactNode } from "react";

type Tono = "neutral" | "ok" | "warn" | "alert" | "tan" | "dark";

const tonos: Record<Tono, string> = {
  neutral: "bg-surface text-ink-2 border-line",
  ok: "bg-ok-soft text-ok-ink border-ok/30",
  warn: "bg-warn-soft text-warn-ink border-warn/30",
  alert: "bg-alert-soft text-alert-ink border-alert/30",
  tan: "bg-tan-soft text-tan-deep border-tan",
  dark: "bg-ink text-white border-ink",
};

const puntos: Record<Tono, string> = {
  neutral: "bg-faint",
  ok: "bg-ok",
  warn: "bg-warn",
  alert: "bg-alert",
  tan: "bg-tan",
  dark: "bg-ink",
};

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag className={`rounded-card border border-line bg-panel ${className}`}>{children}</Tag>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}

export function Badge({
  children,
  tono = "neutral",
}: {
  children: ReactNode;
  tono?: Tono;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-2 py-[5px] text-[9.5px] font-bold tracking-[0.12em] uppercase ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tono = "neutral" }: { tono?: Tono }) {
  return <span className={`inline-block size-2 shrink-0 rounded-full ${puntos[tono]}`} />;
}

/** Dato que todavía no existe en la Base Maestra. */
export function Falta({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-alert">{children}</span>;
}

/** Marcador de imagen: el mockup no inventa fotos de desarrollos. */
export function Foto({
  label,
  className = "",
  dark = false,
}: {
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-[3px] ${dark ? "bg-ink" : "bg-placeholder"} ${className}`}
    >
      {label ? (
        <span
          className={`text-[9.5px] font-bold tracking-[0.22em] uppercase ${dark ? "text-ground" : "text-faint"}`}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function Barra({ valor, tono = "ok" }: { valor: number; tono?: Tono }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full ${puntos[tono]}`} style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />
    </div>
  );
}

export function Campo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      <span className="text-[15px] font-bold">{children}</span>
    </div>
  );
}

export function Seccion({
  titulo,
  accion,
  children,
  className = "",
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col gap-4 p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <Eyebrow>{titulo}</Eyebrow>
        <div className="grow" />
        {accion}
      </div>
      {children}
    </Card>
  );
}
