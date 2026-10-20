/**
 * The two Decart REST calls the server makes, with the permanent key in the `x-api-key` header:
 * - POST /v1/client/tokens  mints a short-lived client token for one browser dial
 * - GET  /v1/realtime/quota reads the account's live concurrent-session counter
 * (docs: API reference → Create Client Token, Get Realtime Quota). Plain fetch: the SDK is only
 * needed in the browser, and these two calls are small enough to own.
 */

export interface ClientToken {
  /** The client token itself (a signed JWT). Decart calls it `apiKey`; it is not the permanent key */
  apiKey: string;
  expiresAt: string;
}

export interface RealtimeQuota {
  limit: number | null;
  active: number | null;
  remaining: number | null;
}

export class DecartError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'DecartError';
    this.status = status;
  }
}

export interface DecartCall {
  apiUrl: string;
  apiKey: string;
  fetch: typeof fetch;
}

export interface TokenRequest {
  model: string;
  origin: string;
  ttlSeconds: number;
  maxSessionSeconds: number;
}

const TIMEOUT_MS = 10_000;

/** The most useful text in an error body, with the key scrubbed in case anything ever echoes it */
function describe(status: number, body: string, apiKey: string): string {
  let message = body.slice(0, 300) || 'no response body';
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; error?: unknown; message?: unknown };
    const detail = parsed.detail ?? parsed.error ?? parsed.message;
    if (typeof detail === 'string') message = detail;
    else if (Array.isArray(detail)) {
      message = (detail as { loc?: unknown[]; msg?: string }[])
        .map((d) => `${(d.loc ?? []).join('.')} ${d.msg ?? ''}`.trim())
        .join('; ');
    }
  } catch {
    // not JSON: keep the raw text
  }
  return `Decart ${status}: ${message.split(apiKey).join('[key]')}`;
}

async function call(c: DecartCall, path: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await c.fetch(`${c.apiUrl}${path}`, {
      ...init,
      headers: { ...init.headers, 'x-api-key': c.apiKey, 'user-agent': 'vto3d-live-tryon' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new DecartError(0, `Decart unreachable: ${reason}`);
  }
  const body = await res.text();
  if (!res.ok) throw new DecartError(res.status, describe(res.status, body, c.apiKey));
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new DecartError(res.status, 'Decart returned a response that is not JSON');
  }
}

/**
 * One token per dial, scoped as tightly as Decart allows: this model only, this page's origin only
 * (browser-enforced), a short lifetime to start the session, and a cap on how long that session runs
 */
export async function createClientToken(c: DecartCall, req: TokenRequest): Promise<ClientToken> {
  const data = (await call(c, '/v1/client/tokens', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      expiresIn: req.ttlSeconds,
      allowedModels: [req.model],
      allowedOrigins: [req.origin],
      constraints: { realtime: { maxSessionDuration: req.maxSessionSeconds } },
      metadata: { app: 'vto3d-live-tryon' },
    }),
  })) as Partial<ClientToken> | null;
  if (typeof data?.apiKey !== 'string' || !data.apiKey || typeof data.expiresAt !== 'string') {
    throw new DecartError(200, 'Decart returned no client token');
  }
  if (data.apiKey === c.apiKey) throw new DecartError(200, 'Decart echoed the permanent key');
  return { apiKey: data.apiKey, expiresAt: data.expiresAt };
}

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export async function getRealtimeQuota(c: DecartCall): Promise<RealtimeQuota> {
  const data = (await call(c, '/v1/realtime/quota', { method: 'GET' })) as Record<
    string,
    unknown
  > | null;
  return {
    limit: count(data?.limit),
    active: count(data?.active),
    remaining: count(data?.remaining),
  };
}
