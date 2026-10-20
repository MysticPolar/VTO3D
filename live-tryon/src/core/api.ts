/** The page's calls to its own back end (server/handlers.ts), as a `LiveTryOnApi` */
import {
  ACCESS_CODE_HEADER,
  type ErrorBody,
  type ServiceErrorCode,
  type ServiceInfo,
  type TokenGrant,
} from './protocol.js';
import type { LiveTryOnApi } from './types.js';

export type ClientErrorCode = ServiceErrorCode | 'network';

/** A refusal or failure from the back end, with the code the copy is chosen by */
export class ServiceError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number;
  constructor(code: ClientErrorCode, status: number, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
  }
}

const isAccessProblem = (code: ClientErrorCode) =>
  code === 'access_code_required' || code === 'access_code_invalid';
export { isAccessProblem };

export interface HttpApiOptions {
  /** Prefix for /api/…; '' when the page and back end share an origin */
  base?: string;
  /** The tester's access code, when the deployment needs one */
  accessCode: () => string | null;
  fetch?: typeof fetch;
}

export function httpApi(options: HttpApiOptions): LiveTryOnApi {
  const base = options.base ?? '';
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));

  const headers = (json: boolean): HeadersInit => {
    const code = options.accessCode();
    return {
      ...(json ? { 'content-type': 'application/json' } : {}),
      ...(code ? { [ACCESS_CODE_HEADER]: code } : {}),
    };
  };

  async function request(path: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, init);
    } catch (error) {
      throw new ServiceError('network', 0, error instanceof Error ? error.message : String(error));
    }
    if (res.ok) return res;
    let code: ClientErrorCode = 'upstream_error';
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as Partial<ErrorBody>;
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // not JSON (a proxy's error page): keep the generic code
    }
    throw new ServiceError(code, res.status, message);
  }

  return {
    async health() {
      return (await (await request('/api/health', { method: 'GET' })).json()) as ServiceInfo;
    },

    async token() {
      const res = await request('/api/token', { method: 'POST', headers: headers(false) });
      const grant = (await res.json()) as Partial<TokenGrant>;
      if (
        typeof grant.apiKey !== 'string' ||
        !grant.apiKey ||
        typeof grant.reservationId !== 'string'
      ) {
        throw new ServiceError('upstream_error', res.status, 'The token response is incomplete');
      }
      return grant as TokenGrant;
    },

    reportUsage(reservationId, seconds) {
      // keepalive lets the report finish while the page is being hidden or unloaded
      void doFetch(`${base}/api/usage`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ reservationId, seconds: Math.round(seconds * 10) / 10 }),
        keepalive: true,
      }).catch(() => {
        // a lost report only means the reservation keeps its full session time
      });
    },
  };
}
