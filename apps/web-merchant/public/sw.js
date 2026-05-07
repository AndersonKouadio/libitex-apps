// Service Worker LIBITEX — strategie cache-first pour les assets statiques,
// network-first pour les pages, offline fallback.

const CACHE_VERSION = "libitex-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Ne pas cacher les appels API
  if (url.pathname.startsWith("/api/") || url.hostname.includes("libitex-api")) return;

  // Cache-first pour les images / assets statiques
  if (request.destination === "image" || /\.(woff2?|ttf|eot|svg|png|jpe?g|webp|avif|css|js)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ?? fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        }),
      ),
    );
    return;
  }

  // Network-first pour les documents (HTML), avec fallback cache
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match("/"))),
    );
  }
});
