import { beforeEach, describe, expect, it } from 'vitest';
import { historyMirror, readState } from './history';

describe('historyMirror', () => {
  beforeEach(() => historyMirror.reset());

  it('records entries by index in sessionStorage', () => {
    historyMirror.record(3, { path: '/me/orders' });
    expect(historyMirror.get(3)).toEqual({ path: '/me/orders' });
    expect(JSON.parse(sessionStorage.getItem('vto-web-history-v1') ?? '{}')).toEqual({
      3: { path: '/me/orders' },
    });
  });

  it('gives a fresh entry an index past the recorded ones, with a gap', () => {
    expect(historyMirror.freshIdx()).toBe(0);
    historyMirror.record(0, { path: '/home' });
    historyMirror.record(4, { path: '/me' });
    expect(historyMirror.freshIdx()).toBe(6);
  });

  it('marks the entries whose stack holds a dropped screen above the root', () => {
    historyMirror.record(1, { path: '/plaza/p/a/checkout' });
    historyMirror.record(2, { path: '/plaza/p/a/checkout', overlay: 'o1' });
    historyMirror.record(3, { path: '/plaza/p/a' });
    historyMirror.markDropped('checkout');
    expect(historyMirror.get(1)?.dropped).toBe('checkout');
    expect(historyMirror.get(2)?.dropped).toBe('checkout');
    expect(historyMirror.get(3)?.dropped).toBeUndefined();
  });
});

describe('readState', () => {
  it('accepts only the app’s own history state', () => {
    expect(readState({ idx: 2, path: '/me' })).toEqual({ idx: 2, path: '/me' });
    expect(readState(null)).toBeNull();
    expect(readState({ path: '/me' })).toBeNull();
  });
});
