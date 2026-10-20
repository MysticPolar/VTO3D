/**
 * Token requests per client per minute, in memory. A courtesy limit against a stuck retry loop,
 * not a security boundary: the access code, the session cap and the daily budget are those.
 */
export interface RateLimiter {
  take(key: string): boolean;
}

const WINDOW_MS = 60_000;
const MAX_KEYS = 5000;

export function rateLimiter(perMinute: number, now: () => number): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    take(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < WINDOW_MS);
      if (recent.length >= perMinute) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.delete(key);
      hits.set(key, recent);
      // Maps iterate in insertion order, so the first key is the one seen least recently
      if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value as string);
      return true;
    },
  };
}
