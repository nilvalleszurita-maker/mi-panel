// Service worker: guarda los archivos de la app para que funcione sin conexión.
// Estrategia "red primero": si hay internet usa la versión más nueva,
// si no, tira de la copia guardada.
const CACHE = 'mi-panel-v15';
const ARCHIVOS = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest',
  'js/store.js', 'js/utils.js', 'js/hoy-datos.js', 'js/hoy.js', 'js/finanzas.js', 'js/gym-plan.js', 'js/gym-figuras.js', 'js/gym.js', 'js/outfits-datos.js', 'js/outfits.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Solo se ocupa de los archivos de la propia app y de las tipografías. Las peticiones
// a otras webs (p. ej. el tiempo de Open-Meteo) van directas: la app gestiona si fallan.
const TIPOGRAFIAS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin && !TIPOGRAFIAS.includes(url.hostname)) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
        return r;
      })
      // Sin conexión: la copia guardada; y si se está abriendo la app, su página de inicio.
      .catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
