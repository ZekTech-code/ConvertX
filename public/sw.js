// sw.js - Service Worker with Dev Mode Self-Destruct
const isDev = 
  self.location.hostname === "localhost" || 
  self.location.hostname === "127.0.0.1" || 
  self.location.hostname.startsWith("192.168.") ||
  self.location.hostname.startsWith("10.") ||
  self.location.hostname.startsWith("172.") ||
  self.location.hostname.endsWith(".local");

if (isDev) {
  console.warn("Service Worker running in development mode. Self-destructing to prevent caching dev assets.");
  
  self.addEventListener("install", () => {
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      }).then(() => {
        return self.registration.unregister();
      }).then(() => {
        console.log("Service Worker successfully self-destructed and caches cleared in dev.");
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          if (client.url && "navigate" in client) {
            client.navigate(client.url);
          }
        });
      })
    );
  });
} else {
  // Production Service Worker Caching Strategy
  const CACHE_NAME = "convertx-cache-v3";
  const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/favicon.svg",
    "/favicon-16.png",
    "/favicon-32.png",
    "/icon-192.png",
    "/icon-512.png",
    "/manifest.json"
  ];

  self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
          console.warn("Pre-caching assets skipped in dev: ", err);
        });
      })
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }).then(() => self.clients.claim())
    );
  });

  self.addEventListener("fetch", (event) => {
    // Only intercept HTTP/S requests, skip chrome-extension:// or file:// requests
    if (!event.request.url.startsWith("http")) return;

    // Use network-first strategy for HTML pages so updates are picked up immediately
    const isPageRequest =
      event.request.mode === "navigate" ||
      event.request.headers.get("accept")?.includes("text/html");

    if (isPageRequest) {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            // Update the cache with the fresh response
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback: serve from cache
            return caches.match(event.request);
          })
      );
      return;
    }

    // Cache-first strategy for static assets (JS, CSS, images, fonts)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (
            networkResponse.status === 200 &&
            new URL(event.request.url).origin === self.location.origin
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.log("Fetch failed; returning offline fallback if available", err);
        });
      })
    );
  });
}
