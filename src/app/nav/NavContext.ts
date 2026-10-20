import { createContext, useContext } from 'react';
import type { ScreenId, TabArea } from './grammar';

/** The navigation operations of HANDOFF §4.3 */
export interface Nav {
  /** open a secondary screen on top of the current stack, e.g. push('p/striped-shirt') */
  push(segment: string): void;
  /** the back button: drop the top entry */
  back(): void;
  /** the tab bar: that tab's remembered stack, instantly */
  switchTab(tab: TabArea): void;
  /** a contextual link (加入衣橱 → 个人衣橱): that tab's root, fading */
  jumpToTab(tab: TabArea): void;
  /** jump into another tab's canonical chain, e.g. a notice that opens 订单详情 */
  openPath(path: string): void;
  /** remove a finished flow (checkout after payment) from every stack */
  drop(screen: ScreenId): void;
  /** enter the app from the launch flow, or start it again: every stack starts over */
  resetTo(path: string): void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav outside NavRoot');
  return nav;
}
