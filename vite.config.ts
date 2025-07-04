import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Optimize for mobile performance
    target: "es2015",
    minify: "terser",
  },
  server: {
    // Enable HTTPS for local development (helps with service worker testing)
    // https: true, // Uncomment if you have SSL certificates
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
  },
});
