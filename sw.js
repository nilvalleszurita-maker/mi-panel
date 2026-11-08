// Service worker: guarda los archivos de la app para que funcione sin conexión.
// Estrategia "red primero": si hay internet usa la versión más nueva,
// si no, tira de la copia guardada.
const CACHE = 'mi-panel-v6';
const ARCHIVOS = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest',
  'js/store.js', 'js/utils.js', 'js/finanzas.js', 'js/entrenos.js', 'js/gym-plan.js', 'js/gym-figuras.js', 'js/gym.js', 'js/app.js',
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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
