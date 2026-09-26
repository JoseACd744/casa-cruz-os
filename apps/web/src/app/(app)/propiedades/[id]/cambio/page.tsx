import { notFound } from "next/navigation";
import { fechaHora } from "@casacruz/core";
import { FormCambio } from "@/components/FormCambio";
import { obtenerDesarrollo, obtenerIntegraciones, obtenerUsuarioActual } from "@/lib/repo";

export default async function CambioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, usuario, integraciones] = await Promise.all([
    obtenerDesarrollo(id),
    obtenerUsuarioActual(),
    obtenerIntegraciones(),
  ]);
  if (!d) notFound();

  return (
    <FormCambio
      desarrollo={d}
      usuario={usuario.nombre}
      ahora={fechaHora(new Date())}
      puedeAdjuntar={integraciones.archivos !== "sin_configurar"}
    />
  );
}
