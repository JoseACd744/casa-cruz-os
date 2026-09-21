import { money } from "@casacruz/core";
import type { Cliente, Desarrollo, Propuesta, Tipologia } from "@casacruz/core";
import { DISCLAIMER, baseCss, escapar, iconos, imagen, marca, monograma } from "./estilo";
import { mapaHtml } from "./mapa";

/**
 * Análisis de propiedades: el documento que se le manda al cliente, con el
 * mismo formato que venía haciendo el diseñador.
 *
 * Va en tamaño carta (816 × 1056 px CSS) con salto de página entre desarrollos.
 * El original de Canva usaba una página larga por desarrollo; carta se imprime
 * bien y respeta los mismos bloques.
 */

export const ANALISIS_ANCHO = "816px";
export const ANALISIS_ALTO = "1056px";

const PADDING = 40;
const ANCHO_UTIL = 816 - PADDING * 2;

function boton(texto: string): string {
  return `<div style="background:${marca.tan};padding:11px 18px;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${escapar(
    texto,
  )} &nbsp;→</div>`;
}

function tablaNiveles(t: Tipologia): string {
  return `
    <div style="margin-top:14px;">
      <div style="display:flex;background:${marca.tan};">
        <span style="flex:1;padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Nivel</span>
        <span style="padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Precio</span>
      </div>
      ${t.niveles
        .map(
          (n) => `
        <div style="display:flex;border-bottom:1px solid #C9C1B6;">
          <span style="flex:1;padding:9px 12px;font-size:13px;font-weight:700;text-transform:uppercase;">${escapar(
            n.nombre,
          )} desde:</span>
          <span style="padding:9px 12px;font-size:13px;font-weight:700;">${
            n.precioVenta === null ? "CONSULTAR" : `${money(n.precioVenta)} MXN`
          }</span>
        </div>`,
        )
        .join("")}
    </div>`;
}

function precioSuelto(t: Tipologia): string {
  const precios = t.niveles.map((n) => n.precioVenta).filter((p): p is number => p !== null);
  const desde = precios.length ? Math.min(...precios) : null;
  return `
    <div style="margin-top:14px;">
      <div style="display:inline-block;background:${marca.tan};padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Desde</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-0.01em;margin-top:8px;color:${
        desde === null ? "#96402F" : marca.tinta
      };">
        ${desde === null ? "CONSULTAR" : `${money(desde)} &nbsp;MXN`}
      </div>
    </div>`;
}

function bloqueTipologia(t: Tipologia, plano: string | null): string {
  return `
    <div style="display:flex;gap:22px;align-items:flex-start;padding:22px 0;border-top:1.5px solid ${marca.tinta};">
      ${imagen(plano, "Plano", "width:300px;height:210px;")}
      <div style="flex:1;">
        <div style="font-size:27px;font-weight:800;line-height:1.15;text-transform:uppercase;letter-spacing:-0.005em;">
          ${escapar(t.nombre)}
        </div>
        <div style="display:flex;align-items:center;gap:22px;margin-top:14px;">
          <span style="display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;">
            ${iconos.cama(24)} ${t.recamaras ?? "—"}
          </span>
          <span style="display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;">
            ${iconos.bano(22)} ${t.banos ?? "—"}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;font-size:19px;font-weight:700;text-transform:uppercase;">
          ${iconos.area(22)} ${
            t.m2Construccion ? `${t.m2Construccion} m² totales` : "[ m² totales ]"
          }
        </div>
        ${t.niveles.length > 1 ? tablaNiveles(t) : precioSuelto(t)}
      </div>
    </div>`;
}

function bloqueDesarrollo(d: Desarrollo, ultimo: boolean): string {
  const fotos = d.multimedia ?? [];
  const hero = fotos[0]?.url ?? null;
  const thumbs = [fotos[1]?.url ?? null, fotos[2]?.url ?? null, fotos[3]?.url ?? null];
  const planos = d.tipologias.map((_, i) => fotos[4 + i]?.url ?? null);

  return `
  <section style="padding:34px ${PADDING}px 40px;${ultimo ? "" : "break-after:page;"}">
    <h1 style="font-size:46px;font-weight:800;text-transform:uppercase;text-align:center;letter-spacing:-0.01em;line-height:1;">
      ${escapar(d.nombre)}
    </h1>
    <div style="text-align:center;margin-top:12px;">
      <span style="display:inline-block;background:#2B2B2B;color:#fff;padding:6px 14px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">
        ${escapar(d.tipo)}s
      </span>
    </div>
    <div style="text-align:center;margin-top:12px;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#4A453F;">
      ${escapar(d.ciudad)} · entrega ${escapar(d.entrega ?? "[por confirmar]")}
    </div>

    ${imagen(hero, "Render principal", `height:300px;margin-top:20px;width:${ANCHO_UTIL}px;`)}
    <div style="display:flex;gap:10px;margin-top:10px;">
      ${thumbs.map((t) => imagen(t, "", "flex:1;height:118px;")).join("")}
    </div>

    <div style="font-size:8px;line-height:1.7;letter-spacing:0.02em;color:#8C8479;margin-top:14px;">
      ${escapar(DISCLAIMER)}
    </div>

    <div style="display:flex;gap:14px;margin-top:14px;">
      ${boton("Brochure")}${boton("Renders")}${boton("Ubicación")}
    </div>

    <div style="margin-top:26px;">
      ${
        d.tipologias.length
          ? d.tipologias.map((t, i) => bloqueTipologia(t, planos[i])).join("")
          : `<div style="border-top:1.5px solid ${marca.tinta};padding:26px 0;font-size:15px;font-weight:700;color:#96402F;">
               [TIPOLOGÍAS Y PRECIOS POR CAPTURAR]
             </div>`
      }
    </div>

    <div style="background:${marca.tan};text-align:center;padding:11px;font-size:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-top:8px;">
      Esquema de pago
    </div>
    <div style="text-align:center;margin-top:16px;">
      <div style="font-size:20px;font-weight:800;text-transform:uppercase;">
        ${d.condiciones.enganchePct ?? "[?]"}% enganche
      </div>
      <div style="font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#4A453F;margin-top:4px;">
        ${escapar(d.condiciones.engancheNota ?? "[por confirmar]")}
      </div>
      <div style="font-size:20px;font-weight:800;text-transform:uppercase;margin-top:14px;">
        ${d.condiciones.restoPct ?? "[?]"}% ${escapar(
          (d.condiciones.restoNota ?? "crédito hipotecario").split(" a la ")[0],
        )}
      </div>
      <div style="font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#4A453F;margin-top:4px;">
        a la escritura
      </div>
    </div>

    ${
      d.aConsiderar.length
        ? `<div style="background:#2B2B2B;color:#fff;text-align:center;padding:12px;font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin-top:20px;">
             ${escapar(d.aConsiderar.join(" · "))}
           </div>`
        : ""
    }
  </section>`;
}

export function analisisHtml(
  propuesta: Propuesta,
  cliente: Cliente | null,
  desarrollos: Desarrollo[],
  asesor: string,
  claveGoogle: string | null = null,
): string {
  const conMapa = desarrollos.length > 1;
  const ubicados = desarrollos
    .filter((d) => d.lat !== null && d.lng !== null)
    .map((d) => ({ nombre: d.nombre, lat: d.lat as number, lng: d.lng as number }));

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><style>
${baseCss}
body { width: 816px; background: ${marca.fondoAnalisis}; }
section { background: ${marca.fondoAnalisis}; }
</style></head>
<body>

  <header style="background:${marca.negro};color:#fff;text-align:center;padding:30px ${PADDING}px 26px;">
    <div style="font-size:19px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">Análisis de</div>
    <div style="font-size:34px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">Propiedades</div>
    <div style="font-size:15px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;margin-top:10px;">
      Para: ${escapar(cliente?.nombre ?? "[CLIENTE]")}
    </div>
    <div style="font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;margin-top:4px;color:#D4CEC6;">
      Elaborado por: ${escapar(asesor)}
    </div>
    <div style="display:flex;justify-content:center;margin-top:14px;">${monograma(40, "#FFFFFF")}</div>
  </header>

  ${desarrollos
    .map((d, i) => bloqueDesarrollo(d, !conMapa && i === desarrollos.length - 1))
    .join("")}

  ${
    conMapa
      ? `<section style="padding:40px ${PADDING}px;">
           <h2 style="font-size:34px;font-weight:800;text-align:center;text-transform:uppercase;">Ubicaciones</h2>
           <div style="margin-top:22px;">
             ${mapaHtml({ puntos: ubicados, ancho: ANCHO_UTIL, alto: 430, claveGoogle })}
           </div>
           ${
             ubicados.length < desarrollos.length
               ? `<div style="text-align:center;margin-top:14px;font-size:11px;font-weight:700;color:#96402F;text-transform:uppercase;letter-spacing:0.06em;">
                    Sin coordenadas: ${desarrollos
                      .filter((d) => d.lat === null || d.lng === null)
                      .map((d) => escapar(d.nombre))
                      .join(" · ")}
                  </div>`
               : ""
           }
           <div style="text-align:center;margin-top:26px;font-size:11px;letter-spacing:0.06em;color:#6E675F;text-transform:uppercase;">
             Documento generado por Casa Cruz OS · ${escapar(propuesta.creadaEl)}
           </div>
         </section>`
      : ""
  }

</body>
</html>`;
}
