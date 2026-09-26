import { reenviarArchivo } from "@/lib/api";

/** Análisis de la propuesta en PDF, generado por la API. */
export async function GET(_peticion: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return reenviarArchivo(`/pdf/analisis/${encodeURIComponent(slug)}`);
}
