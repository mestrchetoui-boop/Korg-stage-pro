import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isStandalone = mode === 'standalone';

  if (isStandalone) {
    return {
      base: './',
      publicDir: false,
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      plugins: [react(), tailwindcss(), viteSingleFile()],
      resolve: {
        alias: {
          '@': path.resolve(import.meta.dirname, '.'),
        },
      },
      build: {
        outDir: 'standalone',
        emptyOutDir: true,
        minify: true,
        cssMinify: true,
      },
    };
  }

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        manifestFilename: 'manifest.json',
        includeAssets: ['apple-touch-icon.png', 'icon.svg', 'favicon.ico'],
        manifest: {
          id: '/',
          name: 'KORG Oriental Commander',
          short_name: 'KORG Stage',
          description: 'Professional KORG MIDI workstation controller: quarter-tone scale tuning, sound & STS banks, and arranger control.',
          theme_color: '#070B14',
          background_color: '#070B14',
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/korg-offline.html'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      viteSingleFile(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: true,
      cssMinify: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

