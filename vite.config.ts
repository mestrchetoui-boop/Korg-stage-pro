import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function singleFileOfflinePlugin(mirrorToPublic = false): Plugin {
  return {
    name: 'single-file-offline-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      let htmlAssetKey = '';
      let htmlSource = '';
      const cssParts: string[] = [];
      const jsParts: string[] = [];
      const keysToDelete: string[] = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.html') && chunk.type === 'asset') {
          htmlAssetKey = fileName;
          htmlSource = typeof chunk.source === 'string'
            ? chunk.source
            : Buffer.from(chunk.source).toString('utf-8');
        } else if (fileName.endsWith('.css') && chunk.type === 'asset') {
          const cssText = typeof chunk.source === 'string'
            ? chunk.source
            : Buffer.from(chunk.source).toString('utf-8');
          cssParts.push(cssText);
          keysToDelete.push(fileName);
        } else if (fileName.endsWith('.js') && chunk.type === 'chunk') {
          jsParts.push(chunk.code);
          keysToDelete.push(fileName);
        }
      }

      if (!htmlAssetKey || !htmlSource) return;

      // Read SVG icon and inline as data URI
      let inlineFavicon = '';
      try {
        const iconPath = path.resolve(import.meta.dirname, 'public', 'icon.svg');
        if (fs.existsSync(iconPath)) {
          const svgB64 = fs.readFileSync(iconPath).toString('base64');
          inlineFavicon = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svgB64}" />`;
        }
      } catch {}

      // Remove external stylesheets, external scripts, Google Fonts links, and external icon links for 100% offline use
      const iconStripRegex = mirrorToPublic
        ? /<link[^>]*rel=["'](?:stylesheet|apple-touch-icon|icon)["'][^>]*>\s*/gi
        : /<link[^>]*rel=["'](?:stylesheet|icon)["'][^>]*>\s*/gi;

      let cleanedHtml = htmlSource
        .replace(/<link[^>]*href=["']https?:\/\/fonts\.googleapis\.com[^"']*["'][^>]*>\s*/gi, '')
        .replace(/<link[^>]*href=["']https?:\/\/fonts\.gstatic\.com[^"']*["'][^>]*>\s*/gi, '')
        .replace(iconStripRegex, '')
        .replace(/<script\b[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>\s*/gi, '');

      const inlineCss = cssParts.join('\n').replace(/<\/style>/gi, '<\\/style>');
      const inlineJs = jsParts.join('\n').replace(/<\/script>/gi, '<\\/script>');

      const headInject = [
        inlineFavicon,
        `<style>\n${inlineCss}\n</style>`,
      ]
        .filter(Boolean)
        .join('\n    ');

      cleanedHtml = cleanedHtml.replace('</head>', () => `    ${headInject}\n  </head>`);
      cleanedHtml = cleanedHtml.replace(
        '</body>',
        () => `    <script>\n${inlineJs}\n    </script>\n  </body>`
      );

      // Replace index.html in bundle and remove external CSS/JS chunk assets
      const targetChunk = bundle[htmlAssetKey];
      if (targetChunk && targetChunk.type === 'asset') {
        targetChunk.source = cleanedHtml;
      }
      for (const k of keysToDelete) {
        delete bundle[k];
      }

      if (mirrorToPublic) {
        try {
          const publicOfflinePath = path.resolve(import.meta.dirname, 'public', 'korg-offline.html');
          fs.writeFileSync(publicOfflinePath, cleanedHtml, 'utf-8');
        } catch {}
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isStandalone = mode === 'standalone';

  if (isStandalone) {
    return {
      base: './',
      publicDir: false,
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      plugins: [react(), tailwindcss(), singleFileOfflinePlugin(true)],
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
        cssCodeSplit: false,
        assetsInlineLimit: 100_000_000,
        rolldownOptions: {
          output: {
            format: 'iife',
            name: 'KorgOrientalCommander',
            codeSplitting: false,
          },
        },
      },
    };
  }

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      singleFileOfflinePlugin(false),
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
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100_000_000,
      rolldownOptions: {
        output: {
          format: 'iife',
          name: 'KorgOrientalCommander',
          codeSplitting: false,
        },
      },
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

