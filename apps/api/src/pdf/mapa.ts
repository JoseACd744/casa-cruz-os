import { escapar, iconos, marca } from "./estilo";

/**
 * Mapa de ubicaciones generado por código.
 *
 * El fondo es una imagen estática de mapa (satélite, como en los documentos que
 * hacía el diseñador) y encima se dibujan los pines y las etiquetas con la
 * tipografía de Casa Cruz. La posición de cada pin se calcula con la proyección
 * de Mercator, la misma que usan Google y Mapbox, así que cae exactamente donde
 * le corresponde a sus coordenadas.
 */

export interface PuntoMapa {
  nombre: string;
  lat: number;
  lng: number;
}

export interface OpcionesMapa {
  puntos: PuntoMapa[];
  ancho: number;
  alto: number;
  /** Centro explícito; si no se da, se calcula del promedio de los puntos. */
  centro?: { lat: number; lng: number };
  zoom?: number;
  /** Clave de Google Maps Static. Sin ella se usan mosaicos abiertos. */
  claveGoogle?: string | null;
}

const TILE = 256;

function proyectar(lat: number, lng: number, zoom: number) {
  const escala = TILE * 2 ** zoom;
  const x = ((lng + 180) / 360) * escala;
  const sen = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sen) / (1 - sen)) / (4 * Math.PI)) * escala;
  return { x, y };
}

/** Zoom más cercano en el que todos los puntos siguen cabiendo. */
function calcularZoom(puntos: PuntoMapa[], ancho: number, alto: number): number {
  if (puntos.length < 2) return 13;
  for (let zoom = 17; zoom >= 3; zoom -= 1) {
    const proyectados = puntos.map((p) => proyectar(p.lat, p.lng, zoom));
    const xs = proyectados.map((p) => p.x);
    const ys = proyectados.map((p) => p.y);
    const margen = 120;
    if (
      Math.max(...xs) - Math.min(...xs) < ancho - margen &&
      Math.max(...ys) - Math.min(...ys) < alto - margen
    ) {
      return zoom;
    }
  }
  return 3;
}

/** Fondo satelital de Google Static Maps (se ve igual que los PDFs originales). */
function fondoGoogle(
  centro: { lat: number; lng: number },
  zoom: number,
  ancho: number,
  alto: number,
  clave: string,
): string {
  const params = new URLSearchParams({
    center: `${centro.lat},${centro.lng}`,
    zoom: String(zoom),
    size: `${Math.min(ancho, 640)}x${Math.min(alto, 640)}`,
    scale: "2",
    maptype: "satellite",
    format: "png",
    key: clave,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Mosaico de teselas abiertas: sirve para trabajar sin clave de Google. */
function mosaicoAbierto(
  centro: { lat: number; lng: number },
  zoom: number,
  ancho: number,
  alto: number,
): string {
  const c = proyectar(centro.lat, centro.lng, zoom);
  const izquierda = c.x - ancho / 2;
  const arriba = c.y - alto / 2;
  const primeraX = Math.floor(izquierda / TILE);
  const primeraY = Math.floor(arriba / TILE);
  const ultimaX = Math.floor((izquierda + ancho) / TILE);
  const ultimaY = Math.floor((arriba + alto) / TILE);

  const teselas: string[] = [];
  for (let x = primeraX; x <= ultimaX; x += 1) {
    for (let y = primeraY; y <= ultimaY; y += 1) {
      const izq = x * TILE - izquierda;
      const arr = y * TILE - arriba;
      teselas.push(
        `<img src="https://tile.openstreetmap.org/${zoom}/${x}/${y}.png" width="${TILE}" height="${TILE}"
              style="position:absolute;left:${izq}px;top:${arr}px;" alt="">`,
      );
    }
  }
  return teselas.join("");
}

export function mapaHtml(opciones: OpcionesMapa): string {
  const { puntos, ancho, alto, claveGoogle } = opciones;

  if (!puntos.length) {
    return `<div class="marcador" style="width:${ancho}px;height:${alto}px;">
      Ubicaciones por capturar
    </div>`;
  }

  const centro =
    opciones.centro ?? {
      lat: puntos.reduce((s, p) => s + p.lat, 0) / puntos.length,
      lng: puntos.reduce((s, p) => s + p.lng, 0) / puntos.length,
    };
  const zoom = opciones.zoom ?? calcularZoom(puntos, ancho, alto);
  const c = proyectar(centro.lat, centro.lng, zoom);

  const fondo = claveGoogle
    ? `<img src="${fondoGoogle(centro, zoom, ancho, alto, claveGoogle)}"
            style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" alt="">`
    : mosaicoAbierto(centro, zoom, ancho, alto);

  const marcas = puntos
    .map((p) => {
      const q = proyectar(p.lat, p.lng, zoom);
      const x = ancho / 2 + (q.x - c.x);
      const y = alto / 2 + (q.y - c.y);
      // La etiqueta va arriba del pin, como en los documentos originales.
      return `
        <div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;">
          <span style="background:#2B2B2B;color:#fff;padding:5px 10px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;">
            ${escapar(p.nombre)}
          </span>
          <span style="margin-top:2px;">${iconos.pin(24, "#E05A47")}</span>
        </div>`;
    })
    .join("");

  const atribucion = claveGoogle ? "Google" : "OpenStreetMap";

  return `
    <div style="position:relative;width:${ancho}px;height:${alto}px;overflow:hidden;background:${marca.marcador};">
      ${fondo}
      ${marcas}
      <span style="position:absolute;right:6px;bottom:4px;font-size:8px;color:#fff;background:rgba(0,0,0,0.45);padding:2px 6px;letter-spacing:0.04em;">
        © ${atribucion}
      </span>
    </div>`;
}
