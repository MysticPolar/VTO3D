/**
 * `pnpm visual:baseline` (HANDOFF §10.2): serves the prototype on a free local port and screenshots
 * every screen of §8 in its bare `?app=<id>` mode into e2e/visual/__baseline__/<file>.png, and the
 * same screen below the 44 px status bar into __baseline__/inset/<file>.png for the inset check.
 * It uses the visual tests' phone, clock and time zone, and a fresh browser context (seed data)
 * for each screen.
 *
 * `--prototype <dir>` captures another copy of the prototype, e.g. a clean export of the last
 * commit while reference/prototype/ has uncommitted edits:
 *   git archive HEAD reference/prototype | tar -x -C /tmp/p
 *   pnpm visual:baseline --prototype /tmp/p/reference/prototype
 */
import { chromium } from '@playwright/test';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { ANDROID_UA, FROZEN_NOW, PHONE } from '../../e2e/device.ts';
import { BASELINES } from '../../e2e/screens.ts';

const { values: args } = parseArgs({ options: { prototype: { type: 'string' } } });
const ROOT = join(import.meta.dirname, '..', '..');
const PROTOTYPE = resolve(args.prototype ?? join(ROOT, 'reference', 'prototype'));
const OUT = join(ROOT, 'e2e', 'visual', '__baseline__');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

/** A static file server for `root` on a free port of 127.0.0.1 */
function serve(root: string): Promise<{ origin: string; close: () => void }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = resolve(root, `.${path.endsWith('/') ? `${path}index.html` : path}`);
    if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      done({ origin: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

if (!existsSync(join(PROTOTYPE, 'index.html'))) throw new Error(`No prototype in ${PROTOTYPE}`);
mkdirSync(join(OUT, 'inset'), { recursive: true });

const { origin, close } = await serve(PROTOTYPE);
const browser = await chromium.launch();
try {
  for (const b of BASELINES) {
    const context = await browser.newContext({ ...PHONE, userAgent: ANDROID_UA });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.clock.setFixedTime(FROZEN_NOW);
    await page.goto(`${origin}/index.html?${b.prototype}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(500);

    // a wrong ?app= parameter would silently capture some other screen
    const shown = await page.evaluate(
      () =>
        (window as unknown as { VT?: { liveApp?: { cur?: { id?: string } } } }).VT?.liveApp?.cur
          ?.id,
    );
    if (shown !== b.screen) throw new Error(`?${b.prototype} shows "${shown}", not "${b.screen}"`);
    if (errors.length > 0) throw new Error(`?${b.prototype}: ${errors.join(' | ')}`);

    await page.screenshot({ path: join(OUT, `${b.file}.png`), animations: 'disabled' });
    if (b.inset) {
      await page.screenshot({
        path: join(OUT, 'inset', `${b.file}.png`),
        animations: 'disabled',
        clip: { x: 0, y: 44, width: 390, height: 800 },
      });
    }
    console.log(`${b.file}.png${b.inset ? ' + inset' : ''}`);
    await context.close();
  }
} finally {
  await browser.close();
  close();
}
console.log(`${BASELINES.length} baselines from ${PROTOTYPE} in ${relative(ROOT, OUT)}/`);
