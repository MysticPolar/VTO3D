/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // build output never mixes with public/assets (HANDOFF §3)
  build: { assetsDir: '_app' },
  // pre-bundle the runtime dependencies when the dev server starts: discovering one on a first
  // request reloads the page, which drops ?frame=iphone and breaks a running E2E test
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-dev-runtime',
      'react-dom/client',
      'react-router',
      'react-router/dom',
      '@tanstack/react-query',
      'zustand',
      'zustand/middleware',
      'clsx',
      'idb-keyval',
    ],
  },
  // fixed ports, so the dev server, the preview and Playwright's server (4317) never collide
  server: { port: 5180 },
  preview: { port: 4180 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/features/**', 'src/app/nav/**', 'src/api/mock/**'],
    },
  },
});
