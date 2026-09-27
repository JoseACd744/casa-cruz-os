/** Configuración del servicio, leída del entorno. */

const puerto = Number(process.env.PORT ?? 4000);
const databaseUrl = process.env.DATABASE_URL?.trim() || null;

export const config = {
  puerto,
  produccion: process.env.NODE_ENV === "production",
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl,
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET?.trim() || "casa-cruz-os-desarrollo-no-usar-en-produccion",
  /**
   * Clave para quien todavía no tiene la suya. Sin base de datos vale por
   * omisión "casacruz"; con Postgres sólo si se define a propósito, para que en
   * producción nadie entre sin su propia clave.
   */
  claveDemo: process.env.CLAVE_DEMO?.trim() || (databaseUrl ? null : "casacruz"),
  /** URL pública de la web, para los enlaces que se mandan al cliente. */
  urlPublica: (process.env.URL_PUBLICA ?? "https://propuestas.casacruz.mx").replace(/\/$/, ""),
  /** URL pública de esta API: con ella se arman los enlaces a archivos locales. */
  urlApi: (process.env.URL_API ?? `http://localhost:${puerto}`).replace(/\/$/, ""),
  s3: {
    endpoint: process.env.S3_ENDPOINT?.trim() || null,
    bucket: process.env.S3_BUCKET?.trim() || null,
    region: process.env.S3_REGION?.trim() || "auto",
    accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() || null,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() || null,
    /** Dominio desde el que se sirven los archivos, si el bucket tiene uno. */
    urlPublica: process.env.S3_URL_PUBLICA?.trim() || null,
  },
  googleMapsKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || null,
  kommo: {
    subdominio: process.env.KOMMO_SUBDOMINIO?.trim() || null,
    token: process.env.KOMMO_TOKEN?.trim() || null,
    /** Va en la URL del webhook que se configura en Kommo: ?clave=… */
    webhookSecreto: process.env.KOMMO_WEBHOOK_SECRETO?.trim() || null,
  },
};

/** Sin DATABASE_URL la API responde con los datos de demostración. */
export const modoMock = config.databaseUrl === null;

/** En producción el secreto del token no puede ser el de desarrollo. */
export const jwtInseguro = !process.env.JWT_SECRET && process.env.NODE_ENV === "production";
