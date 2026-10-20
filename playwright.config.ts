import { defineConfig } from '@playwright/test';
import { ANDROID_UA, IOS_UA, PHONE } from './e2e/device.ts';

const PORT = 4317;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  // baselines are the prototype's screenshots: a missing one fails, it is never written
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/__baseline__/{arg}{ext}',
  expect: { toMatchSnapshot: { maxDiffPixelRatio: 0.02, threshold: 0.2 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...PHONE,
    // instant navigation and short demo timers; the transition tests turn motion back on (§10.1)
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: 'visual/**',
      use: { browserName: 'chromium', userAgent: ANDROID_UA },
    },
    {
      name: 'webkit',
      testIgnore: 'visual/**',
      use: { browserName: 'webkit', userAgent: IOS_UA },
    },
    // the baselines are Chromium screenshots, so the comparison runs in Chromium only
    {
      name: 'visual',
      testDir: 'e2e/visual',
      use: { browserName: 'chromium', userAgent: ANDROID_UA },
    },
  ],
  // test mode: no mock latency (.env.test)
  webServer: {
    command: `pnpm exec vite --mode test --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
