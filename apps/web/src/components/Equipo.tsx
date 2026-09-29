"use client";

import { useActionState, useState } from "react";
import type { Plaza, Usuario } from "@casacruz/core";
import { AvisoAccion, BotonGuardar, CampoCasillas, CampoOpciones, CampoTexto } from "@/components/formulario";
import { editarUsuario, invitarUsuario, restablecerClave, type EstadoClave } from "@/lib/acciones/equipo";
import { ESTADO_INICIAL } from "@/lib/acciones/tipos";

/**
 * Administración del equipo (corporativo). La clave temporal se muestra una
 * sola vez: aquí se copia para compartirla por un canal seguro.
 */

const ROLES = [
  { valor: "cerrador", texto: "Cerrador" },
  { valor: "gerente", texto: "Gerente" },
  { valor: "corporativo", texto: "Corporativo" },
];

function ClaveMostrada({ estado }: { estado: EstadoClave }) {
  const [copiada, setCopiada] = useState(false);
  if (!estado.clave) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-[3px] border border-ok/30 bg-ok-soft px-4 py-3">
      <div className="flex grow flex-col gap-1">
        <span className="text-[11px] font-semibold text-ok-ink">Clave temporal de {estado.para}</span>
        <span className="font-mono text-[16px] font-bold tracking-[0.06em]">{estado.clave}</span>
        <span className="text-[10.5px] text-ink-2">
          Se muestra sólo esta vez. Compártela por un canal seguro: al entrar se le pide cambiarla.
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(estado.clave ?? "").then(() => setCopiada(true));
        }}
        className="h-9 rounded-[3px] border border-line bg-panel px-3.5 text-[10.5px] font-bold tracking-[0.08em]"
      >
        {copiada ? "COPIADA" : "COPIAR"}
      </button>
    </div>
  );
}

export function InvitarUsuario({ plazas }: { plazas: Plaza[] }) {
  const [estado, accion] = useActionState(invitarUsuario, ESTADO_INICIAL as EstadoClave);
  return (
    <details className="rounded-card border border-line bg-panel" open={Boolean(estado.error)}>
      <summary className="flex h-11 cursor-pointer list-none items-center justify-center rounded-[3px] bg-ink px-4.5 text-[11px] font-bold tracking-[0.1em] text-white hover:brightness-125">
        INVITAR USUARIO
      </summary>
      <form action={accion} className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto id="invitar-nombre" nombre="nombre" etiqueta="Nombre" requerido placeholder="Nombre y apellido" />
          <CampoTexto id="invitar-correo" nombre="correo" etiqueta="Correo" tipo="email" requerido placeholder="nombre@casacruz.mx" />
          <CampoOpciones nombre="rol" etiqueta="Rol" valor="cerrador" opciones={ROLES} />
          <CampoTexto id="invitar-telefono" nombre="telefono" etiqueta="Teléfono" tipo="tel" placeholder="Para que el cliente le escriba" />
        </div>
        <CampoCasillas
          nombre="plazasCertificadas"
          etiqueta="Plazas certificadas (puede vender)"
          opciones={plazas.filter((p) => p.activa).map((p) => ({ valor: p.id, texto: p.nombre }))}
          elegidas={[]}
        />
        <AvisoAccion estado={{ error: estado.error }} />
        <ClaveMostrada estado={estado} />
        <div className="flex justify-end">
          <BotonGuardar>CREAR CUENTA</BotonGuardar>
        </div>
      </form>
    </details>
  );
}

export function EditarUsuario({
  usuario,
  plazas,
  esYo,
}: {
  usuario: Usuario;
  plazas: Plaza[];
  esYo: boolean;
}) {
  const [estado, accion] = useActionState(editarUsuario.bind(null, usuario.id), ESTADO_INICIAL);
  const [clave, restablecer, restableciendo] = useActionState(
    restablecerClave.bind(null, usuario.id),
    ESTADO_INICIAL as EstadoClave,
  );
  const opcionesPlaza = plazas.map((p) => ({ valor: p.id, texto: p.nombre }));

  return (
    <details className="border-t border-dashed border-line bg-surface/60">
      <summary className="cursor-pointer list-none px-4 py-2 text-[10px] font-bold tracking-[0.1em] text-tan-deep hover:text-ink">
        EDITAR ACCESO
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <form action={accion} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CampoOpciones nombre="rol" etiqueta="Rol" valor={usuario.rol} opciones={ROLES} />
            <CampoOpciones
              nombre="activo"
              etiqueta="Estado"
              valor={usuario.activo ? "si" : "no"}
              bloqueado={esYo}
              ayuda={esYo ? "No puedes desactivar tu propia cuenta." : undefined}
              opciones={[
                { valor: "si", texto: "Activo" },
                { valor: "no", texto: "Inactivo (sin acceso)" },
              ]}
            />
            <CampoTexto id={`telefono-${usuario.id}`} nombre="telefono" etiqueta="Teléfono" valor={usuario.telefono} tipo="tel" />
          </div>
          {esYo ? <input type="hidden" name="activo" value="si" /> : null}
          <CampoCasillas
            nombre="plazasCertificadas"
            etiqueta="Plazas certificadas (puede vender)"
            opciones={opcionesPlaza}
            elegidas={usuario.plazasCertificadas}
          />
          <CampoCasillas
            nombre="plazasEnProgreso"
            etiqueta="En capacitación"
            opciones={opcionesPlaza}
            elegidas={usuario.plazasEnProgreso}
          />
          <AvisoAccion estado={estado} />
          <div className="flex justify-end">
            <BotonGuardar className="h-10.5 px-5">GUARDAR</BotonGuardar>
          </div>
        </form>

        <form action={restablecer} className="flex flex-col gap-2.5 border-t border-line pt-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 grow basis-48 text-[11.5px] text-ink-2">
              ¿Perdió su clave? Genera una temporal nueva; la anterior deja de servir.
            </span>
            <button
              type="submit"
              disabled={restableciendo}
              className="h-9 rounded-[3px] border border-[#C9C1B6] px-3.5 text-[10.5px] font-bold tracking-[0.08em] hover:bg-panel disabled:opacity-50"
            >
              {restableciendo ? "…" : "RESTABLECER CLAVE"}
            </button>
          </div>
          <AvisoAccion estado={{ error: clave.error }} />
          <ClaveMostrada estado={clave} />
        </form>
      </div>
    </details>
  );
}
