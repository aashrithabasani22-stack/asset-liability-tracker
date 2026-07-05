import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Asset & Liability Tracker',
        short_name: 'AssetTracker',
        description: 'Track your personal assets, liabilities and net worth',
        theme_color: '#1e1b4b',
        background_color: '#f3f4f8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.frankfurter\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'fx-rates', expiration: { maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /^https:\/\/api\.gold-api\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'metal-rates', expiration: { maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
})
