import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const backend = 'http://localhost:8080';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    // svelte-check --tsgo writes an overlay tsconfig here; it must not reload the dev page.
    watch: { ignored: ['**/.svelte-check/**'] },
    proxy: {
      '/api': { target: backend, changeOrigin: false },
      '/ws': { target: backend, ws: true, changeOrigin: false },
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
