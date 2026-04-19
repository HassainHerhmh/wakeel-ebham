import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const configuredApiUrl = (env.VITE_API_BASE_URL || env.VITE_API_URL || '').replace(/\/$/, '');
  const proxyTarget = configuredApiUrl
    ? configuredApiUrl.replace(/\/api$/i, '')
    : 'http://localhost:3001';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
