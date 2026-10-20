import { describe, expect, it } from 'vitest';
import { canonicalOrigin, ConfigError, readConfig } from './config.js';

describe('readConfig', () => {
  it('has safe defaults', () => {
    expect(readConfig({})).toEqual({
      decartApiKey: null,
      decartApiUrl: 'https://api.decart.ai',
      accessCode: null,
      requireAccessCode: false,
      allowedOrigins: null,
      tokenTtlSeconds: 60,
      maxSessionSeconds: 120,
      maxConcurrent: 2,
      dailyBudgetSeconds: 1200,
      tokensPerMinute: 6,
      upstash: null,
    });
  });

  it('reads every setting', () => {
    const config = readConfig({
      DECART_API_KEY: ' dct_x ',
      DECART_API_URL: 'http://127.0.0.1:9999/',
      LIVE_TRYON_ACCESS_CODE: 'code',
      VERCEL: '1',
      LIVE_TRYON_ALLOWED_ORIGINS: 'https://A.example.com:443, http://localhost:3000',
      LIVE_TRYON_TOKEN_TTL_SECONDS: '30',
      LIVE_TRYON_MAX_SESSION_SECONDS: '300',
      LIVE_TRYON_MAX_CONCURRENT: '1',
      LIVE_TRYON_DAILY_MINUTES: '0',
      LIVE_TRYON_TOKENS_PER_MINUTE: '20',
      KV_REST_API_URL: 'https://eu1-x.upstash.io/',
      KV_REST_API_TOKEN: 't0k',
    });
    expect(config).toEqual({
      decartApiKey: 'dct_x',
      decartApiUrl: 'http://127.0.0.1:9999',
      accessCode: 'code',
      requireAccessCode: true,
      allowedOrigins: ['https://a.example.com', 'http://localhost:3000'],
      tokenTtlSeconds: 30,
      maxSessionSeconds: 300,
      maxConcurrent: 1,
      dailyBudgetSeconds: 0,
      tokensPerMinute: 20,
      upstash: { url: 'https://eu1-x.upstash.io', token: 't0k' },
    });
  });

  it('accepts Upstash’s own variable names too', () => {
    const config = readConfig({
      UPSTASH_REDIS_REST_URL: 'https://u.io',
      UPSTASH_REDIS_REST_TOKEN: 't',
    });
    expect(config.upstash).toEqual({ url: 'https://u.io', token: 't' });
  });

  it('rejects values Decart or the cap could not work with', () => {
    expect(() => readConfig({ LIVE_TRYON_MAX_SESSION_SECONDS: '5' })).toThrow(ConfigError);
    expect(() => readConfig({ LIVE_TRYON_MAX_SESSION_SECONDS: '2.5' })).toThrow(ConfigError);
    expect(() => readConfig({ LIVE_TRYON_DAILY_MINUTES: 'lots' })).toThrow(ConfigError);
    expect(() => readConfig({ LIVE_TRYON_ALLOWED_ORIGINS: 'example.com' })).toThrow(ConfigError);
  });
});

describe('canonicalOrigin', () => {
  it('produces the byte-exact form Decart compares with the Origin header', () => {
    expect(canonicalOrigin('https://App.Example.com/')).toBe('https://app.example.com');
    expect(canonicalOrigin('https://app.example.com:443')).toBe('https://app.example.com');
    expect(canonicalOrigin('http://localhost:3000/path?q')).toBe('http://localhost:3000');
    expect(canonicalOrigin('https://user@example.com')).toBeNull();
    expect(canonicalOrigin('ftp://example.com')).toBeNull();
    expect(canonicalOrigin('null')).toBeNull();
  });
});
