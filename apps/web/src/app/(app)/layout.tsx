import { redirect } from "next/navigation";
import { etiquetaRol, iniciales } from "@casacruz/core";
import { Sidebar } from "@/components/Sidebar";
import { SeleccionProvider } from "@/components/Seleccion";
import { listarPlazas, obtenerUsuarioActual } from "@/lib/repo";
import { haySesion } from "@/lib/sesion";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await haySesion())) redirect("/login");

  const [usuario, plazas] = await Promise.all([obtenerUsuarioActual(), listarPlazas()]);
  const nombrePlaza = (id: string) => plazas.find((p) => p.id === id)?.nombre ?? id;

  return (
    <SeleccionProvider>
      <div className="flex h-screen overflow-hidden bg-ground">
        <Sidebar
          usuario={{
            nombre: usuario.nombre,
            iniciales: iniciales(usuario.nombre),
            rol: etiquetaRol[usuario.rol],
            plazas: [
              ...usuario.plazasCertificadas.map((id) => ({ nombre: nombrePlaza(id), certificada: true })),
              ...usuario.plazasEnProgreso.map((id) => ({ nombre: nombrePlaza(id), certificada: false })),
            ],
          }}
        />
        <main className="flex min-w-0 grow flex-col">{children}</main>
      </div>
    </SeleccionProvider>
  );
}
