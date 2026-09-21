import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { moneyCorto } from "@/lib/format";
import { listarClientes, listarPropuestas } from "@/lib/repo";

const tonoEtapa: Record<string, "ok" | "warn" | "alert" | "neutral"> = {
  "Propuesta enviada": "warn",
  Calificado: "ok",
  "Sin respuesta": "alert",
};

export default async function ClientesPage() {
  const clientes = await listarClientes();
  const propuestas = await listarPropuestas();

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
          <span className="size-1.75 rounded-full bg-ok" />
          Sincronizado con Kommo hace 4 minutos
        </span>
      </div>

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
                  <span className="text-ink-2">Propuestas enviadas</span>
                  <span className="font-bold">{suyas.length}</span>
                </div>
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
                  href="/propuestas/nueva"
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
