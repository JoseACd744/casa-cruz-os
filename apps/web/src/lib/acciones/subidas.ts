"use server";

import { enviar } from "@/lib/api";

export type SolicitudSubida = {
  proposito: "multimedia" | "documento" | "evidencia";
  desarrolloId: string; nombre: string; bytes: number; mime: string; tipo: string; titulo?: string;
};
export type SubidaPreparada = { modo: "local" } | {
  modo: "directo"; url: string; headers: Record<string, string>; ticket: string;
};
export async function prepararSubida(entrada: SolicitudSubida) {
  return enviar<SubidaPreparada>("POST", "/archivos/preparar", entrada);
}
export async function confirmarSubida(ticket: string, proposito: SolicitudSubida["proposito"], desarrolloId: string) {
  return enviar<{ url: string }>("POST", "/archivos/confirmar", { ticket, proposito, desarrolloId });
}
