// Service Worker for Axpo PWA - Mobile Optimized
const CACHE_NAME = "axpo-v2";
const STATIC_CACHE = "axpo-static-v2";
const DYNAMIC_CACHE = "axpo-dynamic-v2";

// Core assets to cache
const STATIC_ASSETS = [
  "/",
  "/logo.jpg",
  "/manifest.json",
  "/src/assets/logo.jpg",
];

// Install event - Mobile optimized
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");

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

// Fetch event - Mobile optimized with better error handling
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
    request.url.includes("safari-extension")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }

      // Fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response before caching
          const responseToCache = response.clone();

          // Cache successful responses in dynamic cache
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            })
            .catch((error) => {
              console.warn("Failed to cache response:", error);
            });

          return response;
        })
        .catch((error) => {
          console.warn("Fetch failed:", error);

          // Return fallback for navigation requests
          if (request.destination === "document") {
            return caches.match("/");
          }

          // Return offline fallback for other requests
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
