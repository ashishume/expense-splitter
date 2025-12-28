// Service Worker Registration with Update Detection
// This ensures users always get the latest version

import toast from "react-hot-toast";

// Configuration options
const SW_CONFIG = {
  // Set to false for completely silent updates (no toast notification)
  showUpdateNotification: true,
  // Delay before reloading (in milliseconds) - gives time for toast to show
  reloadDelay: 1500,
};

export const registerServiceWorker = () => {
  // Skip service worker registration in development mode
  if (import.meta.env.DEV) {
    console.log("Service Worker registration skipped in development mode");
    return;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", {
          // Force update check on every page load
          updateViaCache: "none",
        })
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration);

          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update();
          }, 60000);

          // Handle service worker updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;

            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available, automatically update
                  console.log("New version available! Auto-updating...");

                  // Optionally show a brief toast notification
                  if (SW_CONFIG.showUpdateNotification) {
                    toast.success("Updating to latest version...", {
                      duration: 2000,
                      icon: "🔄",
                    });
                  }

                  // Wait a moment for the toast to be visible (if shown), then update
                  const delay = SW_CONFIG.showUpdateNotification
                    ? SW_CONFIG.reloadDelay
                    : 0;

                  setTimeout(() => {
                    // Automatically skip waiting and activate new service worker
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                    // The page will reload automatically when controllerchange fires
                  }, delay);
                }
              });
            }
          });

          // Listen for the controlling service worker changing
          let refreshing = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    });
  }
};

// Function to unregister all service workers (useful for debugging)
export const unregisterServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log("All service workers unregistered");
  }
};

// Function to clear all caches
export const clearAllCaches = async () => {
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    console.log("All caches cleared");
  }
};

// Force update function - clears cache and reloads
export const forceUpdate = async () => {
  await clearAllCaches();
  await unregisterServiceWorker();
  window.location.reload();
};
