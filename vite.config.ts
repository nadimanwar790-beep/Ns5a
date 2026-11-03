import tailwindcss from '@tailwindcss/vite';
import { buildSync } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function getPrebundledLucidePath(rootDir: string): string {
  const cacheDir = path.resolve(rootDir, 'node_modules/.vite-build-cache');
  const outFile = path.join(cacheDir, 'lucide-react.esm.js');
  if (!fs.existsSync(outFile)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    buildSync({
      entryPoints: [path.resolve(rootDir, 'node_modules/lucide-react/dist/esm/lucide-react.js')],
      outfile: outFile,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      minifySyntax: true,
      minifyWhitespace: true,
      external: ['react', 'react/jsx-runtime'],
    });
  }
  return outFile;
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  if (isBuild) {
    process.env.NODE_ENV = 'production';
  }

  return {
    define: isBuild
      ? {
          'process.env.NODE_ENV': JSON.stringify('production'),
        }
      : undefined,
    esbuild: {
      jsx: 'automatic',
      jsxDev: !isBuild,
      minifySyntax: isBuild,
      minifyWhitespace: isBuild,
    },
    optimizeDeps: {
      entries: ['src/main.tsx'],
      holdUntilCrawlEnd: false,
    },
    plugins: [
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
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          ],
        },
        injectManifest: {
          globIgnores: ['**/*.map', 'assets/aistudio/**'],
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        },
      }),
    ],
    build: {
      target: 'es2022',
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
            (typeof warning.message === 'string' &&
              (warning.message.includes('Module level directives cause errors when bundled') ||
                warning.message.includes('"use client"')))
          ) {
            return;
          }
          defaultHandler(warning);
        },
        treeshake: {
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        ...(isBuild
          ? {
              'lucide-react': getPrebundledLucidePath(__dirname),
            }
          : {}),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: false,
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
