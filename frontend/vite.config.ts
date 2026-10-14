import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET ?? 'https://gemflow-api-677007020371.us-east1.run.app';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/graphql': { target, changeOrigin: true },
        '/api': { target, changeOrigin: true },
      },
    },
  };
});
