// Service Worker for Axpo PWA - Mobile Optimized with Cache Busting
// IMPORTANT: Increment this version number on every deployment to force cache update
const VERSION = "v3.0.9";
const CACHE_NAME = `axpo-${VERSION}`;
const STATIC_CACHE = `axpo-static-${VERSION}`;
const DYNAMIC_CACHE = `axpo-dynamic-${VERSION}`;

// Cache duration in milliseconds (1 hour for HTML, 24 hours for assets)
const HTML_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const ASSET_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Core assets to cache (only essential static assets)
const STATIC_ASSETS = ["/logo.jpg", "/manifest.json"];

// Install event - Mobile optimized
self.addEventListener("install", (event) => {
  console.log(`Service Worker ${VERSION} installing...`);

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Static cache opened");
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error("Static cache installation failed:", error);
        // Don't fail the installation for cache errors
        return Promise.resolve();
      })
      .then(() => {
        // Skip waiting for immediate activation (important for mobile)
        return self.skipWaiting();
      })
  );
});

// Helper function to check if cached response is still fresh
function isCacheFresh(response, maxAge) {
  if (!response) return false;

  const cachedDate = response.headers.get("sw-cache-date");
  if (!cachedDate) return false;

  const age = Date.now() - parseInt(cachedDate);
  return age < maxAge;
}

// Fetch event - Network-first strategy with smart caching
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests and non-HTTP(S) requests
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  // Skip chrome-extension and other non-app requests
  if (
    request.url.includes("chrome-extension") ||
    request.url.includes("chrome-devtools") ||
    request.url.includes("safari-extension") ||
    request.url.includes("google.com/gsi") ||
    request.url.includes("accounts.google.com") ||
    request.url.includes("firebase")
  ) {
    return;
  }

  const url = new URL(request.url);
  const isHTMLRequest =
    request.destination === "document" ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html");
  const isJSOrCSS =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.includes("/assets/");

  // For HTML files: Always try network first (with short cache fallback)
  if (isHTMLRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response with timestamp
          const responseToCache = response.clone();
          const headers = new Headers(responseToCache.headers);
          headers.append("sw-cache-date", Date.now().toString());

          const cachedResponse = new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers,
          });

          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, cachedResponse);
          });

          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (
              cachedResponse &&
              isCacheFresh(cachedResponse, HTML_CACHE_DURATION)
            ) {
              return cachedResponse;
            }
            // Return a basic offline page
            return new Response("Offline - Please check your connection", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/plain" },
            });
          });
        })
    );
    return;
  }

  // For JS/CSS/Assets: Network first with longer cache fallback
  if (isJSOrCSS) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            const headers = new Headers(responseToCache.headers);
            headers.append("sw-cache-date", Date.now().toString());

            const cachedResponse = new Response(responseToCache.body, {
              status: responseToCache.status,
              statusText: responseToCache.statusText,
              headers: headers,
            });

            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, cachedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (
              cachedResponse &&
              isCacheFresh(cachedResponse, ASSET_CACHE_DURATION)
            ) {
              return cachedResponse;
            }
            return new Response("Asset unavailable", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
        })
    );
    return;
  }

  // For other requests: Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch((error) => {
          console.warn("Fetch failed:", error);
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});

// Activate event - Mobile optimized cache cleanup
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Clean up old caches
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients immediately (important for mobile)
        return self.clients.claim();
      })
      .catch((error) => {
        console.error("Activation failed:", error);
      })
  );
});

// Handle service worker updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync for offline functionality (if supported)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implement background sync logic here
  console.log("Background sync triggered");
  return Promise.resolve();
}
