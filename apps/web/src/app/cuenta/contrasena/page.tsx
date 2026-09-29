import { redirect } from "next/navigation";
import { LARGO_MINIMO_CLAVE } from "@casacruz/core";
import { FormClave } from "@/components/FormClave";
import { usandoApi } from "@/lib/api";
import { obtenerUsuarioActual } from "@/lib/repo";
import { haySesion } from "@/lib/sesion";
import { Isotipo } from "@/components/Marca";

/**
 * Cambiar la clave. Quien entró con una clave temporal llega aquí antes de
 * poder trabajar; los demás, desde el menú.
 */
export default async function CambiarClavePage() {
  if (!usandoApi) redirect("/inicio");
  if (!(await haySesion())) redirect("/login");
  const usuario = await obtenerUsuarioActual();
  const temporal = usuario.debeCambiarContrasena;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ground px-6 py-8 app:px-8">
      <div className="flex w-full max-w-105 flex-col gap-5.5">
        <Isotipo className="h-11 self-start" />
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold tracking-[-0.01em]">
            {temporal ? `Hola, ${usuario.nombre.split(" ")[0]}` : "Cambiar clave"}
          </h1>
          <span className="text-[13px] leading-relaxed text-ink-2">
            {temporal
              ? "Entraste con una clave temporal. Elige la tuya para empezar: sólo tú la vas a conocer."
              : "La clave nueva sustituye a la actual en cuanto la guardes."}
          </span>
        </div>
        <FormClave temporal={temporal} largoMinimo={LARGO_MINIMO_CLAVE} />
      </div>
    </div>
  );
}
