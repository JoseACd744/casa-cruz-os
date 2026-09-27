import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ConstructorPropuesta,
  type OpcionDesarrollo,
} from "@/components/ConstructorPropuesta";
import { Card } from "@/components/ui";
import {
  advertencia,
  confiabilidad,
  galeria,
  moneyCorto,
  motivoParaNoProponer,
} from "@casacruz/core";
import {
  listarClientes,
  listarDesarrollos,
  listarPlazas,
  obtenerCliente,
  obtenerIntegraciones,
  obtenerUsuarioActual,
} from "@/lib/repo";

function Encabezado({ detalle }: { detalle: string }) {
  return (
    <header className="flex h-15 shrink-0 items-center gap-3.5 border-b border-line bg-panel px-8">
      <Link
        href="/propuestas"
        className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-ink-2 hover:text-ink"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        PROPUESTAS
      </Link>
      <span className="text-[11.5px] text-faint">/</span>
      <span className="text-[11.5px] font-semibold tracking-[0.06em]">NUEVA PROPUESTA</span>
      <div className="grow" />
      <span className="text-[11px] text-muted">{detalle}</span>
    </header>
  );
}

/** Primero para quién; después, qué se le propone. */
export default async function NuevaPropuestaPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente: clienteId } = await searchParams;

  if (!clienteId) {
    const clientes = await listarClientes();
    return (
      <>
        <Encabezado detalle="Paso 1: ¿para quién es?" />
        <div className="flex justify-center overflow-auto p-8">
          <Card className="flex w-215 flex-col gap-4 p-7">
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">¿Para quién es la propuesta?</h1>
                <span className="text-[12.5px] text-ink-2">
                  Las propiedades que ya seleccionaste se conservan.
                </span>
              </div>
              <div className="grow" />
              <Link href="/clientes/nuevo" className="text-[11.5px] font-semibold text-tan-deep underline">
                Dar de alta un cliente
              </Link>
            </div>
            {clientes.length === 0 ? (
              <p className="text-[12.5px] text-muted">Todavía no hay clientes.</p>
            ) : (
              <div className="flex flex-col">
                {clientes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/propuestas/nueva?cliente=${encodeURIComponent(c.id)}`}
                    className="flex items-center gap-4 border-b border-line px-2 py-3.5 last:border-0 hover:bg-surface"
                  >
                    <span className="grow text-[14px] font-bold">{c.nombre}</span>
                    <span className="text-[12px] text-ink-2">
                      {moneyCorto(c.presupuestoMin)} – {moneyCorto(c.presupuestoMax)}
                    </span>
                    <span className="w-28 text-right text-[11px] text-muted">{c.kommoEtapa ?? "sin etapa"}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </>
    );
  }

  const [cliente, desarrollos, usuario, plazas, integraciones] = await Promise.all([
    obtenerCliente(clienteId),
    listarDesarrollos(),
    obtenerUsuarioActual(),
    listarPlazas(),
    obtenerIntegraciones(),
  ]);
  if (!cliente) notFound();

  const catalogo: OpcionDesarrollo[] = desarrollos.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    foto: galeria(d).principal,
    ciudad: d.ciudad,
    entrega: d.entrega,
    confiabilidad: confiabilidad(d),
    advertencia: advertencia(d),
    motivo: motivoParaNoProponer(usuario, d),
    tipologias: d.tipologias.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      niveles: t.niveles.map((n) => ({ nombre: n.nombre, precio: n.precioVenta })),
    })),
  }));

  return (
    <>
      <Encabezado detalle="El precio se congela al generarla" />
      <ConstructorPropuesta
        catalogo={catalogo}
        kommo={integraciones.kommo}
        cliente={{
          id: cliente.id,
          nombre: cliente.nombre,
          presupuesto: `${moneyCorto(cliente.presupuestoMin)} – ${moneyCorto(cliente.presupuestoMax)} MXN`,
          recamaras: cliente.recamaras ? `${cliente.recamaras} habitaciones` : "[ ]",
          plazas:
            cliente.plazasInteres.map((p) => plazas.find((x) => x.id === p)?.nombre ?? p).join(" · ") || "[ ]",
          kommoLeadId: cliente.kommoLeadId,
        }}
      />
    </>
  );
}
