import { galeria, money } from "@casacruz/core";
import type { Desarrollo, Tipologia } from "@casacruz/core";
import { DISCLAIMER, baseCss, escapar, iconos, imagen, isotipo, marca } from "./estilo";

/**
 * Ficha de propiedad, calcada del formato de Casa Cruz.
 *
 * Página de 1920 × 1080 px CSS = 1440 × 810 pt, exactamente el tamaño del PDF
 * original del diseñador.
 */

export const FICHA_ANCHO = "1920px";
export const FICHA_ALTO = "1080px";

const cursor = `
  <svg width="26" height="26" viewBox="0 0 24 24" fill="${marca.tinta}" style="margin-left:6px;">
    <path d="M5 2l14 8.5-6 1.3L10 20z"/>
  </svg>`;

function fila(etiqueta: string, valor: string | null, ultima = false): string {
  const falta = valor === null;
  return `
    <div style="display:flex;">
      <div style="width:520px;background:${marca.tan};padding:22px 26px;font-size:22px;font-weight:700;letter-spacing:0.01em;text-transform:uppercase;border-right:3px solid ${marca.fondoFicha};${
        ultima ? "" : `border-bottom:3px solid ${marca.fondoFicha};`
      }">${escapar(etiqueta)}</div>
      <div style="flex:1;border:1px solid ${marca.tinta};${
        ultima ? "" : "border-bottom:none;"
      }padding:22px 26px;text-align:center;font-size:26px;font-weight:600;color:${
        falta ? "#96402F" : marca.tinta
      };">${escapar(valor ?? "[POR CAPTURAR]")}</div>
    </div>`;
}

export function fichaHtml(desarrollo: Desarrollo, tipologia: Tipologia | undefined): string {
  const precios = (tipologia?.niveles ?? [])
    .map((n) => n.precioVenta)
    .filter((p): p is number => p !== null);
  const desde = precios.length ? Math.min(...precios) : null;
  const enganchePct = desarrollo.condiciones.enganchePct;
  const enganche = desde !== null && enganchePct !== null ? (desde * enganchePct) / 100 : null;

  const fotos = galeria(desarrollo);
  const fachada = fotos.principal;
  const amenidad = fotos.secundarias[0] ?? null;
  const interiores = fotos.secundarias[1] ?? null;

  const destacables = desarrollo.amenidades.length
    ? desarrollo.amenidades
    : ["[AMENIDAD POR CAPTURAR]"];

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><style>
${baseCss}
body { width: 1920px; height: 1080px; background: ${marca.fondoFicha}; padding: 64px 72px; display: flex; gap: 46px; }
.boton { width: 268px; height: 62px; background: ${marca.tan}; display: flex; align-items: center; justify-content: center;
         font-size: 21px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
         text-decoration: underline; text-underline-offset: 5px; }
</style></head>
<body>

  <div style="width:760px;display:flex;flex-direction:column;">
    ${imagen(fachada, "Fachada", "height:531px;")}
    <div style="display:flex;gap:22px;margin-top:22px;">
      ${imagen(amenidad, "Amenidad", "flex:1;height:349px;")}
      ${imagen(interiores, "Interiores", "flex:1;height:349px;")}
    </div>
    <div style="flex:1;"></div>
    <div style="font-size:11px;font-weight:500;line-height:1.7;letter-spacing:0.04em;color:${marca.gris};">
      ${escapar(DISCLAIMER)}
    </div>
  </div>

  <div style="flex:1;display:flex;flex-direction:column;">
    <h1 style="font-size:62px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;line-height:1;">
      ${escapar(tipologia ? `${tipologia.recamaras ?? "?"} habitaciones` : "[TIPOLOGÍA]")}
    </h1>

    <div style="font-size:26px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;margin-top:16px;">
      ${escapar(desarrollo.estatus === "publicado" ? "Preventa" : desarrollo.estatus)} · entrega ${escapar(
        desarrollo.entrega ?? "[POR CONFIRMAR]",
      )}
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-top:26px;">
      ${iconos.pin(24)}
      <span style="font-size:27px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#3A352F;">
        ${escapar(desarrollo.ciudad)} / ${escapar(desarrollo.nombre)}
      </span>
    </div>

    <div style="display:flex;align-items:center;gap:40px;margin-top:34px;">
      <span style="width:220px;font-size:22px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;line-height:1.35;">
        ${escapar(tipologia?.nombre ?? "[MODELO]")}
      </span>
      <div style="display:flex;align-items:center;gap:10px;">
        ${iconos.cama(34)}<span style="font-size:30px;font-weight:600;">${tipologia?.recamaras ?? "—"}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${iconos.bano(32)}<span style="font-size:30px;font-weight:600;">${tipologia?.banos ?? "—"}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        ${iconos.area(32)}
        <div style="display:flex;flex-direction:column;">
          <span style="font-size:25px;font-weight:600;letter-spacing:0.02em;">${
            tipologia?.m2Construccion ? `${tipologia.m2Construccion} M²` : "[ M² ]"
          }</span>
          <span style="font-size:15px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#4A453F;">Construcción</span>
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;margin-top:34px;">
      ${fila("Precio de lista", desde === null ? null : money(desde))}
      ${fila("Precio de venta", desde === null ? null : money(desde))}
      ${fila(`Enganche (${enganchePct ?? "?"}%)`, enganche === null ? null : money(enganche))}
      ${fila("Equipamiento", null, true)}
    </div>

    <div style="margin-top:34px;">
      <div style="font-size:24px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">Destacables</div>
      <div style="margin-top:12px;">
        ${destacables
          .map(
            (a) =>
              `<div style="font-size:19px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;line-height:1.9;">· ${escapar(
                a,
              )}</div>`,
          )
          .join("")}
      </div>
    </div>

    <div style="flex:1;"></div>

    <div style="display:flex;align-items:flex-end;gap:26px;">
      <div class="boton">Brochure ${cursor}</div>
      <div class="boton">Video ${cursor}</div>
      <div style="flex:1;"></div>
      ${isotipo(84)}
    </div>
  </div>

</body>
</html>`;
}
