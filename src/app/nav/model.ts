import {
  buildPath,
  cutAt,
  parsePath,
  rootPath,
  type Area,
  type ScreenId,
  type Stack,
  type TabArea,
} from './grammar';
import type { Transition } from './transition';

/** The remembered path of each area: its stack, kept while another tab is on screen */
export type Paths = Partial<Record<Area, string>>;

/** drop(screen): every remembered stack without `screen` and everything above it */
export function dropScreen(paths: Paths, screen: ScreenId): Paths {
  const out: Paths = {};
  for (const [area, path] of Object.entries(paths) as [Area, string][]) {
    const parsed = parsePath(path);
    out[area] = parsed ? buildPath(cutAt(parsed.stack, screen)) : path;
  }
  return out;
}

/** Where switchTab(tab) goes: that tab's remembered path, else its root */
export function switchTarget(paths: Paths, tab: TabArea): string {
  return paths[tab] ?? rootPath(tab);
}

/** jumpToTab fades, except from deeper in the same tab, where it pops back to the root */
export function jumpHint(from: Stack, tab: TabArea): Transition | undefined {
  return from.area === tab ? undefined : 'fade';
}

/** resetTo fades into the app and switches instantly into the launch flow */
export function resetHint(path: string): Transition {
  return path.startsWith('/welcome') ? 'none' : 'fade';
}
