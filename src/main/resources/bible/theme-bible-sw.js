const CACHE_NAME = 'halo-plugin-bible-shell-v1.0.11';
const RUNTIME_CACHE_PREFIXES = ['halo-plugin-bible-data-'];
const PRECACHE_URLS = [
  './theme-bible-page.html',
  './theme-bible-page.css',
  './theme-bible-note-editor.js',
  './theme-bible-page.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './login.png',
  './bible.csv',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key === CACHE_NAME || RUNTIME_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          return null;
        }
        return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (shouldHandleRequest(url, event.request)) {
    event.respondWith(serveNetworkFirst(event.request));
  }
});

function shouldHandleRequest(url, request) {
  if (request.mode === 'navigate') {
    return true;
  }

  return [
    '/theme-bible-page.css',
    '/theme-bible-note-editor.js',
    '/theme-bible-page.js',
    '/manifest.webmanifest',
    '/icon-192.png',
    '/icon-512.png',
    '/login.png',
    '/bible.csv',
  ].some((suffix) => url.pathname.endsWith(suffix));
}

async function serveNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }

    if (request.mode === 'navigate') {
      const fallback = await cache.match('./theme-bible-page.html', { ignoreSearch: true });
      if (fallback) {
        return fallback;
      }
    }

    throw error;
  }
}
