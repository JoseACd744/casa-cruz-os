import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SeleccionProvider } from "@/components/Seleccion";
import { haySesion } from "@/lib/sesion";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await haySesion())) redirect("/login");

  return (
    <SeleccionProvider>
      <div className="flex h-screen overflow-hidden bg-ground">
        <Sidebar />
        <main className="flex min-w-0 grow flex-col">{children}</main>
      </div>
    </SeleccionProvider>
  );
}
