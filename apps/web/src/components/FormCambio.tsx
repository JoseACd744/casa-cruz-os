"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Eyebrow } from "@/components/ui";
import { etiquetaFuente, fuenteAdmiteEvidencia } from "@casacruz/core";
import type { FuenteTipo } from "@casacruz/core";

/** Campos que nunca se publican sin que un gerente los valide. */
const CAMPOS_SENSIBLES = ["comision", "entrega", "esquema"] as const;

const CAMPOS = [
  { id: "precio", label: "Precio comercial", valorActual: "$3,450,000" },
  { id: "disponibilidad", label: "Disponibilidad", valorActual: "[SIN CAPTURAR]" },
  { id: "promocion", label: "Promoción vigente", valorActual: "[SIN CAPTURAR]" },
  { id: "entrega", label: "Fecha contractual de entrega", valorActual: "Marzo 2027" },
  { id: "comision", label: "Comisión autorizada", valorActual: "[ % ]" },
] as const;

const FUENTES: FuenteTipo[] = [
  "lista_precios",
  "brochure",
  "correo",
  "whatsapp",
  "convenio",
  "contrato",
  "llamada",
  "otro",
];

export function FormCambio({
  desarrolloId,
  desarrolloNombre,
  usuario,
}: {
  desarrolloId: string;
  desarrolloNombre: string;
  usuario: string;
}) {
  const router = useRouter();
  const [campo, setCampo] = useState<string>("precio");
  const [valor, setValor] = useState("$3,500,000");
  const [fuente, setFuente] = useState<FuenteTipo>("lista_precios");
  const [nota, setNota] = useState("Aplica sólo a planta baja; los demás niveles no cambiaron.");

  const def = CAMPOS.find((c) => c.id === campo)!;
  const conEvidencia = fuenteAdmiteEvidencia[fuente];
  const esSensible = (CAMPOS_SENSIBLES as readonly string[]).includes(campo);
  const requiereAprobacion = esSensible || !conEvidencia;

  return (
    <div className="flex justify-center overflow-auto p-8">
      <Card className="flex w-215 flex-col gap-5 p-7">
        <div className="flex items-start gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-[0.16em] text-tan-deep uppercase">
              {desarrolloNombre}
            </span>
            <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">Registrar un cambio</h1>
          </div>
          <div className="grow" />
          <Link
            href={`/propiedades/${desarrolloId}`}
            aria-label="Cerrar"
            className="flex size-8.5 items-center justify-center rounded-[3px] border border-line hover:bg-surface"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A453F" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          <Eyebrow>Qué vas a cambiar</Eyebrow>
          <div className="flex flex-wrap gap-2.5">
            {CAMPOS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCampo(c.id)}
                className={`h-9.5 rounded-full border px-3.5 text-[12px] font-semibold ${
                  campo === c.id ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-2"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-5">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Valor actual</Eyebrow>
            <span className="text-[20px] font-semibold text-muted line-through">
              {def.valorActual}
            </span>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A98D6F" strokeWidth="2" className="mb-2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <div className="flex grow flex-col gap-1.5">
            <label htmlFor="nuevo" className="eyebrow">
              Nuevo valor
            </label>
            <input
              id="nuevo"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="h-12.5 rounded-[3px] border border-ink px-4 text-[18px] font-bold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vigencia" className="eyebrow">
              Vigente desde
            </label>
            <input
              id="vigencia"
              defaultValue="18 / 09 / 2026"
              className="h-12.5 w-40 rounded-[3px] border border-[#C9C1B6] px-4 text-[13.5px]"
            />
          </div>
        </div>

        <div className="h-px bg-line" />

        <div className="flex flex-col gap-2.5">
          <span className="text-[12.5px] font-bold">¿De dónde salió esta información?</span>
          <div className="flex flex-wrap gap-2.5">
            {FUENTES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFuente(f)}
                className={`h-9.5 rounded-full border px-3.5 text-[12px] font-semibold ${
                  fuente === f ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-2"
                }`}
              >
                {etiquetaFuente[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Eyebrow>Evidencia</Eyebrow>
          <div
            className={`flex items-center gap-3 rounded-[3px] p-3.5 ${
              conEvidencia ? "border border-line bg-panel" : "border border-dashed border-alert/60 bg-alert-soft/40"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B563E" strokeWidth="1.7">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
            </svg>
            <span className="grow text-[12.5px] font-semibold">
              {conEvidencia
                ? "lista-precios-playa-park-sep-2026.pdf · 1.4 MB"
                : "Sin evidencia adjunta — se recomienda captura, correo o documento"}
            </span>
            <button className="h-8.5 rounded-[3px] border border-line bg-surface px-3.5 text-[10.5px] font-bold tracking-[0.06em]">
              ADJUNTAR
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="nota" className="eyebrow">
            Comentario (opcional)
          </label>
          <input
            id="nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="h-11.5 rounded-[3px] border border-[#C9C1B6] px-3.5 text-[13px]"
          />
        </div>

        <div
          className={`flex items-start gap-3 rounded-[3px] border p-3.5 ${
            requiereAprobacion ? "border-warn/40 bg-warn-soft" : "border-ok/30 bg-ok-soft"
          }`}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke={requiereAprobacion ? "#9A6B22" : "#2C4F38"}
            strokeWidth="1.8"
            className="mt-0.5 shrink-0"
          >
            <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.9 17a1.5 1.5 0 0 0 1.3 2.2h15.6a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
          </svg>
          <span className="text-[11.5px] leading-relaxed">
            {esSensible
              ? `“${def.label}” es un campo sensible: el cambio queda PENDIENTE DE APROBACIÓN hasta que un gerente o corporativo lo valide. Mientras tanto, el cliente sigue viendo el valor anterior.`
              : conEvidencia
                ? "Este es un cambio libre para cerradores certificados: se publica de inmediato, queda registrado a tu nombre y el valor anterior se conserva en el historial."
                : "Sin documento de respaldo, el cambio queda PENDIENTE DE APROBACIÓN hasta que un gerente lo valide."}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted">
            Se guardará a nombre de {usuario} · 18 sep 2026, 12:43
          </span>
          <div className="grow" />
          <Link
            href={`/propiedades/${desarrolloId}`}
            className="flex h-11.5 items-center rounded-[3px] border border-[#C9C1B6] px-5 text-[11px] font-bold tracking-[0.08em]"
          >
            CANCELAR
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/propiedades/${desarrolloId}?tab=trazabilidad`)}
            className="flex h-11.5 items-center rounded-[3px] bg-ink px-6 text-[11px] font-bold tracking-[0.1em] text-white hover:brightness-125"
          >
            {requiereAprobacion ? "ENVIAR A APROBACIÓN" : "GUARDAR Y PUBLICAR"}
          </button>
        </div>
      </Card>
    </div>
  );
}
