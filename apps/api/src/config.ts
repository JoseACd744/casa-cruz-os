/** Configuración del servicio, leída del entorno. */

export const config = {
  puerto: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL?.trim() || null,
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  googleMapsKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || null,
  kommo: {
    subdominio: process.env.KOMMO_SUBDOMINIO?.trim() || null,
    token: process.env.KOMMO_TOKEN?.trim() || null,
  },
};

/** Sin DATABASE_URL la API responde con los datos de demostración. */
export const modoMock = config.databaseUrl === null;
