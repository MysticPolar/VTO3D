import { defineConfig } from '@playwright/test';

/**
 * `pnpm measure`: real Lucy VTON 3.6 sessions against Decart, to measure latency and cost.
 * It spends money (about 35 s of generation per mode, $0.02/s standard and $0.04/s fast), so it is
 * never part of `pnpm verify`. The key comes from .env.local, or from MEASURE_ENV_FILE.
 * Results go to measurements/<run>/ (git-ignored); REPORT.md keeps the numbers.
 */
const ENV_FILE = process.env.MEASURE_ENV_FILE ?? '.env.local';

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'measure.spec.ts',
  workers: 1,
  timeout: 240_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5193',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'zh-CN',
    // the installed Chrome, with the codecs a user's browser has
    channel: 'chrome',
  },
  webServer: {
    command: `node --env-file-if-exists=${ENV_FILE} node_modules/vite/bin/vite.js --port 5193 --strictPort`,
    url: 'http://localhost:5193/api/health',
    reuseExistingServer: false,
  },
});
