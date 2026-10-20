import { describe, expect, it } from 'vitest';
import type { ServiceInfo, TokenGrant } from '../src/core/protocol.js';
import { memoryBudget } from './budget.js';
import { readConfig } from './config.js';
import { createHandlers, type HandlerDeps } from './handlers.js';
import { rateLimiter } from './rate-limit.js';

const KEY = 'dct_permanent_test_key_123';
const PAGE = 'http://localhost:5190';
const DAY_MS = Date.UTC(2026, 9, 20, 12);

interface Call {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
}

/** A stand-in for api.decart.ai: records every call, answers the two endpoints the server uses */
function fakeDecart(
  opts: { active?: number | null; quotaFails?: boolean; mint?: (n: number) => Response } = {},
) {
  const calls: Call[] = [];
  let minted = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init?.method ?? 'GET', headers, body });
    if (url.endsWith('/v1/realtime/quota')) {
      if (opts.quotaFails) return new Response('nope', { status: 500 });
      const active = opts.active === undefined ? 0 : opts.active;
      return Response.json({ limit: 5, active, remaining: active === null ? null : 5 - active });
    }
    if (url.endsWith('/v1/client/tokens')) {
      minted += 1;
      if (opts.mint) return opts.mint(minted);
      return Response.json({ apiKey: `client-token-${minted}`, expiresAt: '2026-10-20T12:01:00Z' });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
  return {
    fetch: fetchImpl,
    calls,
    mints: () => calls.filter((c) => c.url.endsWith('/v1/client/tokens')),
  };
}

function setup(env: Record<string, string> = {}, decart = fakeDecart()) {
  let now = DAY_MS;
  let ids = 0;
  const logs: string[] = [];
  const config = readConfig({ DECART_API_KEY: KEY, ...env });
  const deps: HandlerDeps = {
    config,
    fetch: decart.fetch,
    now: () => now,
    budget: memoryBudget(),
    limiter: rateLimiter(config.tokensPerMinute, () => now),
    randomId: () => `id${String(++ids).padStart(8, '0')}`,
    log: (message, data) => logs.push(`${message} ${JSON.stringify(data ?? {})}`),
  };
  return {
    handlers: createHandlers(deps),
    decart,
    logs,
    tick: (ms: number) => (now += ms),
  };
}

function post(
  path: string,
  init: { origin?: string | null; code?: string; body?: unknown; ip?: string } = {},
) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (init.origin !== null) headers.set('origin', init.origin ?? PAGE);
  if (init.code) headers.set('x-access-code', init.code);
  if (init.ip) headers.set('x-forwarded-for', init.ip);
  return new Request(`${PAGE}${path}`, {
    method: 'POST',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function errorCode(res: Response) {
  return ((await res.json()) as { error: { code: string } }).error.code;
}

describe('POST /api/token', () => {
  it('mints a client token scoped to the model, this origin and the session cap', async () => {
    const { handlers, decart } = setup();
    const res = await handlers.token(post('/api/token'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const grant = (await res.json()) as TokenGrant;
    expect(grant).toEqual({
      apiKey: 'client-token-1',
      expiresAt: '2026-10-20T12:01:00Z',
      model: 'lucy-vton-3.6',
      maxSessionSeconds: 120,
      reservationId: '2026-10-20.id00000001',
    });

    const [mint] = decart.mints();
    expect(mint?.url).toBe('https://api.decart.ai/v1/client/tokens');
    expect(mint?.method).toBe('POST');
    expect(mint?.headers.get('x-api-key')).toBe(KEY);
    expect(mint?.body).toEqual({
      expiresIn: 60,
      allowedModels: ['lucy-vton-3.6'],
      allowedOrigins: [PAGE],
      constraints: { realtime: { maxSessionDuration: 120 } },
      metadata: { app: 'vto3d-live-tryon' },
    });
  });

  it('never puts the permanent key in a response', async () => {
    const { handlers } = setup();
    const text = await (await handlers.token(post('/api/token'))).text();
    expect(text).not.toContain(KEY);
    const health = await (await handlers.health(new Request(`${PAGE}/api/health`))).text();
    expect(health).not.toContain(KEY);
  });

  it('refuses GET', async () => {
    const { handlers } = setup();
    const res = await handlers.token(
      new Request(`${PAGE}/api/token`, { headers: { origin: PAGE } }),
    );
    expect(res.status).toBe(405);
  });

  it('says so when the key is missing', async () => {
    const { handlers } = setup({ DECART_API_KEY: '' });
    const res = await handlers.token(post('/api/token'));
    expect(res.status).toBe(503);
    expect(await errorCode(res)).toBe('not_configured');
  });

  it('fails closed on a hosted deployment without an access code', async () => {
    const { handlers, decart } = setup({ VERCEL: '1' });
    const res = await handlers.token(post('/api/token'));
    expect(res.status).toBe(503);
    expect(await errorCode(res)).toBe('not_configured');
    expect(decart.calls).toHaveLength(0);
  });

  it('checks the access code', async () => {
    const { handlers, decart } = setup({ LIVE_TRYON_ACCESS_CODE: 'blue-coat-42' });
    const missing = await handlers.token(post('/api/token'));
    expect(missing.status).toBe(401);
    expect(await errorCode(missing)).toBe('access_code_required');
    const wrong = await handlers.token(post('/api/token', { code: 'blue-coat-43' }));
    expect(wrong.status).toBe(401);
    expect(await errorCode(wrong)).toBe('access_code_invalid');
    expect(decart.calls).toHaveLength(0);
    const right = await handlers.token(post('/api/token', { code: ' blue-coat-42 ' }));
    expect(right.status).toBe(200);
  });

  it('only answers its own page or configured origins', async () => {
    const { handlers, decart } = setup({
      LIVE_TRYON_ALLOWED_ORIGINS: 'https://Preview.Example.com/',
    });
    expect((await handlers.token(post('/api/token', { origin: null }))).status).toBe(403);
    const other = await handlers.token(post('/api/token', { origin: 'https://evil.example' }));
    expect(other.status).toBe(403);
    expect(await errorCode(other)).toBe('origin_not_allowed');
    expect(decart.calls).toHaveLength(0);

    const listed = await handlers.token(
      post('/api/token', { origin: 'https://preview.example.com' }),
    );
    expect(listed.status).toBe(200);
    expect(decart.mints()[0]?.body).toMatchObject({
      allowedOrigins: ['https://preview.example.com'],
    });
  });

  it('limits token requests per client per minute', async () => {
    const { handlers, tick } = setup({ LIVE_TRYON_DAILY_MINUTES: '0' });
    for (let i = 0; i < 6; i += 1)
      expect((await handlers.token(post('/api/token'))).status).toBe(200);
    const seventh = await handlers.token(post('/api/token'));
    expect(seventh.status).toBe(429);
    expect(await errorCode(seventh)).toBe('rate_limited');
    expect((await handlers.token(post('/api/token', { ip: '203.0.113.9' }))).status).toBe(200);
    tick(60_000);
    expect((await handlers.token(post('/api/token'))).status).toBe(200);
  });

  it('refuses while the account has as many live sessions as allowed', async () => {
    const { handlers } = setup({ LIVE_TRYON_DAILY_MINUTES: '2' }, fakeDecart({ active: 2 }));
    const res = await handlers.token(post('/api/token'));
    expect(res.status).toBe(429);
    const text = await res.text();
    expect(text).toContain('busy');
    // the token minted alongside the quota read is never handed out
    expect(text).not.toContain('client-token');
  });

  it('gives a busy refusal’s budget back', async () => {
    let active = 2;
    const decart = fakeDecart();
    const busyAware = (async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith('/v1/realtime/quota')
        ? Response.json({ limit: 5, active, remaining: 5 - active })
        : decart.fetch(input, init)) as typeof fetch;
    const { handlers } = setup({ LIVE_TRYON_DAILY_MINUTES: '2' }, { ...decart, fetch: busyAware });
    expect((await handlers.token(post('/api/token'))).status).toBe(429);
    active = 0;
    // the one 2-minute session the day allows is still there
    expect((await handlers.token(post('/api/token'))).status).toBe(200);
  });

  it('asks Decart for the quota and the token at the same time', async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const decart = fakeDecart();
    const slowQuota = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      order.push(url.endsWith('/quota') ? 'quota' : 'mint');
      if (url.endsWith('/quota')) await gate;
      return decart.fetch(input, init);
    }) as typeof fetch;
    const { handlers } = setup({}, { ...decart, fetch: slowQuota });
    const pending = handlers.token(post('/api/token'));
    await new Promise((r) => setTimeout(r, 0));
    // the mint went out while the quota read was still waiting
    expect(order).toEqual(['quota', 'mint']);
    release();
    expect((await pending).status).toBe(200);
  });

  it('lets the request through when the quota read fails or the counter is unknown', async () => {
    expect(
      (await setup({}, fakeDecart({ quotaFails: true })).handlers.token(post('/api/token'))).status,
    ).toBe(200);
    expect(
      (await setup({}, fakeDecart({ active: null })).handlers.token(post('/api/token'))).status,
    ).toBe(200);
  });

  it('stops minting once the day’s budget is reserved, and takes back what sessions did not use', async () => {
    // 4 minutes a day, 2-minute sessions: two tokens fit
    const { handlers, tick } = setup({
      LIVE_TRYON_DAILY_MINUTES: '4',
      LIVE_TRYON_TOKENS_PER_MINUTE: '100',
    });
    const first = (await (await handlers.token(post('/api/token'))).json()) as TokenGrant;
    expect((await handlers.token(post('/api/token'))).status).toBe(200);
    const third = await handlers.token(post('/api/token'));
    expect(third.status).toBe(429);
    expect(await errorCode(third)).toBe('budget_exhausted');

    // the first session only generated 30 s: 90 s come back, not enough for a whole session
    const report = post('/api/usage', {
      body: { reservationId: first.reservationId, seconds: 30 },
    });
    expect((await handlers.usage(report)).status).toBe(204);
    expect((await handlers.token(post('/api/token'))).status).toBe(429);

    // a second report for the same reservation changes nothing
    await handlers.usage(
      post('/api/usage', { body: { reservationId: first.reservationId, seconds: 0 } }),
    );
    expect((await handlers.token(post('/api/token'))).status).toBe(429);

    tick(24 * 3600_000);
    expect((await handlers.token(post('/api/token'))).status).toBe(200);
  });

  it('gives the reservation back when Decart refuses, without leaking its message or the key', async () => {
    const decart = fakeDecart({
      mint: (n) =>
        n === 1
          ? Response.json({ detail: `invalid key ${KEY}` }, { status: 401 })
          : Response.json({ apiKey: 'client-token-ok', expiresAt: '2026-10-20T12:01:00Z' }),
    });
    const { handlers, logs } = setup({ LIVE_TRYON_DAILY_MINUTES: '2' }, decart);
    const res = await handlers.token(post('/api/token'));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain('upstream_error');
    expect(text).not.toContain(KEY);
    expect(logs.join('\n')).not.toContain(KEY);
    expect(logs.join('\n')).toContain('[key]');
    // the 2-minute budget is whole again
    expect((await handlers.token(post('/api/token'))).status).toBe(200);
  });

  it('rejects a mint response without a token, or one that echoes the permanent key', async () => {
    for (const body of [{}, { apiKey: KEY, expiresAt: 'x' }]) {
      const { handlers } = setup({}, fakeDecart({ mint: () => Response.json(body) }));
      expect((await handlers.token(post('/api/token'))).status).toBe(502);
    }
  });
});

describe('POST /api/usage', () => {
  it('validates the report', async () => {
    const { handlers } = setup();
    for (const body of [
      null,
      {},
      { reservationId: 'x', seconds: 3 },
      { reservationId: '2026-10-20.id00000001', seconds: -1 },
    ]) {
      expect((await handlers.usage(post('/api/usage', { body }))).status).toBe(400);
    }
    const notJson = new Request(`${PAGE}/api/usage`, {
      method: 'POST',
      headers: { origin: PAGE },
      body: '{',
    });
    expect((await handlers.usage(notJson)).status).toBe(400);
  });

  it('needs the same origin and access code as a token', async () => {
    const { handlers } = setup({ LIVE_TRYON_ACCESS_CODE: 'abc' });
    const body = { reservationId: '2026-10-20.id00000001', seconds: 3 };
    expect((await handlers.usage(post('/api/usage', { body }))).status).toBe(401);
    expect(
      (await handlers.usage(post('/api/usage', { body, code: 'abc', origin: 'https://x.example' })))
        .status,
    ).toBe(403);
    expect((await handlers.usage(post('/api/usage', { body, code: 'abc' }))).status).toBe(204);
  });
});

describe('GET /api/health', () => {
  it('tells the page what it needs, and nothing secret', async () => {
    const { handlers } = setup({
      LIVE_TRYON_MAX_SESSION_SECONDS: '90',
      LIVE_TRYON_DAILY_MINUTES: '15',
    });
    const info = (await (
      await handlers.health(new Request(`${PAGE}/api/health`))
    ).json()) as ServiceInfo;
    expect(info).toEqual({
      ok: true,
      model: 'lucy-vton-3.6',
      keyConfigured: true,
      accessCode: 'none',
      maxSessionSeconds: 90,
      dailyMinutes: 15,
      budgetStore: 'memory',
      pricePerSecondUsd: { standard: 0.02, fast: 0.04 },
    });
  });

  it('reports an access code as required when one is set or the deployment is hosted', async () => {
    const envs: Record<string, string>[] = [{ LIVE_TRYON_ACCESS_CODE: 'x' }, { VERCEL: '1' }];
    for (const env of envs) {
      const res = await setup(env).handlers.health(new Request(`${PAGE}/api/health`));
      expect(((await res.json()) as ServiceInfo).accessCode).toBe('required');
    }
  });
});
