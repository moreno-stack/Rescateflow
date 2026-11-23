import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// El servidor de desarrollo redirige /api al backend (Fase 3), evitando problemas de CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_BACKEND_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: backend, changeOrigin: true },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target: backend, changeOrigin: true },
      },
    },
  };
});
