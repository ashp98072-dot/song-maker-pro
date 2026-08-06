/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["offline.html", "favicon.png", "robots.txt", "pwa/icon-192.png", "pwa/icon-512.png", "pwa/icon-maskable-512.png"],
      manifest: {
        name: "Worship Transpose",
        short_name: "Worship",
        description: "Transpone, organiza y dirige tus cantos de adoración con acordes inteligentes.",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["music", "entertainment"],
        shortcuts: [
          {
            name: "Inicio",
            short_name: "Inicio",
            description: "Biblioteca de canciones",
            url: "/",
            icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Favoritos",
            short_name: "Favoritos",
            description: "Tus canciones favoritas",
            url: "/favoritos",
            icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Listas",
            short_name: "Listas",
            description: "Setlists y listas",
            url: "/listas",
            icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
        icons: [
          { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/offline\.html$/,
          /^\/sw\.js$/,
          /^\/workbox-.*\.js$/,
          /^\/assets\//,
          /^\/manifest\.webmanifest$/,
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Chunks Vite (/assets/*.js) y lazy imports: NetworkFirst evita JS stale tras deploy.
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith("/assets/") &&
              /\.(?:js|mjs)$/i.test(url.pathname),
            handler: "NetworkFirst",
            options: {
              cacheName: "vite-js-chunks",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 96, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" || request.destination === "worker",
            handler: "NetworkFirst",
            options: {
              cacheName: "scripts-workers-network",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "style",
            handler: "CacheFirst",
            options: {
              cacheName: "styles-cache",
              expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-cache",
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/cancion/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "visited-song-routes",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    tsconfig: "./tsconfig.vitest.json",
  },
}));
