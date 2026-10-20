/**
 * The URL grammar (HANDOFF §4.3). A URL is the active area's stack, one segment group per entry:
 *   /me/orders/o/VT20260715092418/tracking  =  我的 → 我的订单 → 订单详情 → 物流跟踪
 * parseStack and buildPath are pure, and buildPath(parseStack(url).stack) === url for every
 * exact url.
 */

/** URL roots of the five tabs, in tab-bar order */
export const TABS = ['home', 'plaza', 'wardrobe', 'stylist', 'me'] as const;
export type TabArea = (typeof TABS)[number];
/** The launch flow (启动页 → 上传照片) sits outside the tabs */
export type Area = TabArea | 'welcome';
export const AREAS: readonly Area[] = [...TABS, 'welcome'];

/** Prototype screen ids, as in `data-screen` (HANDOFF §8) */
export type ScreenId =
  | 'fitting'
  | 'plaza'
  | 'wardrobe'
  | 'stylist'
  | 'profile'
  | 'onboarding'
  | 'avatar'
  | 'product'
  | 'checkout'
  | 'orderlist'
  | 'orders'
  | 'tracking'
  | 'returns'
  | 'avatarhub'
  | 'editprofile'
  | 'addresses'
  | 'payments'
  | 'notifications'
  | 'settings'
  | 'privacy'
  | 'help'
  | 'favorites'
  | 'history';

/** Each area's root screen */
export const ROOT_SCREEN: Record<Area, ScreenId> = {
  home: 'fitting',
  plaza: 'plaza',
  wardrobe: 'wardrobe',
  stylist: 'stylist',
  me: 'profile',
  welcome: 'onboarding',
};

/** 我的订单 filters in `?status=`; no parameter means 全部 */
export const ORDER_STATUSES = ['unpaid', 'toship', 'shipping', 'toreceive', 'aftersale'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Entry {
  screen: ScreenId;
  /** this entry's own path segments, decoded, e.g. ['p', 'striped-shirt'] */
  segments: string[];
  pid?: string;
  /** the order: its own `:oid`, or taken from the 订单详情 entry it follows */
  oid?: string;
  /** 我的订单 only: the `?status=` filter */
  status?: OrderStatus;
}

export interface Stack {
  area: Area;
  /** the root first; never empty */
  entries: Entry[];
}

export interface Parsed {
  /** the longest valid prefix of the URL */
  stack: Stack;
  /** the URL is exactly buildPath(stack): no invalid tail, no stray slash, a valid ?status= */
  exact: boolean;
}

interface Rule {
  screen: ScreenId;
  /** literal segments; ':pid' and ':oid' capture an id */
  pattern: string[];
  /** the screens this entry may follow; 'any' is any entry of a tab's stack */
  after: ScreenId[] | 'any';
}

/** The grammar table of HANDOFF §4.3, in matching order */
const RULES: Rule[] = [
  { screen: 'product', pattern: ['p', ':pid'], after: 'any' },
  { screen: 'checkout', pattern: ['checkout'], after: ['product', 'plaza'] },
  { screen: 'addresses', pattern: ['addresses'], after: ['profile', 'settings', 'checkout'] },
  { screen: 'orderlist', pattern: ['orders'], after: ['profile'] },
  { screen: 'orders', pattern: ['o', ':oid'], after: ['orderlist'] },
  { screen: 'tracking', pattern: ['tracking'], after: ['orders'] },
  { screen: 'returns', pattern: ['returns'], after: ['orders'] },
  { screen: 'tracking', pattern: ['tracking', ':oid'], after: ['orderlist'] },
  { screen: 'returns', pattern: ['returns', ':oid'], after: ['orderlist'] },
  { screen: 'help', pattern: ['help'], after: ['profile', 'orders'] },
  { screen: 'avatarhub', pattern: ['avatar'], after: ['profile'] },
  { screen: 'avatar', pattern: ['upload'], after: ['avatarhub'] },
  { screen: 'avatar', pattern: ['avatar'], after: ['onboarding'] },
  { screen: 'editprofile', pattern: ['profile'], after: ['profile', 'settings'] },
  { screen: 'notifications', pattern: ['notifications'], after: ['profile', 'settings'] },
  { screen: 'payments', pattern: ['payments'], after: ['profile'] },
  { screen: 'settings', pattern: ['settings'], after: ['profile'] },
  { screen: 'favorites', pattern: ['favorites'], after: ['profile'] },
  { screen: 'history', pattern: ['history'], after: ['profile'] },
  { screen: 'privacy', pattern: ['privacy'], after: ['settings'] },
];

/** Screens that take their order from the 订单详情 entry they follow */
const INHERITS_ORDER: ScreenId[] = ['tracking', 'returns', 'help'];

const isArea = (s: string | undefined): s is Area => AREAS.includes(s as Area);
const isStatus = (s: string | null): s is OrderStatus => ORDER_STATUSES.includes(s as OrderStatus);

export const isTab = (area: Area): area is TabArea => area !== 'welcome';
export const rootPath = (area: Area): string => `/${area}`;

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** The entry that `segs[i…]` starts after `prev`, and how many segments it takes */
function matchAt(
  segs: string[],
  i: number,
  prev: Entry,
  area: Area,
): { entry: Entry; length: number } | null {
  for (const rule of RULES) {
    const allowed = rule.after === 'any' ? isTab(area) : rule.after.includes(prev.screen);
    if (!allowed || i + rule.pattern.length > segs.length) continue;
    const entry: Entry = { screen: rule.screen, segments: segs.slice(i, i + rule.pattern.length) };
    const fits = rule.pattern.every((part, k) => {
      const seg = entry.segments[k] ?? '';
      if (part === ':pid') entry.pid = seg;
      else if (part === ':oid') entry.oid = seg;
      else return part === seg;
      return seg !== '';
    });
    if (!fits) continue;
    if (!entry.oid && prev.oid && INHERITS_ORDER.includes(entry.screen)) entry.oid = prev.oid;
    return { entry, length: rule.pattern.length };
  }
  return null;
}

/** The pathname of a stack's entries, encoded */
export function pathOf(entries: Entry[]): string {
  return '/' + entries.flatMap((e) => e.segments.map(encodeURIComponent)).join('/');
}

/** The URL of a stack: its path, plus `?status=` when 我的订单 has a filter */
export function buildPath(stack: Stack): string {
  const status = stack.entries.find((e) => e.screen === 'orderlist')?.status;
  return status ? `${pathOf(stack.entries)}?status=${status}` : pathOf(stack.entries);
}

/** The stack of a URL. Null when it doesn't start with an area (unknown path: go to `/`). */
export function parseStack(pathname: string, search = ''): Parsed | null {
  const segs: string[] = [];
  let readable = true;
  for (const raw of pathname.split('/')) {
    if (raw === '') continue;
    const seg = decode(raw);
    if (seg === null) {
      readable = false;
      break;
    }
    segs.push(seg);
  }
  const area = segs[0];
  if (!isArea(area)) return null;

  const entries: Entry[] = [{ screen: ROOT_SCREEN[area], segments: [area] }];
  let i = 1;
  while (i < segs.length) {
    const prev = entries[entries.length - 1];
    const next = prev && matchAt(segs, i, prev, area);
    if (!next) break;
    entries.push(next.entry);
    i += next.length;
  }

  const status = new URLSearchParams(search).get('status');
  const orderlist = entries.find((e) => e.screen === 'orderlist');
  if (orderlist && isStatus(status)) orderlist.status = status;
  const statusExact = status === null || (orderlist !== undefined && isStatus(status));

  const stack = { area, entries };
  const exact = readable && i === segs.length && statusExact && pathOf(entries) === pathname;
  return { stack, exact };
}

/** parseStack for a URL that may carry a query */
export function parsePath(path: string): Parsed | null {
  const q = path.indexOf('?');
  return q === -1 ? parseStack(path) : parseStack(path.slice(0, q), path.slice(q));
}

/** The top entry of a stack */
export function topEntry(stack: Stack): Entry {
  const top = stack.entries[stack.entries.length - 1];
  if (!top) throw new Error('empty stack');
  return top;
}

/** The stack with one more entry, if `segment` (e.g. 'p/striped-shirt') may follow its top */
export function extend(stack: Stack, segment: string): Stack | null {
  const segs = segment.split('/').filter(Boolean);
  const next = matchAt(segs, 0, topEntry(stack), stack.area);
  if (!next || next.length !== segs.length) return null;
  return { area: stack.area, entries: [...stack.entries, next.entry] };
}

/** The stack without its top entry, or null at a root */
export function parentOf(stack: Stack): Stack | null {
  return stack.entries.length > 1
    ? { area: stack.area, entries: stack.entries.slice(0, -1) }
    : null;
}

/** The stack without `screen` and everything above it (the root is never removed) */
export function cutAt(stack: Stack, screen: ScreenId): Stack {
  const i = stack.entries.findIndex((e, n) => n > 0 && e.screen === screen);
  return i > 0 ? { area: stack.area, entries: stack.entries.slice(0, i) } : stack;
}
