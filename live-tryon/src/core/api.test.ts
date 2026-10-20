import { describe, expect, it } from 'vitest';
import { httpApi, ServiceError } from './api.js';

interface Sent {
  url: string;
  init: RequestInit;
}

function fakeFetch(reply: (url: string) => Response | Promise<Response>) {
  const sent: Sent[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({ url: String(input), init: init ?? {} });
    return reply(String(input));
  }) as typeof fetch;
  return { impl, sent };
}

const grant = {
  apiKey: 'client-token',
  expiresAt: '2026-10-20T12:01:00Z',
  model: 'lucy-vton-3.6',
  maxSessionSeconds: 120,
  reservationId: '2026-10-20.abcdefgh',
};

describe('httpApi', () => {
  it('asks for a token with the access code', async () => {
    const f = fakeFetch(() => Response.json(grant));
    const api = httpApi({ accessCode: () => 'blue-coat', fetch: f.impl });
    expect(await api.token()).toEqual(grant);
    expect(f.sent[0]?.url).toBe('/api/token');
    expect(f.sent[0]?.init.method).toBe('POST');
    expect(new Headers(f.sent[0]?.init.headers).get('x-access-code')).toBe('blue-coat');
  });

  it('sends no access header without a code', async () => {
    const f = fakeFetch(() => Response.json(grant));
    await httpApi({ accessCode: () => null, fetch: f.impl, base: 'https://x.example' }).token();
    expect(f.sent[0]?.url).toBe('https://x.example/api/token');
    expect(new Headers(f.sent[0]?.init.headers).has('x-access-code')).toBe(false);
  });

  it('turns refusals into ServiceErrors with the server’s code', async () => {
    const f = fakeFetch(() =>
      Response.json({ error: { code: 'busy', message: '2 live' } }, { status: 429 }),
    );
    const error = await httpApi({ accessCode: () => null, fetch: f.impl })
      .token()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect(error).toMatchObject({ code: 'busy', status: 429, message: '2 live' });
  });

  it('copes with a proxy error page and a dropped connection', async () => {
    const page = fakeFetch(() => new Response('<html>502</html>', { status: 502 }));
    await expect(
      httpApi({ accessCode: () => null, fetch: page.impl }).token(),
    ).rejects.toMatchObject({
      code: 'upstream_error',
      status: 502,
    });
    const offline = httpApi({
      accessCode: () => null,
      fetch: (async () => {
        throw new TypeError('Failed to fetch');
      }) as typeof fetch,
    });
    await expect(offline.token()).rejects.toMatchObject({ code: 'network', status: 0 });
  });

  it('rejects a token response without the token', async () => {
    const f = fakeFetch(() => Response.json({ reservationId: 'x' }));
    await expect(httpApi({ accessCode: () => null, fetch: f.impl }).token()).rejects.toMatchObject({
      code: 'upstream_error',
    });
  });

  it('reports usage with keepalive and never throws', async () => {
    const f = fakeFetch(() => {
      throw new Error('gone');
    });
    const api = httpApi({ accessCode: () => 'c', fetch: f.impl });
    api.reportUsage('2026-10-20.abcdefgh', 12.345);
    await new Promise((r) => setTimeout(r, 0));
    expect(f.sent[0]?.url).toBe('/api/usage');
    expect(f.sent[0]?.init.keepalive).toBe(true);
    expect(JSON.parse(String(f.sent[0]?.init.body))).toEqual({
      reservationId: '2026-10-20.abcdefgh',
      seconds: 12.3,
    });
  });

  it('reads the service info', async () => {
    const info = { ok: true, accessCode: 'required' };
    const f = fakeFetch(() => Response.json(info));
    expect(await httpApi({ accessCode: () => null, fetch: f.impl }).health()).toEqual(info);
    expect(f.sent[0]?.init.method).toBe('GET');
  });
});
