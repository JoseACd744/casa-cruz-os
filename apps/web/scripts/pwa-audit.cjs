// Prueba sobre una compilación local de producción; no escribe datos comerciales.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MOBILE_QA_URL || 'http://127.0.0.1:3100';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) {
  throw new Error('La auditoría sólo permite servidores locales de pruebas.');
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(base + '/login');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  const manifest = await (await context.request.get(base + '/manifest.webmanifest')).json();
  const cdp = await context.newCDPSession(page);
  assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors, []);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.id, '/');
  assert.equal(manifest.orientation, 'any');
  for (const icon of manifest.icons) {
    const response = await context.request.get(base + icon.src);
    assert.equal(response.status(), 200);
    const bytes = await response.body();
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
  const worker = await context.request.get(base + '/sw.js');
  assert.match(worker.headers()['cache-control'], /no-store/);
  // Safari y navegadores que no emiten beforeinstallprompt tienen instrucciones.
  await page.getByRole('button', { name: 'Instalar Casa Cruz en mi celular' }).click();
  assert.match(await page.getByRole('status').innerText(), /Safari/);
  await page.evaluate(() => {
    window.__prompts = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.__prompts++; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  });
  assert.equal(await page.evaluate(() => window.__prompts), 0);
  await page.getByRole('button', { name: 'Instalar Casa Cruz en mi celular' }).click();
  assert.equal(await page.evaluate(() => window.__prompts), 1);
  // El evento de instalación es de un solo uso.
  await page.getByRole('button', { name: 'Instalar Casa Cruz en mi celular' }).click();
  assert.equal(await page.evaluate(() => window.__prompts), 1);

  // Una respuesta HTTP 404 permanece 404; sólo un fallo de red usa el aviso.
  const missing = await page.goto(base + '/no-existe-para-qa');
  assert.equal(missing.status(), 404);
  const cached = await page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.startsWith('casacruz-offline-'));
    const urls = [];
    for (const name of names) for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
    return urls;
  });
  assert.deepEqual(cached, ['/offline.html']);
  await context.setOffline(true);
  await page.goto(base + '/propiedades/playa-park');
  await page.getByRole('heading', { name: 'Estás sin conexión' }).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(), /\$|Berenice/);
  // Las peticiones de API no reciben HTML de una pantalla ni se ponen en cola.
  assert.equal(await page.evaluate(async () => {
    try { await fetch('/api/qa', { method: 'POST', body: 'qa' }); return false; } catch { return true; }
  }), true);
  await context.setOffline(false);
  await page.getByRole('link', { name: 'Volver a intentar' }).click();
  await page.getByRole('heading', { name: 'Estás sin conexión' }).waitFor({ state: 'hidden' });
  await browser.close();
  console.log('PWA OK: manifiesto, iconos, instalación, caché sólo del aviso, offline y recuperación.');
})().catch(error => { console.error(error); process.exitCode = 1; });
