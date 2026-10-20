import { describe, expect, it } from 'vitest';
import { isReservationId, memoryBudget, upstashBudget, utcDay } from './budget.js';
import { rateLimiter } from './rate-limit.js';

describe('memoryBudget', () => {
  it('reserves whole sessions up to the limit and gives back what was not used, once', async () => {
    const budget = memoryBudget();
    expect(await budget.reserve('2026-10-20.aaaaaaaa', 120, 300)).toBe(true);
    expect(await budget.reserve('2026-10-20.bbbbbbbb', 120, 300)).toBe(true);
    expect(await budget.reserve('2026-10-20.cccccccc', 120, 300)).toBe(false);
    expect(await budget.used('2026-10-20')).toBe(240);

    await budget.settle('2026-10-20.aaaaaaaa', 20.2);
    expect(await budget.used('2026-10-20')).toBe(141);
    await budget.settle('2026-10-20.aaaaaaaa', 0);
    expect(await budget.used('2026-10-20')).toBe(141);
    expect(await budget.reserve('2026-10-20.cccccccc', 120, 300)).toBe(true);
  });

  it('charges a report to the reservation’s own day, and treats nonsense as fully used', async () => {
    const budget = memoryBudget();
    await budget.reserve('2026-10-20.aaaaaaaa', 120, 1000);
    await budget.reserve('2026-10-21.bbbbbbbb', 120, 1000);
    await budget.settle('2026-10-20.aaaaaaaa', 0);
    expect(await budget.used('2026-10-20')).toBe(0);
    expect(await budget.used('2026-10-21')).toBe(120);
    await budget.settle('2026-10-21.bbbbbbbb', Number.NaN);
    expect(await budget.used('2026-10-21')).toBe(120);
  });
});

describe('upstashBudget', () => {
  it('sends atomic scripts over the REST API', async () => {
    const sent: { url: string; auth: string | null; body: string[] }[] = [];
    let result: unknown = 1;
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      sent.push({
        url: String(url),
        auth: new Headers(init?.headers).get('authorization'),
        body: JSON.parse(String(init?.body)) as string[],
      });
      return Response.json({ result });
    }) as typeof fetch;
    const budget = upstashBudget('https://x.upstash.io', 'secret', fetchImpl);

    expect(await budget.reserve('2026-10-20.aaaaaaaa', 120, 1200)).toBe(true);
    const [reserve] = sent;
    expect(reserve?.url).toBe('https://x.upstash.io');
    expect(reserve?.auth).toBe('Bearer secret');
    expect(reserve?.body.slice(0, 1)).toEqual(['EVAL']);
    expect(reserve?.body.slice(2)).toEqual([
      '2',
      'live-tryon:budget:2026-10-20',
      'live-tryon:reservation:2026-10-20.aaaaaaaa',
      '120',
      '1200',
    ]);

    result = 0;
    expect(await budget.reserve('2026-10-20.bbbbbbbb', 120, 1200)).toBe(false);

    await budget.settle('2026-10-20.aaaaaaaa', 30.4);
    expect(sent.at(-1)?.body.slice(-1)).toEqual(['31']);

    result = '480';
    expect(await budget.used('2026-10-20')).toBe(480);
    expect(sent.at(-1)?.body).toEqual(['GET', 'live-tryon:budget:2026-10-20']);
  });

  it('surfaces Upstash errors', async () => {
    const fetchImpl = (async () =>
      Response.json({ error: 'WRONGPASS' }, { status: 401 })) as typeof fetch;
    await expect(upstashBudget('https://x', 'bad', fetchImpl).used('2026-10-20')).rejects.toThrow(
      'WRONGPASS',
    );
  });
});

describe('ids and days', () => {
  it('uses UTC days and recognises reservation ids', () => {
    expect(utcDay(Date.UTC(2026, 9, 20, 23, 59))).toBe('2026-10-20');
    expect(isReservationId('2026-10-20.k3j9XYZ_-a')).toBe(true);
    expect(isReservationId('2026-10-20.short')).toBe(false);
    expect(isReservationId('../../etc')).toBe(false);
    expect(isReservationId(42)).toBe(false);
  });
});

describe('rateLimiter', () => {
  it('allows n requests per rolling minute per key', () => {
    let now = 0;
    const limiter = rateLimiter(2, () => now);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
    expect(limiter.take('b')).toBe(true);
    now = 59_999;
    expect(limiter.take('a')).toBe(false);
    now = 60_000;
    expect(limiter.take('a')).toBe(true);
  });
});
