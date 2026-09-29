import Link from "next/link";
import { FormCliente } from "@/components/FormCliente";
import { Card } from "@/components/ui";
import { listarPlazas } from "@/lib/repo";

export default async function NuevoClientePage() {
  const plazas = await listarPlazas();
  return (
    <>
      <header className="encabezado">
        <Link
          href="/clientes"
          className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.06em] text-ink-2 hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          CLIENTES
        </Link>
        <span className="text-[11.5px] text-faint">/</span>
        <span className="text-[11.5px] font-semibold tracking-[0.06em]">NUEVO CLIENTE</span>
      </header>
      <div className="flex justify-center overflow-auto p-4 app:p-8">
        <Card className="flex w-full flex-col gap-5 p-4 app:w-215 app:p-7">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">Nuevo cliente</h1>
            <span className="text-[12.5px] text-ink-2">
              Queda a tu nombre. Si ya existe en Kommo, escribe su número de lead para que las
              propuestas se registren ahí.
            </span>
          </div>
          <FormCliente cliente={null} plazas={plazas} />
        </Card>
      </div>
    </>
  );
}
