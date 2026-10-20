import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests of the page and its back end, with a stand-in for api.decart.ai
 * (scripts/dev-fake.ts) and the fake connector in place of Decart's media path: no key, no cost.
 * The phone matches the app's E2E phone (e2e/device.ts in the app): 390 × 844, zh-CN, touch.
 */
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
};

export default defineConfig({
  testDir: 'e2e',
  testIgnore: 'measure.spec.ts',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    ...PHONE,
    baseURL: 'http://localhost:4318',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        userAgent: devices['Pixel 7'].userAgent,
        // Chromium's own fake camera, so the real getUserMedia path runs too
        launchOptions: {
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
        },
      },
    },
    { name: 'webkit', use: { browserName: 'webkit', userAgent: devices['iPhone 14'].userAgent } },
  ],
  webServer: [
    {
      command: 'node scripts/dev-fake.ts --port 4318',
      url: 'http://localhost:4318/api/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      // a deployment that wants an access code, with Decart's shortest session cap
      command: 'node scripts/dev-fake.ts --port 4319 --access-code e2e-code --max-session 10',
      url: 'http://localhost:4319/api/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
