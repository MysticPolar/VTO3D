import { expect, type Page, test } from '@playwright/test';

/**
 * The live try-on layer end to end: page → back end → (stand-in) Decart token API, with the fake
 * connector standing in for the model's media. ?source=sample films the base avatar instead of a
 * camera, so the same tests run in WebKit, which has no fake camera.
 */

const dialog = (page: Page) => page.getByRole('dialog', { name: '视频试衣' });
const state = (page: Page) => page.locator('.cam-view');

async function open(page: Page, query = 'source=sample') {
  await page.goto(`/?connector=fake&debug=1&${query}`);
  await page.getByRole('button', { name: '开启 AI 视频试衣' }).click();
  await expect(dialog(page)).toBeVisible();
}

async function goLive(page: Page) {
  await page.getByRole('checkbox', { name: /我同意/ }).check();
  await page.getByRole('button', { name: '允许使用摄像头' }).click();
  await expect(state(page)).toHaveAttribute('data-state', 'live');
}

const fakeLog = (page: Page) =>
  page.evaluate(() => window.__liveTryOn ?? { connects: [], sets: [], disconnects: 0, live: 0 });

/** The layer's camera tracks, from the debug handle (?debug=1) */
const cameraLive = (page: Page) =>
  page.evaluate(() => {
    const session = (
      window as unknown as { liveTryOnSession?: { view: { localStream: MediaStream | null } } }
    ).liveTryOnSession;
    return session?.view.localStream?.getTracks().some((t) => t.readyState === 'live') ?? false;
  });

test('the explainer keeps the prototype’s words and asks for consent first', async ({ page }) => {
  await open(page);
  const layer = dialog(page);
  await expect(layer.getByRole('heading', { name: '开启视频试衣' })).toBeVisible();
  await expect(layer.getByRole('button', { name: '允许使用摄像头' })).toBeFocused();
  await expect(layer.getByRole('button', { name: '暂不开启' })).toBeVisible();
  await expect(layer.getByRole('button', { name: '关闭视频试衣' })).toBeVisible();
  await expect(layer.getByRole('button', { name: '切换前后摄像头' })).toBeHidden();
  // the promise that the video stays on the phone is gone: it doesn't, any more
  await expect(layer).not.toContainText('不会上传或保存');
  await expect(layer.getByRole('checkbox', { name: /境外（美国）/ })).not.toBeChecked();

  await layer.getByRole('button', { name: '允许使用摄像头' }).click();
  await expect(page.locator('.toast')).toHaveText('请先勾选同意，再开启摄像头');
  await expect(state(page)).toHaveAttribute('data-state', 'intro');
  expect((await fakeLog(page)).connects).toHaveLength(0);
});

test('goes live through the back end, wearing the picked garment from the first frame', async ({
  page,
}) => {
  await open(page, 'source=sample&garment=denim-jacket');
  const token = page.waitForResponse((r) => r.url().endsWith('/api/token') && r.status() === 200);
  await goLive(page);
  expect(((await (await token).json()) as { apiKey: string }).apiKey).toMatch(
    /^fake-client-token-/,
  );

  const log = await fakeLog(page);
  expect(log.connects).toHaveLength(1);
  expect(log.connects[0]?.prompt).toMatch(
    /^Substitute the upper body garment with a light blue wash denim trucker jacket/,
  );
  await expect(page.locator('.cam-video--out')).toHaveClass(/is-playing/);
  await expect(page.locator('.cam-ai')).toHaveText('AI生成');
  await expect(page.getByRole('button', { name: '关闭视频试衣' })).toBeFocused();
  // the rail opened on the garment's category, with it marked
  await expect(page.getByRole('button', { name: '外套', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '试穿复古牛仔夹克' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('a garment picked while live is sent to the model', async ({ page }) => {
  await open(page);
  await goLive(page);
  await page.getByRole('button', { name: '下装', exact: true }).click();
  await page.getByRole('button', { name: '试穿百褶半身裙' }).click();
  await expect(page.locator('.cam-chip')).toContainText('正在换上「百褶半身裙」');
  await expect(page.locator('.toast')).toHaveText('已试穿：百褶半身裙');
  await expect(page.getByRole('button', { name: '试穿百褶半身裙' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await fakeLog(page)).sets).toEqual([
    'Substitute the lower body garment with a chocolate brown pleated midi skirt with a high waistband and an A-line shape.',
  ]);
});

test('✕ stops the camera and the session, and reports the seconds used', async ({ page }) => {
  await open(page);
  await goLive(page);
  expect(await cameraLive(page)).toBe(true);
  await page.waitForTimeout(1200);
  const usage = page.waitForRequest((r) => r.url().endsWith('/api/usage'));
  await page.getByRole('button', { name: '关闭视频试衣' }).click();
  await expect(dialog(page)).toBeHidden();
  const report = (await usage).postDataJSON() as { seconds: number };
  expect(report.seconds).toBeGreaterThanOrEqual(1);
  const log = await fakeLog(page);
  expect(log.disconnects).toBe(1);
  expect(log.live).toBe(0);
  await expect(page.getByRole('button', { name: '开启 AI 视频试衣' })).toBeFocused();
});

test('Esc and the browser’s back button close the layer too', async ({ page }) => {
  await open(page);
  await goLive(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  expect((await fakeLog(page)).disconnects).toBe(1);

  await page.getByRole('button', { name: '开启 AI 视频试衣' }).click();
  await goLive(page);
  await page.goBack();
  await expect(dialog(page)).toBeHidden();
  expect((await fakeLog(page)).disconnects).toBe(2);
});

test('the page going hidden pauses: everything stops until 继续试衣', async ({ page }) => {
  await open(page);
  await goLive(page);
  const setVisibility = (value: 'hidden' | 'visible') =>
    page.evaluate((v) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
      document.dispatchEvent(new Event('visibilitychange'));
    }, value);
  await setVisibility('hidden');
  await expect(state(page)).toHaveAttribute('data-state', 'ended');
  await expect(dialog(page).getByRole('heading', { name: '试衣已暂停' })).toBeVisible();
  expect(await cameraLive(page)).toBe(false);
  expect((await fakeLog(page)).live).toBe(0);

  await setVisibility('visible');
  await page.getByRole('button', { name: '继续试衣' }).click();
  await expect(state(page)).toHaveAttribute('data-state', 'live');
  expect((await fakeLog(page)).connects).toHaveLength(2);
});

test('a refused camera shows the prototype’s permission message', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  await open(page, '');
  await goLiveExpectingError(page);
  await expect(dialog(page).getByRole('heading', { name: '没有获得摄像头权限' })).toBeVisible();
  await expect(dialog(page)).toContainText(
    '请在浏览器地址栏左侧的「网站设置」中允许使用摄像头，然后点击重试。',
  );
  await expect(page.getByRole('button', { name: '重试' })).toBeFocused();
  await page.getByRole('button', { name: '返回试衣间' }).click();
  await expect(dialog(page)).toBeHidden();
});

async function goLiveExpectingError(page: Page) {
  await page.getByRole('checkbox', { name: /我同意/ }).check();
  await page.getByRole('button', { name: '允许使用摄像头' }).click();
  await expect(state(page)).toHaveAttribute('data-state', 'error');
}

test('no camera API (an insecure page) and no WebRTC each get their message', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: () => undefined });
  });
  await open(page, '');
  await goLiveExpectingError(page);
  await expect(dialog(page).getByRole('heading', { name: '当前环境不支持摄像头' })).toBeVisible();

  const other = await page.context().newPage();
  await other.addInitScript(() => {
    Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: undefined });
  });
  await open(other);
  await goLiveExpectingError(other);
  await expect(
    dialog(other).getByRole('heading', { name: '当前浏览器不支持实时试衣' }),
  ).toBeVisible();
  await expect(other.getByRole('button', { name: '重试' })).toBeHidden();
});

test('back-end refusals show their message and stop the camera', async ({ page }) => {
  await page.route('**/api/token', (route) =>
    route.fulfill({
      status: 429,
      json: { error: { code: 'busy', message: '2 sessions are live' } },
    }),
  );
  await open(page);
  await goLiveExpectingError(page);
  await expect(dialog(page).getByRole('heading', { name: '试衣服务繁忙' })).toBeVisible();
  expect(await cameraLive(page)).toBe(false);

  await page.unroute('**/api/token');
  await page.route('**/api/token', (route) =>
    route.fulfill({
      status: 429,
      json: { error: { code: 'budget_exhausted', message: 'used up' } },
    }),
  );
  await page.getByRole('button', { name: '重试' }).click();
  await expect(dialog(page).getByRole('heading', { name: '今日试衣额度已用完' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重试' })).toBeHidden();
  await expect(page.getByRole('button', { name: '返回试衣间' })).toBeFocused();
});

test('switching cameras starts a new session on the other camera', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'needs Chromium’s fake camera');
  // a second camera next to Chromium's fake one, which answers for both
  await page.addInitScript(() => {
    const md = navigator.mediaDevices;
    const original = md.getUserMedia.bind(md);
    const list = md.enumerateDevices.bind(md);
    md.enumerateDevices = async () => [
      ...(await list()),
      {
        kind: 'videoinput',
        deviceId: 'back',
        groupId: '',
        label: '',
        toJSON: () => ({}),
      } as MediaDeviceInfo,
    ];
    md.getUserMedia = (c) => {
      (window as unknown as { requested: unknown[] }).requested = [
        ...((window as unknown as { requested?: unknown[] }).requested ?? []),
        c?.video,
      ];
      return original({ video: true });
    };
  });
  await open(page, '');
  await goLive(page);
  const toggle = page.getByRole('button', { name: '切换前后摄像头' });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('.toast')).toHaveText('已切换摄像头');
  await expect(state(page)).toHaveAttribute('data-state', 'live');
  const requested = await page.evaluate(
    () => (window as unknown as { requested: unknown[] }).requested,
  );
  expect(requested[0]).toMatchObject({
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  });
  expect(requested[1]).toMatchObject({ deviceId: { exact: 'back' } });
  const log = await fakeLog(page);
  expect(log.connects).toHaveLength(2);
  expect(log.disconnects).toBe(1);
});

test.describe('a deployment with an access code and a 10-second cap', () => {
  test.use({ baseURL: 'http://localhost:4319' });

  test('asks for the code, sends a wrong one back to the explainer, then goes live', async ({
    page,
  }) => {
    await open(page);
    const code = page.getByLabel('测试访问码');
    await expect(code).toBeVisible();
    await page.getByRole('checkbox', { name: /我同意/ }).check();
    await page.getByRole('button', { name: '允许使用摄像头' }).click();
    await expect(page.locator('.toast')).toHaveText('请先输入测试访问码');

    await code.fill('wrong');
    await page.getByRole('button', { name: '允许使用摄像头' }).click();
    await expect(dialog(page).getByRole('heading', { name: '访问码不正确' })).toBeVisible();
    await page.getByRole('button', { name: '重试' }).click();
    await expect(state(page)).toHaveAttribute('data-state', 'intro');

    await code.fill('e2e-code');
    await page.getByRole('button', { name: '允许使用摄像头' }).click();
    await expect(state(page)).toHaveAttribute('data-state', 'live');
    // remembered on this device for next time
    expect(await page.evaluate(() => localStorage.getItem('live-tryon:access-code'))).toBe(
      'e2e-code',
    );
  });

  test('ends the session at the cap the token carries', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('live-tryon:access-code', 'e2e-code'));
    await open(page);
    await goLive(page);
    await expect(dialog(page).getByRole('heading', { name: '本次试衣已结束' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog(page)).toContainText('每次实时试衣最长 10 秒，可以重新开始。');
    expect((await fakeLog(page)).live).toBe(0);
    expect(await cameraLive(page)).toBe(false);
    await page.getByRole('button', { name: '重新开始' }).click();
    await expect(state(page)).toHaveAttribute('data-state', 'live');
  });
});

test('fits a small phone: no sideways scroll, the explainer above the fold', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await expect(page.locator('.cam-picker')).toBeHidden();
  const box = await page.getByRole('button', { name: '暂不开启' }).boundingBox();
  expect((box?.y ?? 999) + (box?.height ?? 0)).toBeLessThanOrEqual(640);
  await goLive(page);
  await expect(page.locator('.cam-picker')).toBeVisible();
});
