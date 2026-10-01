// Ejecutar con la web local en modo demostración, sin API_URL.
// No envía formularios ni modifica clientes o propuestas.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

const base = process.env.MOBILE_QA_URL || 'http://127.0.0.1:3100';
function exigirLocal(url) {
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) {
    throw new Error('La auditoría sólo permite servidores locales de pruebas.');
  }
}
exigirLocal(base);
const widths = (process.env.MOBILE_QA_WIDTHS || '320,390,768,1024,1280,1440').split(',').map(Number);
const output = path.resolve(__dirname, '../.next/mobile-qa');
const cases = [
  ['/login'], ['/cuenta/contrasena'], ['/inicio'], ['/inicio', 'menu'],
  ['/propiedades'], ['/propiedades?q=Playa'],
  ...['playa-park', 'playa-encantada', 'real-aurora'].map(id => [`/propiedades/${id}`]),
  ...['ARGUMENTOS COMERCIALES', 'INFORMACIÓN INTERNA', 'TRAZABILIDAD'].map(tab => ['/propiedades/playa-park', tab]),
  ['/propiedades/playa-park/simulador'], ['/propiedades/playa-park/cambio'],
  ...[1, 2, 3, 4, 5, 6].map(step => [`/propiedades/playa-park/editar?paso=${step}`]),
  ['/alta'], ['/comparar'], ['/propuestas'], ['/propuestas/nueva'],
  ['/propuestas/nueva?cliente=c-berenice-fabian'], ['/clientes'], ['/clientes/nuevo'],
  ['/clientes/c-berenice-fabian'], ['/capacitacion'],
  ['/capacitacion/puebla/evaluacion'], ['/control'], ['/control/usuarios'], ['/preguntar'],
  ['/inicio', 'instalar'], ['/control/usuarios', 'accesos'],
  ['/p/berenice-fabian'], ['/doc/ficha/playa-park'], ['/doc/pdf/berenice-fabian'],
  ['/doc/presentacion/berenice-fabian'],
];

async function overflow(page) {
  return page.evaluate(() => {
    const issues = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!(el instanceof HTMLElement) || el.closest('nextjs-portal, [data-scroll-x]')) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height || style.display === 'contents' || el.closest('[data-document-sheet]')) continue;
      if (['auto', 'scroll'].includes(style.overflowX) && el.scrollWidth > el.clientWidth + 2) {
        issues.push({ text: el.innerText.slice(0, 100), tag: el.tagName, classes: el.className, client: el.clientWidth, scroll: el.scrollWidth });
      }
    }
    if (document.documentElement.scrollWidth > innerWidth + 2) {
      issues.push({ tag: 'DOCUMENT', client: innerWidth, scroll: document.documentElement.scrollWidth });
    }
    // Detecta también contenido cortado, aunque un padre oculte el desborde.
    for (const el of document.querySelectorAll('main button, main input, main select, main textarea, main a, dialog button, dialog a')) {
      if (el.closest('[data-scroll-x], [data-document-sheet]') || el.classList.contains('sr-only')) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.right > innerWidth + 2 || rect.left < -2 || (el.tagName !== 'TEXTAREA' && el.scrollHeight > el.clientHeight + 3)) {
        issues.push({ tag: el.tagName, text: el.textContent.slice(0, 80), classes: el.className, left: rect.left, right: rect.right, height: el.clientHeight, contentHeight: el.scrollHeight });
      }
    }
    return issues;
  });
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  let token;
  if (process.env.MOBILE_QA_API) {
    exigirLocal(process.env.MOBILE_QA_API);
    const health = await (await fetch(process.env.MOBILE_QA_API + '/salud')).json();
    if (health.origenDeDatos !== 'mock') throw new Error('La API de pruebas debe usar datos en memoria.');
    const response = await fetch(process.env.MOBILE_QA_API + '/sesion', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ correo: process.env.MOBILE_QA_CORREO || 'direccion@casacruz.mx', contrasena: 'casacruz' }),
    });
    if (!response.ok) throw new Error('No se pudo iniciar la sesión de demostración');
    token = (await response.json()).token;
  } else {
    const probe = await browser.newPage();
    await probe.goto(base + '/login');
    const demo = await probe.getByRole('link', { name: 'Entrar sin sesión (sólo demostración)' }).count();
    await probe.close();
    if (!demo) {
      await browser.close();
      throw new Error('Usa una web sin API_URL o define MOBILE_QA_API con una API local en memoria.');
    }
  }
  const results = [];
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    if (token) await page.context().addCookies([{ name: 'cc-sesion', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    for (const [route, state] of cases) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      try {
        const response = await page.goto(base + route);
        await page.waitForTimeout(250);
        if ((state === 'menu' || state === 'instalar') && width < 1280) {
          await page.getByRole('button', { name: 'Más', exact: true }).click();
          if (state === 'instalar') await page.getByRole('button', { name: 'Instalar Casa Cruz en mi celular' }).click();
        } else if (state === 'accesos') {
          for (const details of await page.locator('details').all()) await details.evaluate(el => { el.open = true; });
        } else if (state && !['menu', 'instalar'].includes(state)) await page.getByRole('tab', { name: state }).click();
        await page.waitForTimeout(100);
        const issues = await overflow(page);
        const result = { width, route, state, actualRoute: new URL(page.url()).pathname, status: response.status(), issues, errors };
        results.push(result);
        if (issues.length || errors.length || response.status() >= 400) {
          console.log(JSON.stringify(result));
          await page.screenshot({ path: path.join(output, `${width}-${results.length}.png`), fullPage: true });
        }
      } catch (error) {
        const result = { width, route, state, error: error.message };
        results.push(result);
        console.log(JSON.stringify(result));
      }
      page.off('pageerror', onError);
    }
    await page.close();
  }
  await browser.close();
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter(r => r.error || r.status >= 400 || r.issues.length || r.errors.length);
  console.log(`${results.length} vistas verificadas; ${failed.length} con incidencias. Resultados: ${output}`);
  process.exitCode = failed.length ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
