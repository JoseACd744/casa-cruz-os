import { reenviarArchivo } from "@/lib/api";

/** Ficha en PDF: la genera la API y se entrega desde aquí, con la sesión del usuario. */
export async function GET(peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tipologia = new URL(peticion.url).searchParams.get("tipologia");
  const query = tipologia ? `?tipologia=${encodeURIComponent(tipologia)}` : "";
  return reenviarArchivo(`/pdf/ficha/${encodeURIComponent(id)}${query}`);
}
