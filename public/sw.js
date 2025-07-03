// Service Worker for Axpo PWA - iOS Compatible
const CACHE_NAME = "axpo-v1";
const urlsToCache = ["/", "/logo.jpg", "/manifest.json"];

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Cache opened");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Cache installation failed:", error);
      })
  );
  // Skip waiting for iOS compatibility
  self.skipWaiting();
});

// Fetch event
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request).catch(() => {
          // Return a fallback for navigation requests
          if (event.request.destination === "document") {
            return caches.match("/");
          }
        })
      );
    })
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim clients for iOS compatibility
        return self.clients.claim();
      })
  );
});
