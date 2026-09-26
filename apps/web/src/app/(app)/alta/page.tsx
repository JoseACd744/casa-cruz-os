import { ColumnaAlta } from "@/components/alta/ColumnaAlta";
import { MarcoAlta, TituloPaso } from "@/components/alta/MarcoAlta";
import { FormAlta } from "@/components/alta/Pasos";
import { listarPlazas, obtenerUsuarioActual } from "@/lib/repo";

/** Alta de un desarrollo nuevo: con la identificación nace el borrador y sigue el asistente. */
export default async function AltaPage() {
  const [plazas, usuario] = await Promise.all([listarPlazas(), obtenerUsuarioActual()]);

  return (
    <MarcoAlta
      titulo="Alta de nuevo desarrollo"
      volver={{ href: "/propiedades", texto: "Propiedades" }}
      estatus="borrador"
      paso={1}
      secciones={null}
      base={null}
      columna={<ColumnaAlta desarrollo={null} rol={usuario.rol} base={null} />}
    >
      <TituloPaso paso={1} titulo="Identificación" detalle="Lo demás se captura en los pasos siguientes" />
      <FormAlta plazas={plazas.filter((p) => p.activa)} />
    </MarcoAlta>
  );
}
