import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig(async ({ command }) => {
  const isServerCommand = command === 'serve';
  const rawPort = process.env.PORT;

  if (isServerCommand && !rawPort) {
    throw new Error(
      'PORT environment variable is required but was not provided.',
    );
  }

  const configuredPort = Number(rawPort);

  if (
    isServerCommand &&
    (!Number.isInteger(configuredPort) || configuredPort <= 0)
  ) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // A build does not start a server; only development and preview need a port.
  const port =
    Number.isInteger(configuredPort) && configuredPort > 0
      ? configuredPort
      : 22698;
  const basePath =
    process.env.BASE_PATH || (isServerCommand ? undefined : '/');

  if (!basePath) {
    throw new Error(
      'BASE_PATH environment variable is required but was not provided.',
    );
  }

  return {
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: [
        'favicon.svg',
        'branding/nsta-logo.png',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
      ],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'NSTA',
        short_name: 'NSTA',
        description:
          'School and study management with student records, fees, certificates, marksheets, and learning tools.',
        theme_color: '#030717',
        background_color: '#030717',
        display: 'standalone',
        orientation: 'portrait',
        start_url: basePath,
        scope: basePath,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
      injectManifest: {
        globIgnores: ['**/*.map'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  };
});
