// Sólo se guarda el aviso genérico. Nunca se almacenan pantallas, API ni sesiones.
const CACHE = "casacruz-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("casacruz-offline-") && key !== CACHE).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  // Un error HTTP también viene del servidor: se conserva tal cual.
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(OFFLINE)) || Response.error();
  }));
});
