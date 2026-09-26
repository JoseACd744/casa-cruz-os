import { redirect } from "next/navigation";
import { haySesion } from "@/lib/sesion";

/** Documentos para imprimir o descargar: son del equipo, exigen sesión. */
export default async function DocLayout({ children }: { children: React.ReactNode }) {
  if (!(await haySesion())) redirect("/login");
  return <div className="flex min-h-screen flex-col bg-[#2A2825] print:bg-white">{children}</div>;
}
