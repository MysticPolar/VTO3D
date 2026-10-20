import { describe, expect, it } from 'vitest';
import { buildPath, cutAt, extend, parentOf, parsePath, type Stack } from './grammar';
import { dropScreen, jumpHint, resetHint, switchTarget } from './model';
import { deriveTransition } from './transition';

const stack = (path: string): Stack => {
  const parsed = parsePath(path);
  if (!parsed) throw new Error(`no stack for ${path}`);
  return parsed.stack;
};
const screens = (path: string) => parsePath(path)?.stack.entries.map((e) => e.screen);

describe('parseStack: every row of the grammar (HANDOFF §4.3)', () => {
  it.each([
    // tab roots and the launch flow
    ['/home', ['fitting']],
    ['/plaza', ['plaza']],
    ['/wardrobe', ['wardrobe']],
    ['/stylist', ['stylist']],
    ['/me', ['profile']],
    ['/welcome', ['onboarding']],
    ['/welcome/avatar', ['onboarding', 'avatar']],
    // p/:pid after any entry of a tab
    ['/home/p/a', ['fitting', 'product']],
    ['/plaza/p/a', ['plaza', 'product']],
    ['/wardrobe/p/a', ['wardrobe', 'product']],
    ['/stylist/p/a', ['stylist', 'product']],
    ['/me/favorites/p/a', ['profile', 'favorites', 'product']],
    ['/me/history/p/a', ['profile', 'history', 'product']],
    ['/me/orders/p/a', ['profile', 'orderlist', 'product']],
    ['/me/orders/o/VT1/p/a', ['profile', 'orderlist', 'orders', 'product']],
    ['/plaza/p/a/checkout/p/b', ['plaza', 'product', 'checkout', 'product']],
    ['/plaza/p/a/p/b', ['plaza', 'product', 'product']],
    // checkout after p/:pid, or straight after /plaza (购物袋)
    ['/plaza/p/a/checkout', ['plaza', 'product', 'checkout']],
    ['/home/p/a/checkout', ['fitting', 'product', 'checkout']],
    ['/plaza/checkout', ['plaza', 'checkout']],
    // addresses after /me, settings, checkout
    ['/me/addresses', ['profile', 'addresses']],
    ['/me/settings/addresses', ['profile', 'settings', 'addresses']],
    ['/plaza/p/a/checkout/addresses', ['plaza', 'product', 'checkout', 'addresses']],
    // orders
    ['/me/orders', ['profile', 'orderlist']],
    ['/me/orders/o/VT1', ['profile', 'orderlist', 'orders']],
    ['/me/orders/o/VT1/tracking', ['profile', 'orderlist', 'orders', 'tracking']],
    ['/me/orders/o/VT1/returns', ['profile', 'orderlist', 'orders', 'returns']],
    ['/me/orders/tracking/VT1', ['profile', 'orderlist', 'tracking']],
    ['/me/orders/returns/VT1', ['profile', 'orderlist', 'returns']],
    // help after /me and 订单详情
    ['/me/help', ['profile', 'help']],
    ['/me/orders/o/VT1/help', ['profile', 'orderlist', 'orders', 'help']],
    // 我的形象 and its upload screen
    ['/me/avatar', ['profile', 'avatarhub']],
    ['/me/avatar/upload', ['profile', 'avatarhub', 'avatar']],
    // after /me, some also after settings
    ['/me/profile', ['profile', 'editprofile']],
    ['/me/settings/profile', ['profile', 'settings', 'editprofile']],
    ['/me/notifications', ['profile', 'notifications']],
    ['/me/settings/notifications', ['profile', 'settings', 'notifications']],
    ['/me/payments', ['profile', 'payments']],
    ['/me/settings', ['profile', 'settings']],
    ['/me/favorites', ['profile', 'favorites']],
    ['/me/history', ['profile', 'history']],
    ['/me/settings/privacy', ['profile', 'settings', 'privacy']],
  ])('%s', (path, expected) => {
    expect(screens(path)).toEqual(expected);
    expect(parsePath(path)?.exact).toBe(true);
  });

  it('captures ids, and 物流跟踪 / 申请退换货 / 帮助 take the order of the entry they follow', () => {
    expect(stack('/plaza/p/striped-shirt').entries[1]?.pid).toBe('striped-shirt');
    expect(stack('/me/orders/o/VT1/tracking').entries.map((e) => e.oid)).toEqual([
      undefined,
      undefined,
      'VT1',
      'VT1',
    ]);
    expect(stack('/me/orders/returns/VT2').entries[2]?.oid).toBe('VT2');
    expect(stack('/me/orders/o/VT1/help').entries[3]?.oid).toBe('VT1');
  });

  it('keeps ?status= on the 我的订单 entry, also under screens pushed on top', () => {
    expect(stack('/me/orders?status=toreceive').entries[1]?.status).toBe('toreceive');
    expect(stack('/me/orders/o/VT1?status=unpaid').entries[1]?.status).toBe('unpaid');
  });
});

describe('round trips', () => {
  it.each([
    '/home',
    '/welcome/avatar',
    '/plaza/p/striped-shirt/checkout/addresses',
    '/plaza/checkout',
    '/me/orders/o/VT20260715092418/tracking',
    '/me/orders/returns/VT20260702110846',
    '/me/orders?status=aftersale',
    '/me/orders/o/VT1/p/a?status=toreceive',
    '/me/avatar/upload',
    '/me/settings/privacy',
    '/plaza/p/a%20b',
  ])('%s', (path) => {
    expect(buildPath(stack(path))).toBe(path);
  });

  it('decodes ids and encodes them again', () => {
    expect(stack('/plaza/p/a%20b').entries[1]?.pid).toBe('a b');
  });
});

describe('invalid paths: the longest valid prefix, or null for an unknown path', () => {
  it.each([
    ['/me/privacy', '/me'],
    ['/plaza/orders', '/plaza'],
    ['/me/orders/o', '/me/orders'],
    ['/me/orders/tracking', '/me/orders'],
    ['/home/checkout', '/home'],
    ['/welcome/p/a', '/welcome'],
    ['/me/avatar/avatar', '/me/avatar'],
    ['/plaza/p/a/zzz/p/b', '/plaza/p/a'],
    ['/plaza/', '/plaza'],
    ['/plaza//p/a', '/plaza/p/a'],
    ['/plaza/p/%E0%A4%A', '/plaza'],
    ['/me/orders?status=all', '/me/orders'],
    ['/me/orders?status=bogus', '/me/orders'],
    ['/me?status=unpaid', '/me'],
  ])('%s → %s', (path, prefix) => {
    const parsed = parsePath(path);
    expect(parsed?.exact).toBe(false);
    expect(parsed && buildPath(parsed.stack)).toBe(prefix);
  });

  it('ignores query parameters other than status', () => {
    expect(parsePath('/me/orders?status=unpaid&frame=iphone')?.exact).toBe(true);
    expect(parsePath('/home?frame=iphone')?.exact).toBe(true);
  });

  it.each(['/', '', '/foo', '/Plaza', '/p/a'])('%s is unknown', (path) => {
    expect(parsePath(path)).toBeNull();
  });
});

describe('extend, parentOf and cutAt', () => {
  it('extends by exactly one entry the grammar allows', () => {
    expect(buildPath(extend(stack('/plaza'), 'p/a') ?? stack('/home'))).toBe('/plaza/p/a');
    expect(extend(stack('/plaza'), 'orders')).toBeNull();
    expect(extend(stack('/plaza/p/a'), 'checkout/addresses')).toBeNull();
    expect(buildPath(extend(stack('/me/orders?status=unpaid'), 'o/VT1') ?? stack('/home'))).toBe(
      '/me/orders/o/VT1?status=unpaid',
    );
  });

  it('parentOf drops the top entry and stops at the root', () => {
    expect(buildPath(parentOf(stack('/me/orders/o/VT1')) ?? stack('/home'))).toBe('/me/orders');
    expect(parentOf(stack('/me'))).toBeNull();
    expect(parentOf(stack('/welcome'))).toBeNull();
  });

  it('cutAt removes a screen and everything above it, never the root', () => {
    expect(buildPath(cutAt(stack('/plaza/p/a/checkout'), 'checkout'))).toBe('/plaza/p/a');
    expect(buildPath(cutAt(stack('/plaza/p/a/checkout/addresses'), 'checkout'))).toBe('/plaza/p/a');
    expect(buildPath(cutAt(stack('/plaza'), 'plaza'))).toBe('/plaza');
    expect(buildPath(cutAt(stack('/me/orders'), 'checkout'))).toBe('/me/orders');
  });
});

describe('drop and the tab operations', () => {
  it('drop removes the screen from every remembered stack', () => {
    expect(
      dropScreen(
        { plaza: '/plaza/p/a/checkout', home: '/home/p/b/checkout/addresses', me: '/me/orders' },
        'checkout',
      ),
    ).toEqual({ plaza: '/plaza/p/a', home: '/home/p/b', me: '/me/orders' });
  });

  it('switchTab returns to the remembered path, else the root', () => {
    expect(switchTarget({ plaza: '/plaza/p/a' }, 'plaza')).toBe('/plaza/p/a');
    expect(switchTarget({}, 'me')).toBe('/me');
  });

  it('jumpToTab fades in, but pops from deeper in the same tab', () => {
    expect(jumpHint(stack('/plaza/p/a'), 'wardrobe')).toBe('fade');
    expect(jumpHint(stack('/wardrobe/p/a'), 'wardrobe')).toBeUndefined();
  });

  it('resetTo fades into the app and is instant into the launch flow', () => {
    expect(resetHint('/home')).toBe('fade');
    expect(resetHint('/welcome')).toBe('none');
  });
});

describe('deriveTransition', () => {
  it('derives push, pop and none from the stacks', () => {
    expect(deriveTransition(null, stack('/home'))).toBe('none');
    expect(deriveTransition(stack('/plaza'), stack('/plaza/p/a'))).toBe('push');
    expect(deriveTransition(stack('/plaza/p/a/checkout'), stack('/plaza/p/a'))).toBe('pop');
    expect(deriveTransition(stack('/plaza/p/a'), stack('/plaza/p/b'))).toBe('none');
    expect(deriveTransition(stack('/plaza/p/a'), stack('/me'))).toBe('none');
  });

  it('lets a hint win', () => {
    expect(deriveTransition(stack('/plaza/p/a'), stack('/wardrobe'), 'fade')).toBe('fade');
    expect(deriveTransition(stack('/welcome/avatar'), stack('/welcome'), 'none')).toBe('none');
  });
});
