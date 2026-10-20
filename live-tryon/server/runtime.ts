/**
 * The handlers wired to the real world: process.env, global fetch, the clock. One set per process,
 * so a warm serverless instance (or the dev server) keeps its rate and budget counts between requests.
 */
import { randomBytes } from 'node:crypto';
import { type BudgetStore, memoryBudget, upstashBudget } from './budget.js';
import { readConfig } from './config.js';
import { createHandlers, type Handlers } from './handlers.js';
import { rateLimiter } from './rate-limit.js';

let cached: { env: Record<string, string | undefined>; handlers: Handlers } | null = null;

export function handlersFor(env: Record<string, string | undefined> = process.env): Handlers {
  if (cached?.env === env) return cached.handlers;
  const config = readConfig(env);
  const budget: BudgetStore = config.upstash
    ? upstashBudget(config.upstash.url, config.upstash.token, fetch)
    : memoryBudget();
  const handlers = createHandlers({
    config,
    fetch,
    now: Date.now,
    budget,
    limiter: rateLimiter(config.tokensPerMinute, Date.now),
    randomId: () => randomBytes(12).toString('base64url'),
    log: (message, data) => console.log(`[live-tryon] ${message}`, data ?? ''),
  });
  cached = { env, handlers };
  return handlers;
}
