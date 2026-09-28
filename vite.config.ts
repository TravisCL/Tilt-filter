import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Tilt Filter',
          short_name: 'Tilt Filter',
          description:
            'Disciplined trade execution and tilt filter with interactive pre-trade checklist rules, inline editable tags, risk sizing calculator, and emotional risk monitoring.',
          theme_color: '#060e11',
          background_color: '#060e11',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
