import { notFound } from "next/navigation";
import { fechaHora, LISTA_CAMPOS_CAMBIABLES, type CampoCambiable } from "@casacruz/core";
import { FormCambio } from "@/components/FormCambio";
import { obtenerDesarrollo, obtenerIntegraciones, obtenerUsuarioActual } from "@/lib/repo";

export default async function CambioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campo?: string }>;
}) {
  const { id } = await params;
  const { campo } = await searchParams;
  const campoInicial = LISTA_CAMPOS_CAMBIABLES.includes(campo as CampoCambiable)
    ? (campo as CampoCambiable)
    : "precio";
  const [d, usuario, integraciones] = await Promise.all([
    obtenerDesarrollo(id),
    obtenerUsuarioActual(),
    obtenerIntegraciones(),
  ]);
  if (!d) notFound();

  return (
    <FormCambio
      desarrollo={d}
      campoInicial={campoInicial}
      usuario={usuario.nombre}
      ahora={fechaHora(new Date())}
      puedeAdjuntar={integraciones.archivos !== "sin_configurar"}
    />
  );
}
