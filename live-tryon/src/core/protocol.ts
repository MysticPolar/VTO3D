/**
 * The wire format between the page and its back end. The VTO3D app would add the same three calls
 * to its `src/api` contract (see PROPOSALS.md), so keep this file free of runtime dependencies.
 */

export const ACCESS_CODE_HEADER = 'x-access-code';

export type ServiceErrorCode =
  | 'method_not_allowed'
  | 'bad_request'
  | 'not_configured'
  | 'access_code_required'
  | 'access_code_invalid'
  | 'origin_not_allowed'
  | 'rate_limited'
  | 'busy'
  | 'budget_exhausted'
  | 'upstream_error';

export interface ErrorBody {
  error: { code: ServiceErrorCode; message: string };
}

/** POST /api/token: one short-lived Decart client token for one dial */
export interface TokenGrant {
  /** Decart's name for the client token. Expires `expiresAt`; never the permanent key */
  apiKey: string;
  expiresAt: string;
  model: string;
  /** Decart ends the session after this long, and the page stops it itself at the same time */
  maxSessionSeconds: number;
  /** Report the seconds actually generated under this id, so unused budget goes back */
  reservationId: string;
}

/** POST /api/usage, sent when a session ends */
export interface UsageReport {
  reservationId: string;
  seconds: number;
}

/** GET /api/health: what the page needs to know before it starts; no secrets */
export interface ServiceInfo {
  ok: true;
  model: string;
  keyConfigured: boolean;
  accessCode: 'required' | 'none';
  maxSessionSeconds: number;
  dailyMinutes: number;
  budgetStore: 'memory' | 'upstash';
  pricePerSecondUsd: { standard: number; fast: number };
}
