import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'Einkaufsliste',
      short_name: 'Einkauf',
      description: 'Gemeinsame Einkaufsliste mit Barcode-Scan und Auto-Vervollständigung',
      lang: 'de',
      theme_color: '#f7f5f0',
      background_color: '#f7f5f0',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // The snapshot can be larger than the default 2 MiB single-file cap.
      maximumFileSizeToCacheInBytes: 64 * 1024 * 1024,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname === '/off-de-snapshot.csv',
          handler: 'CacheFirst',
          options: {
            cacheName: 'off-snapshot',
            expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          urlPattern: /^https:\/\/world\.openfoodfacts\.org\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'off-api',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          urlPattern: /^https:\/\/images\.openfoodfacts\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'off-images',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
          },
        },
      ],
    },
  }), cloudflare()],
  server: {
    host: true,
  },
})