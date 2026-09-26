import { reenviarArchivo } from "@/lib/api";

/** La bitácora completa en CSV, para auditoría. Es de gerente para arriba. */
export async function GET() {
  return reenviarArchivo("/cambios/exportar");
}
