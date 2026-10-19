/** One visual baseline per row of HANDOFF §8: the prototype screen it shows, the prototype's
 * `?app=` query, and the web route that must match it with `?frame=iphone`. */
export interface Baseline {
  /** file name in e2e/visual/__baseline__/ (and inset/), without .png */
  file: string;
  /** prototype screen id, as in `data-screen` */
  screen: string;
  /** query for reference/prototype/index.html */
  prototype: string;
  /** canonical web route with the same parameters */
  route: string;
  /** false for the two screens with full-bleed photos, which the inset check skips (§10.2) */
  inset: boolean;
}

const row = (file: string, screen: string, prototype: string, route: string, inset = true) => ({
  file,
  screen,
  prototype,
  route,
  inset,
});

export const BASELINES: Baseline[] = [
  row('fitting', 'fitting', 'app=fitting', '/home', false),
  row('plaza', 'plaza', 'app=plaza', '/plaza'),
  row('wardrobe', 'wardrobe', 'app=wardrobe', '/wardrobe'),
  row('stylist', 'stylist', 'app=stylist', '/stylist'),
  row('profile', 'profile', 'app=profile', '/me'),
  row('onboarding', 'onboarding', 'app=onboarding', '/welcome', false),
  row('avatar', 'avatar', 'app=avatar', '/welcome/avatar'),
  row('avatar-profile', 'avatar', 'app=avatar&from=profile', '/me/avatar/upload'),
  row('product', 'product', 'app=product&pid=striped-shirt', '/plaza/p/striped-shirt'),
  row('checkout', 'checkout', 'app=checkout', '/plaza/p/striped-shirt/checkout'),
  row('orderlist', 'orderlist', 'app=orderlist&filter=all', '/me/orders'),
  row('orders', 'orders', 'app=orders&oid=VT20260715092418', '/me/orders/o/VT20260715092418'),
  row(
    'tracking',
    'tracking',
    'app=tracking&oid=VT20260715092418',
    '/me/orders/o/VT20260715092418/tracking',
  ),
  row(
    'returns',
    'returns',
    'app=returns&oid=VT20260710151207',
    '/me/orders/o/VT20260710151207/returns',
  ),
  row(
    'returns-progress',
    'returns',
    'app=returns&oid=VT20260702110846',
    '/me/orders/o/VT20260702110846/returns',
  ),
  row('avatarhub', 'avatarhub', 'app=avatarhub', '/me/avatar'),
  row('editprofile', 'editprofile', 'app=editprofile', '/me/profile'),
  row('addresses', 'addresses', 'app=addresses', '/me/addresses'),
  row('payments', 'payments', 'app=payments', '/me/payments'),
  row('notifications', 'notifications', 'app=notifications', '/me/notifications'),
  row('settings', 'settings', 'app=settings', '/me/settings'),
  row('privacy', 'privacy', 'app=privacy', '/me/settings/privacy'),
  row('help', 'help', 'app=help', '/me/help'),
  row('favorites', 'favorites', 'app=favorites', '/me/favorites'),
  row('history', 'history', 'app=history', '/me/history'),
];

/**
 * Prototype screen ids the web app has built. A screen's visual checks and acceptance checks run
 * once it is listed here; until then `pnpm verify` skips them and each phase report lists them as
 * skipped. Add a screen in the phase that builds it (HANDOFF §11).
 */
export const BUILT = new Set<string>([]);

/** Use in a test: `test.skip(...notBuilt('plaza'))` */
export const notBuilt = (screen: string): [boolean, string] => [
  !BUILT.has(screen),
  `${screen} is not built yet`,
];
