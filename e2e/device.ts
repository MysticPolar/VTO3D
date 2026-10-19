import { devices, type BrowserContextOptions } from '@playwright/test';

/** The phone every E2E and visual test runs on (HANDOFF §10, §11 Phase 0): 390 × 844 at 2×, touch,
 * Chinese locale, China time. The prototype baselines are captured with the same options. */
export const PHONE = {
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
} satisfies BrowserContextOptions;

/** Mobile user agents, so platform detection sees a phone: Android Chrome and iOS Safari */
export const ANDROID_UA = devices['Pixel 7'].userAgent;
export const IOS_UA = devices['iPhone 14'].userAgent;

/** Visual tests freeze the clock here on both sides (HANDOFF §10): Friday 17 July 2026, 10:00 */
export const FROZEN_NOW = new Date('2026-07-17T10:00:00+08:00');
