const CACHE = 'woshicnd-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icons/favicon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Réseau en priorité, cache seulement en repli hors-ligne. L'ancienne
  // version faisait `cached || network` : elle servait immédiatement la
  // version en cache dès qu'elle existait et ne mettait à jour qu'en
  // arrière-plan pour "la prochaine fois" — ce qui fait qu'un appareil qui
  // avait déjà une version en cache continuait de la voir indéfiniment tant
  // qu'aucune revisite "suivante" ne déclenchait la mise à jour.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(cache => cache.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
