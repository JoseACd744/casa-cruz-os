import { notFound } from "next/navigation";
import { FormCambio } from "@/components/FormCambio";
import { obtenerDesarrollo, obtenerUsuarioActual } from "@/lib/repo";

export default async function CambioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await obtenerDesarrollo(id);
  if (!d) notFound();
  const usuario = await obtenerUsuarioActual();

  return (
    <FormCambio desarrolloId={d.id} desarrolloNombre={d.nombre} usuario={usuario.nombre} />
  );
}
