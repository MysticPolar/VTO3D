/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { apiMiddleware } from './server/node-adapter.js';
import { handlersFor } from './server/runtime.js';

/**
 * Mounts the back end (server/handlers.ts) on the dev and preview servers, so local runs use the
 * same code as the Vercel Functions. Env files are read here, on the server side only: nothing
 * without the VITE_ prefix reaches the page, and this project defines no VITE_ variables.
 */
function liveTryOnApi(env: Record<string, string | undefined>): Plugin {
  const handlers = () => handlersFor(env);
  return {
    name: 'live-tryon-api',
    configureServer(server) {
      server.middlewares.use(apiMiddleware(handlers, Boolean(server.config.server.https)));
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware(handlers, Boolean(server.config.preview.https)));
    },
  };
}

export default defineConfig(({ mode }) => {
  // process.env wins, so a run can pass the key in without an env file in this folder
  const env = { ...loadEnv(mode, import.meta.dirname, ''), ...process.env };
  return {
    plugins: [liveTryOnApi(env)],
    // fixed ports that collide with neither the app (5180/4180/4317) nor the lab (5190)
    server: { port: 5191, strictPort: true },
    preview: { port: 4191, strictPort: true },
    // livekit-client is one ~500 kB vendor chunk, loaded only when a session connects
    build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 600 },
    test: {
      include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'scripts/**/*.test.ts'],
      environment: 'node',
    },
  };
});
