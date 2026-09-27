import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { moneyCorto } from "@casacruz/core";
import {
  listarClientes,
  listarPropuestas,
  listarUsuarios,
  obtenerIntegraciones,
  obtenerUsuarioActual,
} from "@/lib/repo";

const tonoEtapa: Record<string, "ok" | "warn" | "alert" | "neutral"> = {
  "Propuesta enviada": "warn",
  Calificado: "ok",
  "Sin respuesta": "alert",
};

export default async function ClientesPage() {
  const [clientes, propuestas, integraciones, actual, equipo] = await Promise.all([
    listarClientes(),
    listarPropuestas(),
    obtenerIntegraciones(),
    obtenerUsuarioActual(),
    listarUsuarios(),
  ]);
  const responsable = (id: string | null) =>
    id === actual.id ? "Tú" : (equipo.find((u) => u.id === id)?.nombre ?? null);

  return (
    <div className="flex flex-col gap-5 overflow-auto p-8">
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[30px] font-extrabold tracking-[-0.015em]">Clientes</h1>
          <p className="text-[13px] text-ink-2">
            Los leads y su etapa vienen de Kommo. Casa Cruz OS guarda lo que buscan y lo que ya se
            les presentó.
          </p>
        </div>
        <div className="grow" />
        <span className="flex items-center gap-2 rounded-[3px] border border-line bg-panel px-3.5 py-2.5 text-[11px] font-semibold text-ink-2">
          <span className={`size-1.75 rounded-full ${integraciones.kommo ? "bg-ok" : "bg-faint"}`} />
          {integraciones.kommo ? "Conectado con Kommo" : "Kommo sin conectar: los clientes se capturan aquí"}
        </span>
        <Link
          href="/clientes/nuevo"
          className="flex h-11.5 items-center gap-2.5 rounded-[3px] bg-ink px-5 text-[11.5px] font-bold tracking-[0.1em] text-white hover:brightness-125"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          NUEVO CLIENTE
        </Link>
      </div>

      {clientes.length === 0 ? (
        <p className="text-[13px] text-muted">Todavía no hay clientes. Da de alta el primero.</p>
      ) : null}
      <div className="grid grid-cols-3 gap-5">
        {clientes.map((c) => {
          const suyas = propuestas.filter((p) => p.clienteId === c.id);
          return (
            <Card key={c.id} className="flex flex-col gap-3.5 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tan-soft text-[11px] font-bold text-tan-deep">
                  {c.nombre.startsWith("[") ? "··" : c.nombre.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-[15px] leading-tight font-bold hover:text-tan-deep"
                  >
                    {c.nombre}
                  </Link>
                  <span className="text-[11px] text-muted">
                    {c.ciudadResidencia ?? "[CIUDAD DE RESIDENCIA]"}
                  </span>
                </div>
                <div className="grow" />
                <Badge tono={tonoEtapa[c.kommoEtapa ?? ""] ?? "neutral"}>
                  {c.kommoEtapa ?? "sin etapa"}
                </Badge>
              </div>

              <div className="h-px bg-line" />

              <div className="flex flex-col gap-2 text-[12.5px]">
                <div className="flex justify-between">
                  <span className="text-ink-2">Presupuesto</span>
                  <span className="font-bold">
                    {moneyCorto(c.presupuestoMin)} – {moneyCorto(c.presupuestoMax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Recámaras</span>
                  <span className="font-bold">{c.recamaras ?? "[ ]"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Objetivo</span>
                  <span className="font-bold capitalize">{c.objetivo ?? "[ ]"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Propuestas</span>
                  <span className="font-bold">{suyas.length}</span>
                </div>
                {responsable(c.responsableId) ? (
                  <div className="flex justify-between">
                    <span className="text-ink-2">Lo lleva</span>
                    <span className="font-bold">{responsable(c.responsableId)}</span>
                  </div>
                ) : null}
              </div>

              <div className="grow" />

              <div className="flex gap-2.5">
                <Link
                  href={`/clientes/${c.id}`}
                  className="flex h-10 grow items-center justify-center rounded-[3px] border border-[#C9C1B6] text-[10.5px] font-bold tracking-[0.08em] hover:bg-surface"
                >
                  VER FICHA
                </Link>
                <Link
                  href={`/propuestas/nueva?cliente=${encodeURIComponent(c.id)}`}
                  className="flex h-10 grow items-center justify-center rounded-[3px] bg-ink text-[10.5px] font-bold tracking-[0.08em] text-white hover:brightness-125"
                >
                  NUEVA PROPUESTA
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
