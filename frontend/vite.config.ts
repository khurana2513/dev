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
    // Raise the warning threshold — charts/PDF chunks are intentionally large
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // Cashfree JS SDK is loaded from their CDN at runtime — never bundle it.
      external: ["@cashfreepayments/cashfree-js"],
      output: {
        // Split vendor code into separate cacheable chunks.
        // Browsers cache these independently so a UI-only change doesn't
        // invalidate the React or query-client bundles.
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/wouter")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
    // Ensure source maps are NOT shipped to production
    sourcemap: false,
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
