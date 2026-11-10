import tailwindcss from '@tailwindcss/vite';
import { buildSync } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export default defineConfig(async ({ command }) => {
  const isBuild = command === 'build';
  if (isBuild) {
    process.env.NODE_ENV = 'production';
  }

  const plugins: any[] = [tailwindcss()];
  if (isBuild) {
    const { VitePWA } = await import('vite-plugin-pwa');
    plugins.push(
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
          id: '/',
          name: 'NSTA - National Study & Tracking App',
          short_name: 'NSTA',
          description:
            'Comprehensive learning platform with syllabus, notes, audio studio, MCQs, and student progress tracking.',
          theme_color: '#121212',
          background_color: '#121212',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icons/icon-192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png', purpose: 'any' },
          ],
        },
        injectManifest: {
          globIgnores: ['**/*.map', 'assets/aistudio/**'],
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        },
      })
    );
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
      entries: ['src/**/*.{ts,tsx}'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/database',
        'firebase/analytics',
        'firebase/messaging',
        'framer-motion',
        'clsx',
        'tailwind-merge',
        '@radix-ui/react-slot',
        'class-variance-authority',
        'html2canvas',
        'html5-qrcode',
        'jspdf',
        'jsqr',
        'jszip',
        'katex',
        'localforage',
        'p-limit',
        'react-markdown',
        'react-pdf',
        'react-qr-code',
        'recharts',
        'rehype-katex',
        'remark-math',
        'sonner',
        'three',
      ],
    },
    plugins,
    build: {
      target: 'es2022',
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
            warning.code === 'CIRCULAR_DEPENDENCY' ||
            (typeof warning.message === 'string' &&
              (warning.message.includes('Module level directives cause errors when bundled') ||
                warning.message.includes('"use client"') ||
                (warning.message.includes('is dynamically imported by') &&
                  warning.message.includes('statically imported by'))))
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
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
        ...(isBuild
          ? {
              'lucide-react': getPrebundledLucidePath(__dirname),
            }
          : {}),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: false,
      ws: false,
      watch: {
        ignored: [
          '**/.aistudio/**',
          '**/public/assets/aistudio/**',
          '**/.vapid-keys.json',
          '**/.push-subscriptions.json',
        ],
      },
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
