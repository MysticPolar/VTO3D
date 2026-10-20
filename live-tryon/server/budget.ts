/**
 * The daily cost cap. Every token reserves a whole session (`maxSessionSeconds`) of the day's
 * budget, since that is the most it can cost; when the session ends the page reports the seconds
 * Decart actually generated and the unused rest goes back. A page that never reports (closed tab,
 * crash) keeps its full reservation, so the cap errs on the safe side.
 *
 * Reservation ids start with their UTC day (`2026-10-20.k3j9…`), so a session that ends after
 * midnight gives its seconds back to the day it was charged to.
 */

export interface BudgetStore {
  readonly kind: 'memory' | 'upstash';
  /** Reserves `seconds` under `id` unless the day would go over `limit`; false = refused */
  reserve(id: string, seconds: number, limit: number): Promise<boolean>;
  /** Returns what reservation `id` didn't use. Only the first report per id counts */
  settle(id: string, usedSeconds: number): Promise<void>;
  /** Seconds reserved so far on `day` */
  used(day: string): Promise<number>;
}

/** `2026-10-20` in UTC */
export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const dayOf = (id: string): string => id.slice(0, 10);

const ID = /^\d{4}-\d{2}-\d{2}\.[\w-]{8,64}$/;
export const isReservationId = (value: unknown): value is string =>
  typeof value === 'string' && ID.test(value);

const clampUsed = (used: number, reserved: number) =>
  Math.min(reserved, Math.max(0, Number.isFinite(used) ? Math.ceil(used) : reserved));

/** One process's memory: exact for `pnpm dev`, per instance on serverless hosts */
export function memoryBudget(): BudgetStore {
  const days = new Map<string, number>();
  const open = new Map<string, number>();
  return {
    kind: 'memory',
    async reserve(id, seconds, limit) {
      const day = dayOf(id);
      const used = days.get(day) ?? 0;
      if (used + seconds > limit) return false;
      days.set(day, used + seconds);
      open.set(id, seconds);
      // keep the maps small: only today and yesterday matter
      for (const key of days.keys()) if (key < day && days.size > 2) days.delete(key);
      return true;
    },
    async settle(id, usedSeconds) {
      const reserved = open.get(id);
      if (reserved === undefined) return;
      open.delete(id);
      const day = dayOf(id);
      const back = reserved - clampUsed(usedSeconds, reserved);
      if (back > 0 && days.has(day)) days.set(day, Math.max(0, (days.get(day) ?? 0) - back));
    },
    async used(day) {
      return days.get(day) ?? 0;
    },
  };
}

/* Both scripts run atomically in Redis, so two requests can't both take the last minutes */
const RESERVE = `local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if used + tonumber(ARGV[1]) > tonumber(ARGV[2]) then return 0 end
redis.call('INCRBY', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], 172800)
redis.call('SET', KEYS[2], ARGV[1], 'EX', 172800)
return 1`;

const SETTLE = `local reserved = redis.call('GET', KEYS[2])
if not reserved then return 0 end
redis.call('DEL', KEYS[2])
local back = tonumber(reserved) - math.min(tonumber(reserved), tonumber(ARGV[1]))
if back > 0 then redis.call('DECRBY', KEYS[1], back) end
return 1`;

/** Upstash Redis over its REST API (one POST per command), so no client library is needed */
export function upstashBudget(url: string, token: string, fetchImpl: typeof fetch): BudgetStore {
  async function command(args: (string | number)[]): Promise<unknown> {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(args.map(String)),
      signal: AbortSignal.timeout(5000),
    });
    const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!res.ok || body.error)
      throw new Error(`Upstash ${res.status}: ${body.error ?? 'request failed'}`);
    return body.result;
  }
  const dayKey = (day: string) => `live-tryon:budget:${day}`;
  const resKey = (id: string) => `live-tryon:reservation:${id}`;
  return {
    kind: 'upstash',
    async reserve(id, seconds, limit) {
      const ok = await command(['EVAL', RESERVE, 2, dayKey(dayOf(id)), resKey(id), seconds, limit]);
      return Number(ok) === 1;
    },
    async settle(id, usedSeconds) {
      const used = Number.isFinite(usedSeconds) ? Math.max(0, Math.ceil(usedSeconds)) : 1e9;
      await command(['EVAL', SETTLE, 2, dayKey(dayOf(id)), resKey(id), used]);
    },
    async used(day) {
      return Number((await command(['GET', dayKey(day)])) ?? 0);
    },
  };
}
