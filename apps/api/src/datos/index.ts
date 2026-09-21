import { config, modoMock } from "../config";
import { fuenteMock } from "./mock";
import type { FuenteDeDatos } from "./tipos";

let instancia: FuenteDeDatos | null = null;

/**
 * Elige de dónde salen los datos: Postgres si hay DATABASE_URL, y si no, los
 * datos de demostración. Así el servicio arranca hoy y conecta la base después
 * sin tocar las rutas.
 */
export async function fuente(): Promise<FuenteDeDatos> {
  if (instancia) return instancia;

  if (modoMock) {
    instancia = fuenteMock();
    return instancia;
  }

  const { fuentePostgres } = await import("./postgres");
  instancia = fuentePostgres();
  return instancia;
}

export const origenConfigurado = modoMock ? "mock" : `postgres (${hostDe(config.databaseUrl)})`;

function hostDe(url: string | null): string {
  if (!url) return "sin definir";
  try {
    return new URL(url).host;
  } catch {
    return "url inválida";
  }
}

export type { FuenteDeDatos, NuevoCambio } from "./tipos";
