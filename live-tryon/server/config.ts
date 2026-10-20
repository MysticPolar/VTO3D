/**
 * Server settings, read from the environment (`.env.local` for `pnpm dev`, project environment
 * variables on Vercel). Nothing here is sent to the browser except what `health` chooses to show.
 */

/** Pinned rather than `lucy-vton-latest`, so results stay comparable when Decart ships a new version */
export const MODEL = 'lucy-vton-3.6';

/** Decart's realtime price per generated second at 720p (docs: Getting started → Pricing, Oct 2026) */
export const PRICE_PER_SECOND_USD = { standard: 0.02, fast: 0.04 } as const;

export interface ServerConfig {
  /** The permanent `dct_…` key. Never leaves the server */
  decartApiKey: string | null;
  decartApiUrl: string;
  /** Shared code testers type on the page; null = none */
  accessCode: string | null;
  /** A hosted deployment refuses to mint tokens until an access code is set (fail closed) */
  requireAccessCode: boolean;
  /** Canonical origins allowed to ask for tokens; null = only the page's own origin */
  allowedOrigins: string[] | null;
  /** Client-token lifetime: how long it can open a session, not how long the session runs */
  tokenTtlSeconds: number;
  /** Longest single session. Decart enforces it (`maxSessionDuration`) and so does the page */
  maxSessionSeconds: number;
  /** Live sessions on the Decart account at once, from Decart's own counter */
  maxConcurrent: number;
  /** Session time tokens may be minted for per UTC day; 0 = no daily cap */
  dailyBudgetSeconds: number;
  /** Token requests per client per minute (connects, reconnects and camera switches each need one) */
  tokensPerMinute: number;
  /** Upstash Redis REST credentials for an exact daily cap across serverless instances */
  upstash: { url: string; token: string } | null;
}

type Env = Record<string, string | undefined>;

export class ConfigError extends Error {}

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function int(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = text(env[name]);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${name} must be a whole number from ${min} to ${max} (got "${raw}")`);
  }
  return value;
}

/**
 * The form Decart compares byte for byte with the browser's `Origin` header: lowercase scheme and
 * host, no default port, no path or trailing slash (docs: Client tokens → Origin scoping)
 */
export function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function readConfig(env: Env): ServerConfig {
  const allowed = text(env.LIVE_TRYON_ALLOWED_ORIGINS);
  let allowedOrigins: string[] | null = null;
  if (allowed !== null) {
    allowedOrigins = allowed.split(',').map((entry) => {
      const origin = canonicalOrigin(entry.trim());
      if (!origin)
        throw new ConfigError(
          `LIVE_TRYON_ALLOWED_ORIGINS has an invalid origin: "${entry.trim()}"`,
        );
      return origin;
    });
  }

  const upstashUrl = text(env.KV_REST_API_URL) ?? text(env.UPSTASH_REDIS_REST_URL);
  const upstashToken = text(env.KV_REST_API_TOKEN) ?? text(env.UPSTASH_REDIS_REST_TOKEN);

  return {
    decartApiKey: text(env.DECART_API_KEY),
    decartApiUrl: (text(env.DECART_API_URL) ?? 'https://api.decart.ai').replace(/\/+$/, ''),
    accessCode: text(env.LIVE_TRYON_ACCESS_CODE),
    requireAccessCode: Boolean(text(env.VERCEL)),
    allowedOrigins,
    tokenTtlSeconds: int(env, 'LIVE_TRYON_TOKEN_TTL_SECONDS', 60, 10, 300),
    // Decart's minimum maxSessionDuration is 10 s
    maxSessionSeconds: int(env, 'LIVE_TRYON_MAX_SESSION_SECONDS', 120, 10, 3600),
    maxConcurrent: int(env, 'LIVE_TRYON_MAX_CONCURRENT', 2, 1, 50),
    dailyBudgetSeconds: int(env, 'LIVE_TRYON_DAILY_MINUTES', 20, 0, 24 * 60) * 60,
    tokensPerMinute: int(env, 'LIVE_TRYON_TOKENS_PER_MINUTE', 6, 1, 600),
    upstash:
      upstashUrl && upstashToken
        ? { url: upstashUrl.replace(/\/+$/, ''), token: upstashToken }
        : null,
  };
}
