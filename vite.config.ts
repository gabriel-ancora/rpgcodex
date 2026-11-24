import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Polling só é necessário em unidades de rede; ative com CHOKIDAR_USEPOLLING=1.
    watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true } : undefined,
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/](react|react-dom|scheduler|zustand)[\\/]/.test(id)) return 'vendor-react';
            if (id.includes('convex')) return 'vendor-convex';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return undefined;
          }
          // Catálogo de regras D&D 2024 (magias, classes…) muda pouco: chunk separado.
          if (/[\\/]src[\\/]data[\\/]dnd2024[\\/]/.test(id)) return 'rules-data';
          return undefined;
        },
      },
    },
  },
});
