import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { baseCss } from "../src/pdf/estilo";
import { mapaHtml } from "../src/pdf/mapa";

/**
 * Herramienta de desarrollo para ajustar el mapa sin generar un PDF completo:
 *
 *   pnpm --filter @casacruz/api exec tsx scripts/mapa-demo.ts
 *
 * Las coordenadas de abajo son de prueba, no son datos de Casa Cruz: sirven
 * para ver que los pines caen donde deben.
 */

const puntos = [
  { nombre: "Aukena", lat: 20.6462, lng: -87.0908 },
  { nombre: "Real Aurora", lat: 20.6398, lng: -87.0731 },
  { nombre: "Playa Encantada", lat: 20.6281, lng: -87.0614 },
  { nombre: "Playa Park", lat: 20.6335, lng: -87.0529 },
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${baseCss}
body { margin: 0; background: #DFDAD6; padding: 20px; width: 776px; }
</style></head><body>
${mapaHtml({ puntos, ancho: 736, alto: 430, claveGoogle: process.env.GOOGLE_MAPS_API_KEY ?? null })}
</body></html>`;

const navegador = await chromium.launch({ channel: "chromium" });
const pagina = await navegador.newPage({ viewport: { width: 776, height: 470 } });
await pagina.setContent(html, { waitUntil: "networkidle" });
await pagina.screenshot({ path: "mapa-demo.png" });
await navegador.close();

writeFileSync("mapa-demo.html", html);
console.log("Listo: mapa-demo.png y mapa-demo.html");
