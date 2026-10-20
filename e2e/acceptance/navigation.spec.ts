import { expect, test } from '../fixtures.ts';
import { activeScreen, button, completeSetup, expectScreen, tab } from '../helpers.ts';

/**
 * The navigation checks of reference/acceptance/flow_test_v2.py, ported with their names
 * (HANDOFF §10.1, §11 Phase 1), on the placeholder screens. Motion stays on: "instant" means
 * something only when transitions could run.
 */
test.use({ reducedMotion: 'no-preference' });

const TABS = [
  ['fitting', '首页'],
  ['plaza', '购物广场'],
  ['wardrobe', '个人衣橱'],
  ['stylist', 'AI造型师'],
  ['profile', '我的'],
] as const;
const LABELS = TABS.map(([, label]) => label);

for (const [id, label] of TABS) {
  /** open another tab, then switch to this one by the tab bar */
  const switchTo = async (page: import('@playwright/test').Page) => {
    await page.goto(id === 'profile' ? '/home' : '/me');
    await tab(page, label).click();
  };

  test(`AC3: tab → ${id}`, async ({ page }) => {
    await switchTo(page);
    await expectScreen(page, id);
    await expect(activeScreen(page).locator('nav [aria-current="page"]')).toHaveAttribute(
      'data-to',
      id,
    );
  });

  test(`AC2/4: ${id} has one bar with the 5 tabs`, async ({ page }) => {
    await switchTo(page);
    const bar = activeScreen(page).getByRole('navigation', { name: '主导航' });
    await expect(bar).toHaveCount(1);
    await expect(bar.locator('button span')).toHaveText(LABELS);
  });

  test(`tab switch to ${id} is instant`, async ({ page }) => {
    await switchTo(page);
    expect(await page.locator('[data-transition]').count()).toBe(0);
    await expectScreen(page, id);
    expect(await page.locator('[data-transition]').count()).toBe(0);
  });

  test(`${id} has no back button (primary)`, async ({ page }) => {
    await switchTo(page);
    await expectScreen(page, id);
    await expect(activeScreen(page).getByRole('button', { name: '返回' })).toHaveCount(0);
  });
}

test('secondary screen hides tab bar', async ({ page }) => {
  await page.goto('/plaza');
  await button(page, '商品详情').click();
  await expectScreen(page, 'product');
  await expect(activeScreen(page).getByRole('navigation', { name: '主导航' })).toHaveCount(0);
});

test('first launch (no setup) opens 启动页', async ({ page }) => {
  await page.goto('/');
  await expectScreen(page, 'onboarding', '/welcome');
});

test('AC1: relaunch after setup opens 首页', async ({ page }) => {
  await completeSetup(page);
  await page.goto('/');
  await expectScreen(page, 'fitting', '/home');
});
