import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Include all public-folder assets in the precache manifest
      includeAssets: [
        "favicon.ico",
        "graduation-cap.svg",
        "apple-touch-icon.png",
        "robots.txt",
        "icons/*.png",
      ],
      // Web App Manifest
      manifest: {
        name: "Talent Hub – Abacus, Vedic Maths & STEM",
        short_name: "Talent Hub",
        description:
          "India's premier online learning platform for Abacus, Vedic Maths, Handwriting and STEM education for kids.",
        theme_color: "#7C3AED",
        background_color: "#07070F",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "browser"],
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/?source=pwa",
        id: "/",
        lang: "en-IN",
        dir: "ltr",
        categories: ["education", "kids"],
        icons: [
          {
            src: "icons/pwa-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          // Maskable icon — keeps content inside the 80% safe-zone circle for
          // adaptive icon shapes on Android
          {
            src: "icons/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        // App shortcuts appear on long-press of the home-screen icon (Android)
        shortcuts: [
          {
            name: "Practice",
            short_name: "Practice",
            url: "/practice?source=shortcut",
            description: "Start a maths practice session",
            icons: [{ src: "icons/pwa-96x96.png", sizes: "96x96" }],
          },
          {
            name: "Leaderboard",
            short_name: "Ranks",
            url: "/leaderboard?source=shortcut",
            description: "View the student leaderboard",
            icons: [{ src: "icons/pwa-96x96.png", sizes: "96x96" }],
          },
        ],
        screenshots: [
          {
            src: "abacus.png",
            sizes: "1200x630",
            type: "image/png",
            form_factor: "wide",
            label: "Talent Hub – Online Learning Platform",
          },
        ],
      },
      // Workbox config — replaces the hand-rolled sw.js
      workbox: {
        // Pre-cache all Vite-hashed assets + html/fonts
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Exclude images larger than 2 MB from precaching — they're handled by
        // the runtime CacheFirst strategy instead.
        globIgnores: [
          "**/imagesproject/**",
          "**/stem.png",
          "**/handwriting.png",
        ],
        // SPA fallback: all navigation requests get index.html, except /api
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Custom offline page is served when a navigation is uncacheable
        offlineGoogleAnalytics: false,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Runtime caching strategies
        runtimeCaching: [
          // Google Fonts stylesheets – Cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts files – Cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Leaderboard API – StaleWhileRevalidate (show cached, refresh in bg)
          {
            urlPattern: /\/api\/leaderboard/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-leaderboard",
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Papers API – StaleWhileRevalidate
          {
            urlPattern: /\/api\/papers/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-papers",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Course/public content images – Cache-first, 30 days
          {
            urlPattern: /\.(png|jpg|jpeg|svg|webp|gif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Enable service worker in dev so you can test offline behaviour locally
        enabled: true,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    // Cashfree JS SDK is loaded from their CDN at runtime — never bundle it.
    rollupOptions: {
      external: ["@cashfreepayments/cashfree-js"],
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
