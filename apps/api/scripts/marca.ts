import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import { COLORES_MARCA, ISOTIPO, LOGOTIPO, svgIsotipo, svgLogotipo } from "@casacruz/core";

/**
 * Genera los archivos de la marca a partir de packages/core/src/marca.ts:
 *
 *   pnpm --filter @casacruz/api marca
 *
 * - apps/web/public/marca: logotipo e isotipo en SVG y PNG (a color y en blanco)
 *   y una imagen de perfil cuadrada para WhatsApp y Kommo.
 * - apps/web/src/app: los íconos de la web (icon.svg, favicon.ico, apple-icon.png).
 * - apps/web/public/icons: los íconos de la app instalable (192, 512 y maskable).
 *
 * Si el diseñador entrega los vectores originales, se cambian los trazos en
 * marca.ts y se vuelve a correr esto.
 */

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const carpetaMarca = join(raiz, "apps/web/public/marca");
const carpetaApp = join(raiz, "apps/web/src/app");
const carpetaIconos = join(raiz, "apps/web/public/icons");
const TINTA = "#1C1B19"; // --color-ink de la web
const BLANCO = "#FFFFFF";

mkdirSync(carpetaMarca, { recursive: true });

const puntos = ISOTIPO.puntos.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join("");

/**
 * El isotipo centrado en un cuadrado. `relleno` pinta el interior del marco (el
 * favicon lo lleva blanco para leerse también en pestañas oscuras); `fondo`
 * pinta todo el cuadrado; `ocupa` es la fracción del alto que usa el isotipo.
 */
function isotipoCuadrado(op: { color: string; relleno?: string; fondo?: string; ocupa?: number }): string {
  const ocupa = op.ocupa ?? 1;
  const lado = ISOTIPO.alto / ocupa;
  const x = (lado - ISOTIPO.ancho) / 2;
  const y = (lado - ISOTIPO.alto) / 2;
  const fondo = op.fondo ? `<rect width="${lado}" height="${lado}" fill="${op.fondo}"/>` : "";
  const relleno = op.relleno
    ? `<rect width="${ISOTIPO.ancho}" height="${ISOTIPO.alto}" fill="${op.relleno}"/>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}">${fondo}` +
    `<g transform="translate(${x} ${y})">${relleno}` +
    `<g fill="${op.color}"><path fill-rule="evenodd" d="${ISOTIPO.d}"/>${puntos}</g></g></svg>`
  );
}

const svgs: Record<string, string> = {
  "logotipo.svg": svgLogotipo({ color: COLORES_MARCA.isotipo, colorTexto: COLORES_MARCA.texto }),
  "logotipo-blanco.svg": svgLogotipo({ color: BLANCO }),
  "isotipo.svg": svgIsotipo({ color: COLORES_MARCA.isotipo }),
  "isotipo-blanco.svg": svgIsotipo({ color: BLANCO }),
};
for (const [nombre, svg] of Object.entries(svgs)) {
  writeFileSync(join(carpetaMarca, nombre), svg + "\n");
}

const icono = isotipoCuadrado({ color: COLORES_MARCA.isotipo, relleno: BLANCO });
writeFileSync(join(carpetaApp, "icon.svg"), icono + "\n");

/** Rasteriza un SVG al tamaño exacto, con fondo transparente. */
async function png(pagina: Page, svg: string, ancho: number, alto: number): Promise<Buffer> {
  await pagina.setViewportSize({ width: ancho, height: alto });
  const conMedidas = svg.replace("<svg ", `<svg width="${ancho}" height="${alto}" `);
  await pagina.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${conMedidas}</body></html>`,
  );
  return pagina.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: ancho, height: alto } });
}

/** Un .ico con varias medidas, cada una en PNG (lo aceptan todos los navegadores). */
function ico(imagenes: { lado: number; datos: Buffer }[]): Buffer {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0);
  cabecera.writeUInt16LE(1, 2);
  cabecera.writeUInt16LE(imagenes.length, 4);
  let desplazamiento = 6 + 16 * imagenes.length;
  const entradas = imagenes.map(({ lado, datos }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado >= 256 ? 0 : lado, 0);
    e.writeUInt8(lado >= 256 ? 0 : lado, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(datos.length, 8);
    e.writeUInt32LE(desplazamiento, 12);
    desplazamiento += datos.length;
    return e;
  });
  return Buffer.concat([cabecera, ...entradas, ...imagenes.map((i) => i.datos)]);
}

const proporcion = ISOTIPO.ancho / ISOTIPO.alto;
const navegador = await chromium.launch({ channel: "chromium" });
const pagina = await navegador.newPage();

const anchoLogo = 2400;
const altoLogo = Math.round((anchoLogo * LOGOTIPO.alto) / LOGOTIPO.ancho);
writeFileSync(join(carpetaMarca, "logotipo.png"), await png(pagina, svgs["logotipo.svg"], anchoLogo, altoLogo));
writeFileSync(
  join(carpetaMarca, "logotipo-blanco.png"),
  await png(pagina, svgs["logotipo-blanco.svg"], anchoLogo, altoLogo),
);
const altoIso = 1000;
const anchoIso = Math.round(altoIso * proporcion);
writeFileSync(join(carpetaMarca, "isotipo.png"), await png(pagina, svgs["isotipo.svg"], anchoIso, altoIso));
writeFileSync(
  join(carpetaMarca, "isotipo-blanco.png"),
  await png(pagina, svgs["isotipo-blanco.svg"], anchoIso, altoIso),
);
// Perfil (WhatsApp recorta en círculo: el isotipo queda dentro con holgura).
writeFileSync(
  join(carpetaMarca, "perfil.png"),
  await png(pagina, isotipoCuadrado({ color: BLANCO, fondo: TINTA, ocupa: 0.5 }), 1080, 1080),
);
// iOS redondea las esquinas por su cuenta: el cuadro va completo.
writeFileSync(
  join(carpetaApp, "apple-icon.png"),
  await png(pagina, isotipoCuadrado({ color: BLANCO, fondo: TINTA, ocupa: 0.62 }), 180, 180),
);
// Íconos de la app instalable (PWA): el maskable deja el isotipo dentro del 60 % central,
// porque cada teléfono lo recorta con su propia forma (círculo, cuadro redondeado…).
mkdirSync(carpetaIconos, { recursive: true });
const cuadroTinta = (ocupa: number) => isotipoCuadrado({ color: BLANCO, fondo: TINTA, ocupa });
writeFileSync(join(carpetaIconos, "icon-192.png"), await png(pagina, cuadroTinta(0.62), 192, 192));
writeFileSync(join(carpetaIconos, "icon-512.png"), await png(pagina, cuadroTinta(0.62), 512, 512));
writeFileSync(join(carpetaIconos, "icon-maskable-512.png"), await png(pagina, cuadroTinta(0.5), 512, 512));

const medidas = [16, 32, 48];
const favicon = [];
for (const lado of medidas) favicon.push({ lado, datos: await png(pagina, icono, lado, lado) });
writeFileSync(join(carpetaApp, "favicon.ico"), ico(favicon));

await navegador.close();
console.log("Listo: apps/web/public/marca y los íconos de apps/web/src/app");
