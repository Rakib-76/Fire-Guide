import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Root-relative assets so deep links (e.g. /professional/dashboard/availability) still load /assets/*.js.
  // With base './', relative URLs resolve under the current path and return HTML from the SPA fallback.
  base: '/',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
      'sonner@2.0.3': 'sonner',
      'react-hook-form@7.55.0': 'react-hook-form',
      'figma:asset/e0dbc899d99d79876818127d318a196dc1afa811.png': path.resolve(__dirname, './src/assets/e0dbc899d99d79876818127d318a196dc1afa811.png'),
      'figma:asset/dcc0d6fdc32b7d65870a8a7a4cf0cb3e7dad77d5.png': path.resolve(__dirname, './src/assets/dcc0d6fdc32b7d65870a8a7a4cf0cb3e7dad77d5.png'),
      'figma:asset/9f9a1b825f2bba8823c5d3f17dd17fcac7ef3c43.png': path.resolve(__dirname, './src/assets/9f9a1b825f2bba8823c5d3f17dd17fcac7ef3c43.png'),
      'figma:asset/7e7dc8c5af40c3b71729d1882716219bc6009ebf.png': path.resolve(__dirname, './src/assets/7e7dc8c5af40c3b71729d1882716219bc6009ebf.png'),
      'figma:asset/6d3b45bdbd70d604c743717e8996da118e1d2ab9.png': path.resolve(__dirname, './src/assets/6d3b45bdbd70d604c743717e8996da118e1d2ab9.png'),
      'figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png': path.resolve(__dirname, './src/assets/69744b74419586d01801e7417ef517136baf5cfb.png'),
      'figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png': path.resolve(__dirname, './src/assets/629703c093c2f72bf409676369fecdf03c462cd2.png'),
      'figma:asset/593ecc8734544a291a2372ea93c0cbd9fb50c3ce.png': path.resolve(__dirname, './src/assets/593ecc8734544a291a2372ea93c0cbd9fb50c3ce.png'),
      'figma:asset/564386e01b260c73d9917c802efdd6b9fae211c2.png': path.resolve(__dirname, './src/assets/564386e01b260c73d9917c802efdd6b9fae211c2.png'),
      'figma:asset/4a602fcb2197368c8ba48f35530a0c308f2262bb.png': path.resolve(__dirname, './src/assets/4a602fcb2197368c8ba48f35530a0c308f2262bb.png'),
      'figma:asset/480b0c0a77e9ab632fe90d62f30d6330c18adff5.png': path.resolve(__dirname, './src/assets/480b0c0a77e9ab632fe90d62f30d6330c18adff5.png'),
      'figma:asset/2a524831d9c08eec0e10c448c5848452698dd089.png': path.resolve(__dirname, './src/assets/2a524831d9c08eec0e10c448c5848452698dd089.png'),
      'figma:asset/189ec7e3689608dad914f59dd7c02d25da91583d.png': path.resolve(__dirname, './src/assets/189ec7e3689608dad914f59dd7c02d25da91583d.png'),
      'figma:asset/08939bb03be0325201050404a721d42e221a3890.png': path.resolve(__dirname, './src/assets/08939bb03be0325201050404a721d42e221a3890.png'),
      'figma:asset/06f1b3e41c2783f18bdafecd74ab9e64333871d6.png': path.resolve(__dirname, './src/assets/06f1b3e41c2783f18bdafecd74ab9e64333871d6.png'),
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    minify: 'esbuild',
    assetsDir: 'assets',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;

          const normalized = id.replace(/\\/g, '/');

          // Keep React + motion together — splitting motion out caused circular chunk init errors.
          if (
            /\/react\//.test(normalized) ||
            /\/react-dom\//.test(normalized) ||
            normalized.includes('react/jsx-runtime') ||
            normalized.includes('react/jsx-dev-runtime') ||
            normalized.includes('scheduler') ||
            normalized.includes('use-sync-external-store') ||
            normalized.includes('framer-motion') ||
            normalized.includes('/motion/') ||
            normalized.includes('motion-dom') ||
            normalized.includes('motion-utils')
          ) {
            return 'react-vendor';
          }
          if (normalized.includes('react-router')) {
            return 'router-vendor';
          }
          if (normalized.includes('@radix-ui') || normalized.includes('lucide-react') || normalized.includes('vaul')) {
            return 'ui-vendor';
          }
          if (normalized.includes('recharts') || normalized.includes('leaflet')) {
            return 'charts-vendor';
          }
          return 'vendor';
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    modulePreload: {
      polyfill: true,
    },
  },
  server: {
    host: '0.0.0.0',
    port:3000,
    open: true,
    // When VITE_API_BASE_URL is `/api`, the browser hits same-origin `/api/*`; forward to the real backend
    // so POST /api/addresses_update is not answered by the SPA dev server (which would 404).
    proxy: {
      '/api': {
        target: 'https://firesafety-backend.fireguide.co.uk',
        changeOrigin: true,
        secure: true,
      },
      // Report files live under /storage on the API host; proxy so blob download avoids browser CORS.
      '/storage': {
        target: 'https://firesafety-backend.fireguide.co.uk',
        changeOrigin: true,
        secure: true,
      },
      // Membership and insurance assets are served from /image on the API host (incl. ?path=...&api_token=...).
      '/image': {
        target: 'https://firesafety-backend.fireguide.co.uk',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'jszip',
    ],
  },
});
