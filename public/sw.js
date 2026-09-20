/*
 * Beyond Now service worker.
 *
 * Strategy
 *   - App shell + assets: cache-first with background refresh (stale-while-revalidate)
 *   - Public pages:       network-first, fall back to cache when offline
 *   - Firebase RTDB/Storage/API: never cached (always network)
 *   - Member account data: never cached here (Realtime Database keeps its own
 *     offline cache, so this worker deliberately stays out of the way)
 *
 * Installing this worker is optional. The site works fully without it; the
 * worker only adds offline reading and faster repeat loads.
 */

const VERSION = "bn-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const PAGE_CACHE = `${VERSION}-pages`;

// Pre-cached at install. Kept deliberately small so the install never blocks.
const PRECACHE = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg"];

// Requests that must always hit the network (Firebase endpoints).
const NEVER_CACHE = [
  /firebaseio\.com/,
  /firebasedatabase\.app/,
  /firebasestorage\.googleapis\.com/,
  /firebasestorage\.app/,
  /googleapis\.com\/identitytoolkit/,
  /googleapis\.com\/securetoken/,
  /gstatic\.com\/firebasejs/,
  /app-check/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle same-origin GET requests.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((pattern) => pattern.test(request.url))) return;

  // Navigations: network-first so members always get the newest shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/index.html")),
        ),
    );
    return;
  }

  // Static assets: cache-first with background refresh.
  if (/\.(?:css|js|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

// Allows the app to trigger an immediate update when a new worker is deployed.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
