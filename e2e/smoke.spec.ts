import { expect, test } from './fixtures.ts';

test('/ loads the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-app]')).toBeVisible();
  await expect(page).toHaveTitle('全新的购物体验');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});

test('the app fills a phone screen and draws no status bar', async ({ page }) => {
  await page.goto('/');
  const box = await page.locator('[data-app]').boundingBox();
  expect(box).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  await expect(page.getByText('9:41')).toHaveCount(0);
});

test('?frame=iphone shows the prototype box with the 9:41 status bar', async ({ page }) => {
  await page.goto('/?frame=iphone');
  const frame = page.locator('[data-frame="iphone"]');
  expect(await frame.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  await expect(frame.getByText('9:41')).toBeVisible();
});

test.describe('wider than 500 px', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('the app is a centred 430 px column on the dark backdrop', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('[data-app]').boundingBox()).toEqual({
      x: 425,
      y: 0,
      width: 430,
      height: 800,
    });
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 29, 25)');
  });
});

test.describe('the guards', () => {
  test('fail a test that logs a console error', async ({ page }) => {
    test.fail();
    await page.goto('/');
    await page.evaluate(() => console.error('guard check'));
  });

  test('fail a test that requests another origin', async ({ page }) => {
    test.fail();
    await page.goto('/');
    await page.evaluate(() => fetch('https://example.com/guard-check').catch(() => undefined));
  });
});
