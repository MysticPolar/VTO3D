import { expect, type Page } from '@playwright/test';

/** The visible screen root: read the current screen from its data-screen (HANDOFF §10.1) */
export const activeScreen = (page: Page) => page.locator('[data-screen][data-active]');

export async function expectScreen(page: Page, screen: string, url?: string) {
  await expect(activeScreen(page)).toHaveAttribute('data-screen', screen);
  if (url) await expect(page).toHaveURL(url);
}

/** A button on the visible screen, by its exact accessible name */
export const button = (page: Page, name: string) =>
  activeScreen(page).getByRole('button', { name, exact: true });

/** A tab of the visible screen's tab bar */
export const tab = (page: Page, label: string) =>
  activeScreen(page)
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: label, exact: true });

/** The visible screen's back button */
export const backButton = (page: Page) => button(page, '返回');

/** The visible screen's main scroll area */
export const mainScroll = (page: Page) => activeScreen(page).locator('[data-main-scroll]');

export async function scrollTo(page: Page, top: number) {
  await mainScroll(page).evaluate((el, y) => {
    el.scrollTop = y;
  }, top);
}

export const scrollTop = (page: Page) => mainScroll(page).evaluate((el) => el.scrollTop);

/** Finish the first launch as a user would: 启动页 → 上传照片 → 首页 */
export async function completeSetup(page: Page) {
  await page.goto('/welcome');
  await button(page, '开始体验').click();
  await expectScreen(page, 'avatar', '/welcome/avatar');
  await button(page, '进入虚拟试衣间').click();
  await expectScreen(page, 'fitting', '/home');
}
