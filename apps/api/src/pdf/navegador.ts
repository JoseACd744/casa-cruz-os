import { chromium, type Browser } from "playwright";

/**
 * Chromium compartido para imprimir documentos.
 *
 * Se abre una sola vez y se reutiliza: levantar el navegador en cada PDF cuesta
 * más de un segundo. El servidor lo cierra al terminar.
 */

let navegador: Browser | null = null;
let abriendo: Promise<Browser> | null = null;

export async function obtenerNavegador(): Promise<Browser> {
  if (navegador?.isConnected()) return navegador;
  if (!abriendo) {
    abriendo = chromium
      // `channel: "chromium"` usa el Chromium completo en vez del shell headless:
      // un binario menos que descargar en el servidor.
      .launch({ channel: "chromium", args: ["--no-sandbox", "--font-render-hinting=none"] })
      .then((b) => {
        navegador = b;
        abriendo = null;
        return b;
      });
  }
  return abriendo;
}

export async function cerrarNavegador(): Promise<void> {
  await navegador?.close();
  navegador = null;
}

export interface OpcionesPdf {
  /** Ancho de página en px CSS. 1 px = 1/96 pulgada. */
  ancho: string;
  /** Alto de página; se omite cuando se usa formato carta con saltos. */
  alto?: string;
  paisaje?: boolean;
}

/** Convierte un documento HTML completo en un PDF. */
export async function imprimir(html: string, opciones: OpcionesPdf): Promise<Buffer> {
  const browser = await obtenerNavegador();
  const contexto = await browser.newContext();
  const pagina = await contexto.newPage();

  try {
    await pagina.setContent(html, { waitUntil: "networkidle" });
    // La fuente va embebida, pero esto evita imprimir antes de que se aplique.
    await pagina.evaluate("document.fonts.ready");

    return await pagina.pdf({
      width: opciones.ancho,
      height: opciones.alto,
      landscape: opciones.paisaje ?? false,
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await contexto.close();
  }
}
