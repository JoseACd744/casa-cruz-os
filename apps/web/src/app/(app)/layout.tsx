import { redirect } from "next/navigation";
import { etiquetaRol, iniciales } from "@casacruz/core";
import { NavegacionMovil } from "@/components/NavegacionMovil";
import { Sidebar, type UsuarioMenu } from "@/components/Sidebar";
import { SeleccionProvider } from "@/components/Seleccion";
import { listarPlazas, obtenerUsuarioActual } from "@/lib/repo";
import { haySesion } from "@/lib/sesion";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await haySesion())) redirect("/login");

  const usuario = await obtenerUsuarioActual();
  if (usuario.debeCambiarContrasena) redirect("/cuenta/contrasena");
  const plazas = await listarPlazas();
  const nombrePlaza = (id: string) => plazas.find((p) => p.id === id)?.nombre ?? id;

  const menu: UsuarioMenu = {
    nombre: usuario.nombre,
    iniciales: iniciales(usuario.nombre),
    rol: etiquetaRol[usuario.rol],
    plazas: [
      ...usuario.plazasCertificadas.map((id) => ({ nombre: nombrePlaza(id), certificada: true })),
      ...usuario.plazasEnProgreso.map((id) => ({ nombre: nombrePlaza(id), certificada: false })),
    ],
  };

  return (
    <SeleccionProvider>
      {/* h-dvh: en el teléfono la barra del navegador no tapa el pie de la pantalla. */}
      <div className="flex h-dvh overflow-hidden bg-ground print:h-auto print:overflow-visible print:bg-white">
        <Sidebar usuario={menu} />
        <main className="pie-movil flex min-w-0 grow flex-col">{children}</main>
        <NavegacionMovil usuario={menu} />
      </div>
    </SeleccionProvider>
  );
}
