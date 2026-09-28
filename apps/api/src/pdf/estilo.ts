import { existsSync, readFileSync } from "node:fs";
import { COLORES_MARCA, svgIsotipo } from "@casacruz/core";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Base visual de los documentos de Casa Cruz.
 *
 * Los colores salen de los PDFs originales que hizo el diseñador: se midieron
 * sobre el archivo, no se eligieron a ojo.
 */
export const marca = {
  tan: "#AE9479",
  tanClaro: "#E3CDAC",
  tinta: "#1D1D1D",
  negro: "#060606",
  fondoAnalisis: "#DFDAD6",
  fondoFicha: "#F9F8F6",
  blanco: "#FFFFFF",
  gris: "#6E675F",
  marcador: "#CFC7BC",
};

/** Sube hasta encontrar la carpeta assets, así funciona en dev y en el build. */
function rutaDeAssets(): string {
  let carpeta = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i += 1) {
    const candidata = join(carpeta, "assets");
    if (existsSync(join(candidata, "fuentes"))) return candidata;
    carpeta = dirname(carpeta);
  }
  throw new Error("No se encontró la carpeta assets con las fuentes");
}

let fuenteEmbebida: string | null = null;

/**
 * Montserrat viaja dentro del documento (fuente variable, un solo archivo), para
 * que el PDF salga igual aunque el servidor no tenga la tipografía instalada ni
 * acceso a Google Fonts.
 */
export function fuente(): string {
  if (fuenteEmbebida) return fuenteEmbebida;
  const archivo = join(rutaDeAssets(), "fuentes", "Montserrat-variable.woff2");
  const base64 = readFileSync(archivo).toString("base64");
  fuenteEmbebida = `
    @font-face {
      font-family: "Montserrat";
      src: url(data:font/woff2;base64,${base64}) format("woff2-variations");
      font-weight: 100 900;
      font-style: normal;
      font-display: block;
    }`;
  return fuenteEmbebida;
}

export const baseCss = `
  ${fuente()}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Montserrat", sans-serif;
    color: ${marca.tinta};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .marcador {
    background: ${marca.marcador};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8C8275;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .marcador img, .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Imagen real si existe; si no, el marcador gris con su etiqueta. */
export function imagen(url: string | null | undefined, etiqueta: string, estilo: string): string {
  if (url) {
    return `<div class="foto" style="${estilo}"><img src="${escapar(url)}" alt=""></div>`;
  }
  return `<div class="marcador" style="${estilo}">${escapar(etiqueta)}</div>`;
}

export const DISCLAIMER =
  "IMÁGENES ÚNICAMENTE ILUSTRATIVAS, LA PROPIEDAD PUEDE NO INCLUIR LO MOSTRADO EN ELLAS. LOS PRECIOS E IMÁGENES AQUÍ MOSTRADAS PUEDEN CAMBIAR SIN PREVIO AVISO Y ESTÁN SUJETOS A DISPONIBILIDAD. EL TIPO DE CAMBIO PUEDE VARIAR SEGÚN LA COMPRA DE DIVISAS.";

/** Iconos calcados de los documentos originales. */
export const iconos = {
  cama: (tamano = 26) => `
    <svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="${marca.tinta}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 18v-5h18v5M3 13V8M21 13v-1a3 3 0 0 0-3-3h-6v4M6.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3 18v2M21 18v2"/>
    </svg>`,
  bano: (tamano = 26) => `
    <svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="${marca.tinta}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>
    </svg>`,
  area: (tamano = 26) => `
    <svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="${marca.tinta}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16v16H4zM4 9V4h5M20 15v5h-5"/>
    </svg>`,
  pin: (tamano = 22, color = marca.tan) => `
    <svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>
    </svg>`,
};

/** Isotipo de Casa Cruz al alto indicado (el ancho sale de la proporción). */
export function isotipo(alto: number, color: string = COLORES_MARCA.isotipo): string {
  return svgIsotipo({ alto, color, estilo: "display:block;flex-shrink:0;" });
}
