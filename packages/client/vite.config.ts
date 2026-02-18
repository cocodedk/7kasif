import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const wsTarget = process.env.WS_PROXY_TARGET || 'ws://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      clientPort: 5173,
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      '/ws': {
        target: wsTarget,
        ws: true,
      },
    },
  },
});
