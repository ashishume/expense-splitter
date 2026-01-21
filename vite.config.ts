import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Optimize for mobile performance (iPhone)
    target: "es2015",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"], // Remove specific console methods
      },
    },
    // Enable cache busting with content hashing
    rollupOptions: {
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        // Code splitting for better mobile performance
        manualChunks: {
          // Separate vendor chunks
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "firebase-vendor": ["firebase/app", "firebase/firestore", "firebase/auth"],
          "ui-vendor": ["framer-motion", "lucide-react", "react-hot-toast"],
        },
      },
    },
    // Generate manifest for better cache control
    manifest: true,
    // Disable source maps for smaller bundle
    sourcemap: false,
    // Chunk size warning limit (iPhone has limited RAM)
    chunkSizeWarningLimit: 500,
  },
  server: {
    // Enable HTTPS for local development (helps with service worker testing)
    // https: true, // Uncomment if you have SSL certificates
    headers: {
      // Disable caching in development
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  },
  // Explicitly enable source maps in dev mode (enabled by default, but explicit is better)
  css: {
    devSourcemap: true,
  },
  // Ensure service worker and manifest are copied to build output
  publicDir: "public",
  // Fix Firebase package resolution
  resolve: {
    alias: {
      // Ensure Firebase modules are properly resolved
    },
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/firestore", "firebase/auth"],
    // Force re-optimization when dependencies change
    force: false, // Set to true if you continue having issues
  },
});
