// F4 — Service Worker DailyLog (offline-first, tanpa workbox).
// API GET: network-first lalu cache (fallback baca offline).
// Aset/statis: cache-first. Hanya tangani GET same-origin.

const CACHE = 'dailylog-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    // Hanya cache baca kalender/statistik; mutasi tidak pernah GET sehingga aman.
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || Response.error()))
    );
    return;
  }
  e.respondWith(
    caches.match(request).then(
      (hit) => hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('/index.html'))
    )
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { /* abaikan */ }
  e.waitUntil(
    self.registration.showNotification(data.title || 'DailyLog', {
      body: data.body || 'Ada pengingat untuk Anda.',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
