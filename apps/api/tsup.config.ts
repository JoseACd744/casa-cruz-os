import { defineConfig } from "tsup";

/**
 * El build empaqueta la API junto con el código compartido (@casacruz/core),
 * para que en el servidor destino baste con `node dist/server.js` y las
 * dependencias de producción. No hace falta el monorepo completo.
 */
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  sourcemap: true,
  noExternal: [/^@casacruz\//],
});
