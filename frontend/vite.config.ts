import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    rollupOptions: {
      // Cashfree JS SDK is loaded from their CDN at runtime — never bundle it.
      // Pricing.tsx already has a .catch() fallback for when it's unavailable.
      external: ["@cashfreepayments/cashfree-js"],
    },
  },

  server: {
    host: "localhost",
    port: 5173,

    headers: {
      // Required for Google OAuth popup
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },

    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: false,
        ws: false, // 🔴 VERY IMPORTANT (prevents socket hangs)
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
