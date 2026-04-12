// Strategy AI — Service Worker (PWA)
// v6: shell/tailwind — network-first (как app.js), иначе после деплоя можно долго видеть старый CSS из cache-first
const CACHE = 'strategy-ai-v6';

function isApiOrSocket(u) {
  return u.href.includes('/api/') || u.pathname.includes('socket');
}

function isCriticalDocument(url) {
  const p = url.pathname;
  return (
    p === '/app.js' ||
    p === '/' ||
    p === '/index.html' ||
    p === '/global.css' ||
    p === '/landing.css' ||
    p === '/strategy-shell.css' ||
    p === '/tailwind.css'
  );
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          '/logo.png',
          '/manifest.json',
          '/global.css',
          '/landing.css',
          '/strategy-shell.css',
          '/tailwind.css',
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (isApiOrSocket(url)) return;

  if (isCriticalDocument(url)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then((r) => {
          if (r.ok && r.type === 'basic') {
            const clone = r.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((r) => {
          if (r.ok && r.type === 'basic') {
            const clone = r.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return r;
        })
    )
  );
});
