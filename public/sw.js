// Next Generation Roofing — Service Worker
// Strategy:
//   - Static assets (JS, CSS, fonts, icons): cache-first
//   - Images: cache-first with 30-day expiry
//   - Supabase API calls: network-only (never cache sensitive data)
//   - HTML navigation: network-first with offline fallback to cached shell

const CACHE_NAME = 'ngr-v1';
const OFFLINE_URL = '/';

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon.svg',
];

// ─── Install: pre-cache the app shell ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate: remove stale caches from previous versions ───────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ─── Fetch: route-based caching strategies ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache Supabase API or auth requests
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/auth') ||
    request.method !== 'GET'
  ) {
    return; // Fall through to browser default (network)
  }

  // 2. Images — cache-first, falling back to network
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 3. Static assets (JS/CSS/fonts/icons) — cache-first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 4. HTML navigation — network-first, offline fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations for offline fallback
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(OFFLINE_URL, response.clone())
            );
          }
          return response;
        })
        .catch(async () => {
          // Offline: serve the cached app shell so React routing still works
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(OFFLINE_URL)) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // 5. Everything else — network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
