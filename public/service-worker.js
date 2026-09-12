// TWING হিসাবি — Progressive Web App Service Worker (v2.5.0)
const CACHE_NAME = 'twing-hisabi-cache-v2.5.0';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/icon.svg'
];

// Install Event: Precaches essential shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('TWING Hisabi SW cache.addAll non-fatal notice:', err);
      });
    })
  );
});

// Activate Event: Clean up all older caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for dynamic API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests, API routes, Vite dev server endpoints, and source files
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@fs') ||
    url.pathname.startsWith('/@id') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('node_modules')
  ) {
    return;
  }

  // Navigation requests (HTML pages) - always use network directly
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response(
          '<!doctype html><html lang="bn"><head><meta charset="UTF-8"><title>TWING হিসাবি অফলাইন</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;background:#002820;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;"><div><h2>TWING হিসাবি অফলাইন মোড</h2><p style="color:#a7f3d0">ইন্টারনেট সংযোগ চেক করে পুনরায় রিলোড করুন।</p><button onclick="location.reload()" style="padding:10px 20px;background:#10b981;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">রিলোড করুন</button></div></body></html>',
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      })
    );
    return;
  }

  // Static Assets (Cache First with Background Revalidation)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch update in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an image, fallback to icon if available
          if (event.request.destination === 'image') {
            return caches.match('/icon-192.png');
          }
          return new Response('Asset offline', { status: 503, statusText: 'Service Unavailable' });
        });
    })
  );
});
