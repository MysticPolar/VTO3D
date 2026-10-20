/**
 * The back end, as plain Web `Request → Response` handlers so the same code runs as Vercel
 * Functions (api/*.ts) and inside the Vite dev server (vite.config.ts).
 *
 *   POST /api/token   access code + origin + rate + concurrency + daily budget → Decart client token
 *   POST /api/usage   the seconds a session really generated, to give unused budget back
 *   GET  /api/health  settings the page needs (is an access code required, session cap); no secrets
 *
 * The permanent Decart key is read here and sent only to api.decart.ai. Responses carry the
 * short-lived client token, never the key.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  ACCESS_CODE_HEADER,
  type ErrorBody,
  type ServiceErrorCode,
  type ServiceInfo,
  type TokenGrant,
} from '../src/core/protocol.js';
import { type BudgetStore, isReservationId, utcDay } from './budget.js';
import { canonicalOrigin, MODEL, PRICE_PER_SECOND_USD, type ServerConfig } from './config.js';
import { createClientToken, type DecartCall, getRealtimeQuota } from './decart.js';
import type { RateLimiter } from './rate-limit.js';

export interface HandlerDeps {
  config: ServerConfig;
  fetch: typeof fetch;
  now: () => number;
  budget: BudgetStore;
  limiter: RateLimiter;
  randomId: () => string;
  log: (message: string, data?: Record<string, unknown>) => void;
}

export interface Handlers {
  token(req: Request): Promise<Response>;
  usage(req: Request): Promise<Response>;
  health(req: Request): Promise<Response>;
}

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

const fail = (status: number, code: ServiceErrorCode, message: string) =>
  json(status, { error: { code, message } } satisfies ErrorBody);

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

const digest = (value: string) => createHash('sha256').update(value).digest();
/** Constant-time comparison, so response timing says nothing about how much of a guess was right */
const sameCode = (given: string, expected: string) =>
  timingSafeEqual(digest(given), digest(expected));

/** The browser's Origin, accepted when it is this page's own origin or one configured on purpose */
function allowedOrigin(req: Request, config: ServerConfig): string | null {
  const header = req.headers.get('origin');
  const origin = header ? canonicalOrigin(header) : null;
  if (!origin) return null;
  if (origin === new URL(req.url).origin) return origin;
  return config.allowedOrigins?.includes(origin) ? origin : null;
}

/** Vercel sets x-forwarded-for itself; locally there is only one client */
function clientKey(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

export function createHandlers(deps: HandlerDeps): Handlers {
  const { config } = deps;
  const decart = (): DecartCall => ({
    apiUrl: config.decartApiUrl,
    apiKey: config.decartApiKey ?? '',
    fetch: deps.fetch,
  });

  /** Checks shared by token and usage; null when the request may go on */
  function guard(req: Request): { origin: string } | Response {
    if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST');
    if (!config.decartApiKey)
      return fail(503, 'not_configured', 'DECART_API_KEY is not set on the server');
    if (config.requireAccessCode && !config.accessCode) {
      return fail(503, 'not_configured', 'LIVE_TRYON_ACCESS_CODE is not set on the server');
    }
    const origin = allowedOrigin(req, config);
    if (!origin)
      return fail(403, 'origin_not_allowed', 'This page’s origin may not request tokens');
    if (config.accessCode) {
      const given = req.headers.get(ACCESS_CODE_HEADER)?.trim();
      if (!given) return fail(401, 'access_code_required', 'An access code is required');
      if (!sameCode(given, config.accessCode))
        return fail(401, 'access_code_invalid', 'Wrong access code');
    }
    return { origin };
  }

  async function token(req: Request): Promise<Response> {
    const checked = guard(req);
    if (checked instanceof Response) return checked;
    if (!deps.limiter.take(clientKey(req)))
      return fail(429, 'rate_limited', 'Too many token requests');

    const reservationId = `${utcDay(deps.now())}.${deps.randomId()}`;
    const budgeted = config.dailyBudgetSeconds > 0;
    if (budgeted) {
      const ok = await deps.budget.reserve(
        reservationId,
        config.maxSessionSeconds,
        config.dailyBudgetSeconds,
      );
      if (!ok) return fail(429, 'budget_exhausted', 'Today’s live try-on budget is used up');
    }
    const giveBack = async () => {
      if (budgeted) await deps.budget.settle(reservationId, 0);
    };

    // Both Decart calls at once: each takes 0.3–1.5 s, and the user is waiting on this response.
    // A minted token costs nothing; one that isn't handed out just expires.
    const [quota, minted] = await Promise.allSettled([
      getRealtimeQuota(decart()),
      createClientToken(decart(), {
        model: MODEL,
        origin: checked.origin,
        ttlSeconds: config.tokenTtlSeconds,
        maxSessionSeconds: config.maxSessionSeconds,
      }),
    ]);

    // Decart's live counter is advisory (another session can start between this read and the
    // dial), so a failed read lets the request through and Decart's own limit decides
    if (quota.status === 'rejected') {
      deps.log('quota check failed', { error: describe(quota.reason) });
    } else if (quota.value.active !== null && quota.value.active >= config.maxConcurrent) {
      await giveBack();
      const live = quota.value.active;
      return fail(429, 'busy', `${live} sessions are live; the limit is ${config.maxConcurrent}`);
    }

    if (minted.status === 'rejected') {
      await giveBack();
      deps.log('token mint failed', { error: describe(minted.reason) });
      return fail(502, 'upstream_error', 'Could not create a live try-on session token');
    }

    deps.log('token minted', {
      origin: checked.origin,
      reservationId,
      expiresAt: minted.value.expiresAt,
    });
    const grant: TokenGrant = {
      apiKey: minted.value.apiKey,
      expiresAt: minted.value.expiresAt,
      model: MODEL,
      maxSessionSeconds: config.maxSessionSeconds,
      reservationId,
    };
    return json(200, grant);
  }

  async function usage(req: Request): Promise<Response> {
    const checked = guard(req);
    if (checked instanceof Response) return checked;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, 'bad_request', 'Expected JSON');
    }
    const { reservationId, seconds } = (body ?? {}) as Record<string, unknown>;
    if (!isReservationId(reservationId) || typeof seconds !== 'number' || !(seconds >= 0)) {
      return fail(400, 'bad_request', 'Expected { reservationId, seconds }');
    }
    await deps.budget.settle(reservationId, seconds);
    deps.log('usage reported', { reservationId, seconds });
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }

  async function health(req: Request): Promise<Response> {
    if (req.method !== 'GET') return fail(405, 'method_not_allowed', 'Use GET');
    const info: ServiceInfo = {
      ok: true,
      model: MODEL,
      keyConfigured: Boolean(config.decartApiKey),
      accessCode: config.accessCode || config.requireAccessCode ? 'required' : 'none',
      maxSessionSeconds: config.maxSessionSeconds,
      dailyMinutes: config.dailyBudgetSeconds / 60,
      budgetStore: deps.budget.kind,
      pricePerSecondUsd: { ...PRICE_PER_SECOND_USD },
    };
    return json(200, info);
  }

  return { token, usage, health };
}
