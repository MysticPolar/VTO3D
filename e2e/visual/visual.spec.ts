import type { Page } from '@playwright/test';
import { FROZEN_NOW } from '../device.ts';
import { expect, test } from '../fixtures.ts';
import { BASELINES, notBuilt } from '../screens.ts';

/**
 * Each built screen against its prototype baseline (HANDOFF §10.2). Never run this suite with
 * --update-snapshots: that would overwrite the prototype's screenshots with the app's own.
 * The baselines come from `pnpm visual:baseline`.
 */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

for (const b of BASELINES) {
  test(`${b.file} matches the prototype`, async ({ page }) => {
    test.skip(...notBuilt(b.screen));
    await page.clock.setFixedTime(FROZEN_NOW);
    await page.goto(`${b.route}?frame=iphone`);
    await settle(page);
    expect(await page.screenshot({ animations: 'disabled' })).toMatchSnapshot(`${b.file}.png`);
  });
}

/** Inset check: at --top-inset 0 everything below the status bar moves up by exactly 44 px. */
test.describe('without the status bar', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  for (const b of BASELINES.filter((b) => b.inset)) {
    test(`${b.file} matches the prototype 44 px higher`, async ({ page }) => {
      test.skip(...notBuilt(b.screen));
      await page.clock.setFixedTime(FROZEN_NOW);
      await page.goto(b.route);
      await settle(page);
      expect(await page.screenshot({ animations: 'disabled' })).toMatchSnapshot([
        'inset',
        `${b.file}.png`,
      ]);
    });
  }
});
