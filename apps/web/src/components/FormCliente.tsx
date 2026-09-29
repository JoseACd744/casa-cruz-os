"use client";

import { useActionState } from "react";
import type { Cliente, Plaza } from "@casacruz/core";
import { AvisoAccion, BotonGuardar, CampoArea, CampoCasillas, CampoOpciones, CampoTexto } from "@/components/formulario";
import { actualizarCliente, crearCliente } from "@/lib/acciones/comercial";
import { ESTADO_INICIAL } from "@/lib/acciones/tipos";

/** Lo que el cliente nos compartió. Sirve para darlo de alta y para corregirlo. */
export function FormCliente({ cliente, plazas }: { cliente: Cliente | null; plazas: Plaza[] }) {
  const [estado, accion] = useActionState(
    cliente ? actualizarCliente.bind(null, cliente.id) : crearCliente,
    ESTADO_INICIAL,
  );

  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CampoTexto nombre="nombre" etiqueta="Nombre" valor={cliente?.nombre} requerido ancho="col-span-2" placeholder="Como aparece en Kommo" />
        <CampoTexto nombre="kommoLeadId" etiqueta="Lead de Kommo" valor={cliente?.kommoLeadId} inputMode="numeric" placeholder="Opcional" />
        <CampoTexto nombre="telefono" etiqueta="Teléfono" valor={cliente?.telefono} tipo="tel" />
        <CampoTexto nombre="correo" etiqueta="Correo" valor={cliente?.correo} tipo="email" />
        <CampoTexto nombre="ciudadResidencia" etiqueta="Ciudad donde vive" valor={cliente?.ciudadResidencia} />
        <CampoTexto nombre="presupuestoMin" etiqueta="Presupuesto desde" valor={cliente?.presupuestoMin} inputMode="decimal" placeholder="$2,500,000" />
        <CampoTexto nombre="presupuestoMax" etiqueta="Presupuesto hasta" valor={cliente?.presupuestoMax} inputMode="decimal" placeholder="$3,600,000" />
        <CampoTexto nombre="recamaras" etiqueta="Recámaras" valor={cliente?.recamaras} placeholder="2 o 3" />
        <CampoOpciones
          nombre="objetivo"
          etiqueta="Para qué compra"
          valor={cliente?.objetivo ?? ""}
          opciones={[
            { valor: "", texto: "Sin capturar" },
            { valor: "vivienda", texto: "Para vivir" },
            { valor: "inversion", texto: "Inversión" },
            { valor: "retiro", texto: "Retiro" },
          ]}
        />
      </div>
      <CampoCasillas
        nombre="plazasInteres"
        etiqueta="Plazas de interés"
        opciones={plazas.filter((p) => p.activa).map((p) => ({ valor: p.id, texto: p.nombre }))}
        elegidas={cliente?.plazasInteres ?? []}
      />
      <CampoArea
        nombre="notas"
        etiqueta="Notas del asesor"
        valor={cliente?.notas}
        filas={3}
        placeholder="Qué buscan, qué les preocupa, cómo van a pagar"
      />
      <AvisoAccion estado={estado} />
      <div className="flex justify-end">
        <BotonGuardar>{cliente ? "GUARDAR" : "DAR DE ALTA"}</BotonGuardar>
      </div>
    </form>
  );
}
