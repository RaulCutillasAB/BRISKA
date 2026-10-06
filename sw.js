/* BRISKA — service worker: juego disponible sin conexión */
const CACHE = 'briska-v1';
const FILES = [
  './', './index.html', './css/style.css', './manifest.json', './icon.svg',
  './js/core/rng.js', './js/core/data.js', './js/core/hands.js', './js/core/talismans.js', './js/core/consumables.js',
  './js/core/scoring.js', './js/core/game.js', './js/core/meta.js',
  './js/ui/icons.js', './js/ui/art.js', './js/ui/audio.js', './js/ui/bg.js', './js/ui/fx.js', './js/ui/view.js', './js/ui/screens.js', './js/main.js',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return isFont ? (hit || net) : (net || hit);
    })
  );
});
