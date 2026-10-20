import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

/**
 * Real sessions (playwright.measure.config.ts): the sample camera films the base avatar, the page
 * goes live on Lucy VTON 3.6, changes garment twice and closes. Records how long each step takes,
 * Decart's own latency stats, the seconds billed, and every host the page talked to.
 */

const RUN = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = join(import.meta.dirname, '..', 'measurements', RUN);

interface Stats {
  ttffMs: number | null;
  g2gMedianMs: number | null;
  g2gP90Ms: number | null;
  rttMs: number | null;
  fps: number | null;
  sendFps: number | null;
  frameWidth: number | null;
  frameHeight: number | null;
  relayed: boolean | null;
  remote: string | null;
}

interface View {
  phase: string;
  appliedId: string | null;
  seconds: number;
  sessionId: string | null;
  stats: Stats | null;
}

const view = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { liveTryOnSession: { view: View } }).liveTryOnSession.view,
  );
const now = (page: Page) => page.evaluate(() => performance.now());
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[Math.floor((s.length - 1) / 2)] ?? null) : null;
};

/** MEASURE_MODES=standard (or fast) runs just one, to spend less */
const MODES = (process.env.MEASURE_MODES ?? 'standard,fast').split(',');

for (const fast of [false, true]) {
  const mode = fast ? 'fast' : 'standard';
  if (!MODES.includes(mode)) continue;

  test(`a real session in ${mode} mode`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    const hosts = new Set<string>();
    const sockets = new Set<string>();
    const consoleLines: string[] = [];
    page.on('request', (r) => hosts.add(new URL(r.url()).host));
    page.on('websocket', (ws) => sockets.add(new URL(ws.url()).host));
    page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));

    await page.goto(`/?source=sample&debug=1&open=1&garment=black-blazer${fast ? '&fast=1' : ''}`);
    await page.getByRole('checkbox', { name: /我同意/ }).check();
    const t0 = await now(page);
    await page.getByRole('button', { name: '允许使用摄像头' }).click();
    await expect(page.locator('.cam-view')).toHaveAttribute('data-state', 'live', {
      timeout: 90_000,
    });
    const tLive = await now(page);
    await expect(page.locator('.cam-video--out')).toHaveClass(/is-playing/, { timeout: 30_000 });
    const tFrame = await now(page);

    // steady state: one stats sample a second
    const samples: Stats[] = [];
    for (let i = 0; i < 10; i += 1) {
      await page.waitForTimeout(1000);
      const s = (await view(page)).stats;
      if (s) samples.push(s);
    }
    await page.screenshot({ path: join(OUT, `${mode}-1-black-blazer.png`) });

    const switches: { garment: string; ackMs: number }[] = [];
    const picks = [
      ['上装', '白色廓形衬衫', 'white-shirt'],
      ['外套', '复古牛仔夹克', 'denim-jacket'],
    ] as const;
    for (const [category, name, id] of picks) {
      await page.getByRole('button', { name: category, exact: true }).click();
      const tPick = await now(page);
      await page.getByRole('button', { name: `试穿${name}` }).click();
      await page.waitForFunction(
        (g) =>
          (window as unknown as { liveTryOnSession: { view: View } }).liveTryOnSession.view
            .appliedId === g,
        id,
        { timeout: 40_000 },
      );
      switches.push({ garment: id, ackMs: Math.round((await now(page)) - tPick) });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(OUT, `${mode}-${switches.length + 1}a-${id}-2s.png`) });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: join(OUT, `${mode}-${switches.length + 1}b-${id}-5s.png`) });
      const s = (await view(page)).stats;
      if (s) samples.push(s);
    }

    const final = await view(page);
    const timeline = await page.evaluate(
      () => (window as unknown as { liveTryOnTimeline: unknown[] }).liveTryOnTimeline,
    );
    const usage = page.waitForRequest((r) => r.url().endsWith('/api/usage'));
    await page.getByRole('button', { name: '关闭视频试衣' }).click();
    const reported = (await usage).postDataJSON() as { seconds: number };

    const nums = (pick: (s: Stats) => number | null) =>
      samples.map(pick).filter((x): x is number => typeof x === 'number');
    const result = {
      mode,
      model: 'lucy-vton-3.6',
      sessionId: final.sessionId,
      clickToLiveMs: Math.round(tLive - t0),
      clickToFirstFrameMs: Math.round(tFrame - t0),
      sdkTtffMs: nums((s) => s.ttffMs).at(-1) ?? null,
      g2gMedianMs: median(nums((s) => s.g2gMedianMs)),
      g2gP90Ms: median(nums((s) => s.g2gP90Ms)),
      rttMedianMs: median(nums((s) => s.rttMs)),
      fpsMedian: median(nums((s) => s.fps)),
      sendFpsMedian: median(nums((s) => s.sendFps)),
      outputSize: samples.at(-1)
        ? `${samples.at(-1)?.frameWidth}×${samples.at(-1)?.frameHeight}`
        : null,
      relayed: samples.some((s) => s.relayed),
      mediaServer: samples.find((s) => s.remote)?.remote ?? null,
      garmentSwitches: switches,
      billedSeconds: final.seconds,
      reportedSeconds: reported.seconds,
      costUsd: Math.round(final.seconds * (fast ? 0.04 : 0.02) * 100) / 100,
      httpHosts: [...hosts].sort(),
      websocketHosts: [...sockets].sort(),
      timeline,
    };
    writeFileSync(join(OUT, `${mode}.json`), `${JSON.stringify(result, null, 2)}\n`);
    writeFileSync(join(OUT, `${mode}-console.log`), `${consoleLines.join('\n')}\n`);
    console.log(JSON.stringify({ ...result, timeline: undefined }, null, 2));

    // China-readiness: nothing went to Google, and the SDK's analytics stayed off
    expect([...hosts, ...sockets].filter((h) => /google|platform\.decart\.ai/.test(h))).toEqual([]);
  });
}
