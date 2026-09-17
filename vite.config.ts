import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      target: ['es2018', 'chrome68', 'firefox68', 'safari12', 'edge79'],
      cssTarget: ['chrome68', 'safari12'],
      minify: 'esbuild' as const,
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/jspdf') ||
              id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/jszip') ||
              id.includes('node_modules/html-to-image')
            ) {
              return 'pdf-print';
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
              return 'charts';
            }
            if (id.includes('node_modules/html5-qrcode') || id.includes('node_modules/qrcode')) {
              return 'scanner-qr';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-core';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'lucide-icons';
            }
            if (id.includes('node_modules/motion')) {
              return 'animations';
            }
          },
        },
      },
    },
  };
});
