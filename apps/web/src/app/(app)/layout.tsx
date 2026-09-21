import { Sidebar } from "@/components/Sidebar";
import { SeleccionProvider } from "@/components/Seleccion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SeleccionProvider>
      <div className="flex h-screen overflow-hidden bg-ground">
        <Sidebar />
        <main className="flex min-w-0 grow flex-col">{children}</main>
      </div>
    </SeleccionProvider>
  );
}
