import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures.ts';
import {
  activeScreen,
  backButton,
  button,
  expectScreen,
  scrollTo,
  scrollTop,
  tab,
} from '../helpers.ts';
import { BASELINES } from '../screens.ts';

const ORDER = 'VT20260715092418';

/** A button press that doesn't scroll the screen first (Playwright's click scrolls into view) */
const press = (page: Page, name: string) => button(page, name).dispatchEvent('click');

/** HANDOFF §11, Phase 1: the navigation checks, run on the placeholder screens */
test.describe('deep links', () => {
  for (const b of BASELINES) {
    test(`${b.route} opens ${b.screen}`, async ({ page }) => {
      await page.goto(b.route);
      await expectScreen(page, b.screen, b.route);
    });
  }

  test('an invalid tail goes to its longest valid prefix, an unknown path to /', async ({
    page,
  }) => {
    await page.goto('/me/orders/o');
    await expectScreen(page, 'orderlist', '/me/orders');
    await page.goto('/nowhere');
    await expectScreen(page, 'onboarding', '/welcome');
  });

  test('after a deep link, in-app back goes up the chain', async ({ page }) => {
    await page.goto(`/me/orders/o/${ORDER}/tracking`);
    await backButton(page).click();
    await expectScreen(page, 'orders', `/me/orders/o/${ORDER}`);
    await backButton(page).click();
    await expectScreen(page, 'orderlist', '/me/orders');
    await backButton(page).click();
    await expectScreen(page, 'profile', '/me');
    await expect(backButton(page)).toHaveCount(0);
  });
});

test.describe('back and forward', () => {
  async function tapThrough(page: Page) {
    await page.goto('/me');
    await button(page, '我的订单').click();
    await expectScreen(page, 'orderlist', '/me/orders');
    await button(page, '订单详情').click();
    await expectScreen(page, 'orders', `/me/orders/o/${ORDER}`);
    await button(page, '物流跟踪').click();
    await expectScreen(page, 'tracking', `/me/orders/o/${ORDER}/tracking`);
  }

  test('in-app back goes back through history, so browser forward re-pushes', async ({ page }) => {
    await tapThrough(page);
    for (const [screen, url] of [
      ['orders', `/me/orders/o/${ORDER}`],
      ['orderlist', '/me/orders'],
      ['profile', '/me'],
    ] as const) {
      await backButton(page).click();
      await expectScreen(page, screen, url);
    }
    await page.goForward();
    await expectScreen(page, 'orderlist', '/me/orders');
  });

  test('browser back retraces the stack and browser forward re-pushes', async ({ page }) => {
    await tapThrough(page);
    await page.goBack();
    await expectScreen(page, 'orders', `/me/orders/o/${ORDER}`);
    await page.goBack();
    await expectScreen(page, 'orderlist', '/me/orders');
    await page.goForward();
    await expectScreen(page, 'orders', `/me/orders/o/${ORDER}`);
    await page.goForward();
    await expectScreen(page, 'tracking', `/me/orders/o/${ORDER}/tracking`);
  });

  test('after paying from inside the cashier, browser back skips the dropped checkout', async ({
    page,
  }) => {
    await page.goto('/plaza');
    await button(page, '商品详情').click();
    // 购物广场 has a 结算下单 too: wait for the product page before pressing it
    await expectScreen(page, 'product', '/plaza/p/striped-shirt');
    await button(page, '结算下单').click();
    await expectScreen(page, 'checkout', '/plaza/p/striped-shirt/checkout');
    await button(page, '立即下单').click();
    const cashier = page.getByRole('dialog', { name: 'Cashier' });
    await cashier.getByRole('button', { name: '查看订单' }).click();
    await expectScreen(page, 'orders', `/me/orders/o/${ORDER}`);
    await expect(cashier).toHaveCount(0);
    // the checkout entry is still in the browser's history, but it opens the product page
    await page.goBack();
    await expectScreen(page, 'product', '/plaza/p/striped-shirt');
    await expect(page.locator('[data-screen="checkout"]')).toHaveCount(0);
  });
});

test.describe('tabs', () => {
  test('a tab switch brings back that tab’s stack and scroll positions', async ({ page }) => {
    await page.goto('/plaza');
    await scrollTo(page, 420);
    await press(page, '商品详情');
    await expectScreen(page, 'product', '/plaza/p/striped-shirt');
    await scrollTo(page, 300);
    // leave 购物广场 with its product page open: 试穿上身 jumps to 首页
    await press(page, '试穿上身');
    await expectScreen(page, 'fitting', '/home');
    await tab(page, '购物广场').click();
    await expectScreen(page, 'product', '/plaza/p/striped-shirt');
    expect(await scrollTop(page)).toBe(300);
    await backButton(page).click();
    await expectScreen(page, 'plaza', '/plaza');
    expect(await scrollTop(page)).toBe(420);
  });

  test('re-tapping the active tab scrolls its list back to the top', async ({ page }) => {
    await page.goto('/plaza');
    await scrollTo(page, 600);
    await tab(page, '购物广场').click();
    await expect.poll(() => scrollTop(page)).toBe(0);
    await expectScreen(page, 'plaza', '/plaza');
  });
});

test.describe('transitions', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('push and pop slide, and a tab switch is instant', async ({ page }) => {
    await page.goto('/plaza');
    await button(page, '商品详情').click();
    await expect(activeScreen(page)).toHaveAttribute('data-transition', 'enter-push');
    await expect(page.locator('[data-transition="leave-push"]')).toHaveAttribute(
      'data-screen',
      'plaza',
    );
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await backButton(page).click();
    await expect(activeScreen(page)).toHaveAttribute('data-transition', 'enter-pop');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await tab(page, '我的').click();
    await expectScreen(page, 'profile', '/me');
    expect(await page.locator('[data-transition]').count()).toBe(0);
  });

  test('a contextual jump fades in and resets that tab to its root', async ({ page }) => {
    await page.goto('/wardrobe');
    await button(page, '商品详情').click();
    await expectScreen(page, 'product', '/wardrobe/p/striped-shirt');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    // 试穿上身 jumps to 首页; 个人衣橱 keeps its product page underneath
    await button(page, '试穿上身').click();
    await expectScreen(page, 'fitting', '/home');
    await tab(page, '购物广场').click();
    // 首页 has a 商品详情 too: wait for 购物广场 before pressing it
    await expectScreen(page, 'plaza', '/plaza');
    await button(page, '商品详情').click();
    await expectScreen(page, 'product', '/plaza/p/striped-shirt');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await expect(page.locator('[data-screen="product"]')).toHaveCount(2);
    // 加入衣橱 fades into 个人衣橱 at its root, and its product page is gone
    await button(page, '加入衣橱').click();
    await expect(activeScreen(page)).toHaveAttribute('data-transition', 'enter-fade');
    await expectScreen(page, 'wardrobe', '/wardrobe');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await expect(page.locator('[data-screen="product"]')).toHaveCount(1);
  });

  test('a jump from deeper in the same tab pops back to its root', async ({ page }) => {
    await page.goto('/wardrobe');
    await button(page, '商品详情').click();
    await expectScreen(page, 'product', '/wardrobe/p/striped-shirt');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await button(page, '加入衣橱').click();
    await expect(activeScreen(page)).toHaveAttribute('data-transition', 'enter-pop');
    await expectScreen(page, 'wardrobe', '/wardrobe');
    await expect(page.locator('[data-transition]')).toHaveCount(0);
    await expect(page.locator('[data-screen="product"]')).toHaveCount(0);
  });

  test('focus moves to the new screen’s heading', async ({ page }) => {
    await page.goto('/plaza');
    await button(page, '商品详情').click();
    await expect(activeScreen(page).getByRole('heading', { name: '商品详情' })).toBeFocused();
  });

  test('reduced motion makes navigation instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/plaza');
    await button(page, '商品详情').click();
    await expectScreen(page, 'product', '/plaza/p/striped-shirt');
    expect(await page.locator('[data-transition]').count()).toBe(0);
    await expect(page.locator('[data-screen="plaza"]')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('overlays', () => {
  test('browser back closes the top overlay and returns focus', async ({ page }) => {
    await page.goto('/plaza');
    const trigger = button(page, 'Sheet');
    await trigger.click();
    const sheet = page.getByRole('dialog', { name: 'Sheet' });
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL('/plaza');
    await page.goBack();
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL('/plaza');
    await expect(trigger).toBeFocused();
  });

  test('Esc closes the top overlay first, and focus returns to each trigger', async ({ page }) => {
    await page.goto('/plaza');
    const trigger = button(page, 'Sheet');
    await trigger.click();
    const sheet = page.getByRole('dialog', { name: 'Sheet' });
    const inner = sheet.getByRole('button', { name: 'Dialog', exact: true });
    await inner.click();
    const dialog = page.getByRole('dialog', { name: 'Dialog' });
    await expect(dialog.getByRole('button', { name: '确定' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(sheet).toBeVisible();
    await expect(inner).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expectScreen(page, 'plaza', '/plaza');
  });

  test('a dialog answers its promise', async ({ page }) => {
    await page.goto('/plaza');
    await button(page, 'Dialog').click();
    await page
      .getByRole('dialog', { name: 'Dialog' })
      .getByRole('button', { name: '确定' })
      .click();
    await expect(page.getByRole('status')).toHaveText('OK');
    await button(page, 'Dialog').click();
    await page
      .getByRole('dialog', { name: 'Dialog' })
      .getByRole('button', { name: '取消' })
      .click();
    await expect(page.getByRole('status')).toHaveText('Cancel');
  });

  test('navigating from inside a sheet replaces its history entry', async ({ page }) => {
    await page.goto('/plaza');
    await button(page, 'Sheet').click();
    await page
      .getByRole('dialog', { name: 'Sheet' })
      .getByRole('button', { name: '商品详情' })
      .click();
    await expectScreen(page, 'product', '/plaza/p/striped-shirt');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goBack();
    await expectScreen(page, 'plaza', '/plaza');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a busy overlay stays open on browser back and Esc', async ({ page }) => {
    await page.goto('/plaza');
    await button(page, 'Busy').click();
    const sheet = page.getByRole('dialog', { name: 'Busy' });
    await expect(sheet).toBeVisible();
    await page.goBack();
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeVisible();
    // no longer busy after 1.5 s: now Esc closes it
    await page.waitForTimeout(1600);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expectScreen(page, 'plaza', '/plaza');
  });

  test('a layer opens over the screen and closes again', async ({ page }) => {
    await page.goto('/plaza');
    await button(page, 'Layer').click();
    const layer = page.getByRole('dialog', { name: 'Layer' });
    await expect(layer).toBeVisible();
    await layer.getByRole('button', { name: '关闭' }).click();
    await expect(layer).toHaveCount(0);
  });

  test('a toast shows one message, then goes', async ({ page }) => {
    await page.goto('/plaza');
    await button(page, 'Toast').click();
    await expect(page.getByRole('status')).toHaveText('Toast');
    await expect(page.getByRole('status')).toHaveText('', { timeout: 4000 });
  });
});

test.describe('the launch flow', () => {
  test('/ opens 启动页 before setup and 首页 after it', async ({ page }) => {
    await page.goto('/');
    await expectScreen(page, 'onboarding', '/welcome');
    await button(page, '开始体验').click();
    await expectScreen(page, 'avatar', '/welcome/avatar');
    await button(page, '进入虚拟试衣间').click();
    await expectScreen(page, 'fitting', '/home');
    await page.goto('/welcome');
    await expectScreen(page, 'fitting', '/home');
    await page.goto('/');
    await expectScreen(page, 'fitting', '/home');
  });

  test('重新体验首次启动 starts the launch flow again, with every stack reset', async ({
    page,
  }) => {
    await page.goto('/me/settings');
    await button(page, '重新体验首次启动').click();
    await expectScreen(page, 'onboarding', '/welcome');
    await expect(page.locator('[data-screen="settings"]')).toHaveCount(0);
  });
});
