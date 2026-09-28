import assert from "node:assert/strict";
import { test } from "node:test";
import { COLORES_MARCA, ISOTIPO, LEMA, LOGOTIPO, PALABRA, svgIsotipo, svgLogotipo, svgPalabra } from "./marca.ts";

test("las piezas de la marca caben dentro del logotipo completo", () => {
  for (const { caja } of [PALABRA, LEMA]) {
    assert.ok(caja.x > ISOTIPO.ancho, "el texto va a la derecha del isotipo");
    assert.ok(caja.x + caja.ancho <= LOGOTIPO.ancho + 0.01);
    assert.ok(caja.y >= 0 && caja.y + caja.alto <= LOGOTIPO.alto);
  }
  assert.equal(LOGOTIPO.alto, ISOTIPO.alto);
  // Dos tamaños de punto, como en el original: dos grandes y cuatro chicos.
  const radios = ISOTIPO.puntos.map(([, , r]) => r).sort((a, b) => a - b);
  assert.deepEqual(radios, [2.21, 2.21, 2.21, 2.21, 4.69, 4.69]);
});

test("el isotipo hereda el color y respeta la proporción al pedir un alto", () => {
  const svg = svgIsotipo({ alto: 84 });
  assert.match(svg, /fill="currentColor"/);
  assert.match(svg, /width="70.34" height="84"/);
  assert.equal(svg.match(/<circle /g)?.length, 6);
  assert.match(svg, /role="img" aria-label="Casa Cruz"/);
});

test("el logotipo puede llevar el texto de otro color, como el original", () => {
  const svg = svgLogotipo({ color: COLORES_MARCA.isotipo, colorTexto: COLORES_MARCA.texto });
  assert.match(svg, /<g fill="#000000">/);
  assert.match(svg, /<g fill="#302C29">/);
  assert.match(svg, new RegExp(`viewBox="0 0 ${LOGOTIPO.ancho} ${LOGOTIPO.alto}"`));
});

test("la palabra sola se recorta a su caja y la marca decorativa no se anuncia", () => {
  const { x, y, ancho, alto } = PALABRA.caja;
  const svg = svgPalabra({ titulo: "" });
  assert.match(svg, new RegExp(`viewBox="${x} ${y} ${ancho} ${alto}"`));
  assert.match(svg, /aria-hidden="true"/);
  assert.doesNotMatch(svg, /aria-label/);
  assert.match(svgIsotipo({ titulo: 'Casa "Cruz"' }), /aria-label="Casa &quot;Cruz&quot;"/);
});
