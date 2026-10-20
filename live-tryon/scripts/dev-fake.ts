/**
 * `pnpm dev:fake [--port 5192] [--access-code x] [--active n] [--max-session s]`: the page and the real back end,
 * with a stand-in for api.decart.ai, so the whole path from page to token endpoint runs with no
 * key and no cost. Open the page with ?connector=fake (the media side needs Decart itself).
 * The e2e tests start the page this way.
 *
 * Self-contained so Node runs it directly.
 */
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';

const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '5192' },
    'access-code': { type: 'string' },
    /** live sessions the fake quota reports, to see the busy refusal */
    active: { type: 'string', default: '0' },
    /** the session cap the tokens carry (Decart's minimum is 10 s) */
    'max-session': { type: 'string', default: '120' },
  },
});

let minted = 0;
const decart = createHttpServer((req, res) => {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.headers['x-api-key'] !== 'dct_fake_key_for_tests')
    return send(401, { detail: 'Invalid API key' });
  if (req.method === 'GET' && req.url === '/v1/realtime/quota') {
    const active = Number(args.active);
    return send(200, { limit: 5, active, remaining: 5 - active });
  }
  if (req.method === 'POST' && req.url === '/v1/client/tokens') {
    minted += 1;
    return send(200, {
      apiKey: `fake-client-token-${minted}`,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
  }
  send(404, { detail: 'Not found' });
});
await new Promise<void>((resolve) => decart.listen(0, '127.0.0.1', resolve));
const { port } = decart.address() as AddressInfo;

process.env.DECART_API_KEY = 'dct_fake_key_for_tests';
process.env.DECART_API_URL = `http://127.0.0.1:${port}`;
if (args['access-code']) process.env.LIVE_TRYON_ACCESS_CODE = args['access-code'];
process.env.LIVE_TRYON_MAX_SESSION_SECONDS = args['max-session'];
// a test server: tests mint many tokens from one address, and nothing here costs money
process.env.LIVE_TRYON_TOKENS_PER_MINUTE = '600';
process.env.LIVE_TRYON_DAILY_MINUTES = '0';

const vite = await createServer({
  configFile: join(import.meta.dirname, '..', 'vite.config.ts'),
  server: { port: Number(args.port), strictPort: true },
});
await vite.listen();
console.log(`Fake Decart on :${port}`);
vite.printUrls();
