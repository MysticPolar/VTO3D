import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, type Location } from 'react-router';
import { OverlayContext } from '@/components/Overlay/OverlayContext';
import { OverlayHost } from '@/components/Overlay/OverlayHost';
import { ToastHost } from '@/components/Toast/ToastHost';
import { useNavStore } from '@/store/nav';
import { useSession } from '@/store/session';
import {
  buildPath,
  cutAt,
  extend,
  parentOf,
  parsePath,
  parseStack,
  rootPath,
  type Parsed,
  type Stack,
} from './grammar';
import { historyMirror, readState, type HistoryState } from './history';
import { dropScreen, jumpHint, resetHint, switchTarget } from './model';
import { NavContext, type Nav } from './NavContext';
import { useOverlays, type Live } from './overlays';
import { TabHost, type ScreenRegistry } from './TabHost';
import type { Transition } from './transition';

/** Where a URL must go instead (HANDOFF §4.3), or null when it can be shown */
function redirectFor(pathname: string, parsed: Parsed | null, setupDone: boolean): string | null {
  if (pathname === '/' || pathname === '') return setupDone ? '/home' : '/welcome';
  if (!parsed) return '/';
  if (parsed.stack.area === 'welcome' && setupDone) return '/home';
  return parsed.exact ? null : buildPath(parsed.stack);
}

interface NavLive extends Live {
  stack: Stack | null;
  /** drop() removed the screen on screen: the next navigation replaces its entry */
  replaceNext: boolean;
}

/**
 * The app hears of an entry when React commits its render, a moment after the history moved
 * (React Router renders navigations as transitions). The app's own navigations move `live` at
 * once, so a tap in between already works on the entry it is going to.
 */
function moveLive(l: NavLive, idx: number, path: string) {
  l.idx = idx;
  l.path = path;
  l.stack = parsePath(path)?.stack ?? l.stack;
}

/**
 * The layout route under every area's splat route: the URL is the active stack, React Router
 * owns the history, and this keeps the app's bookkeeping in step with it (HANDOFF §4.3).
 */
export function NavRoot({ screens }: { screens: ScreenRegistry }) {
  const location = useLocation();
  const navigate = useNavigate();
  const action = useNavigationType();
  const setupDone = useSession((s) => s.setupDone);
  const setLastPath = useNavStore((s) => s.setLastPath);

  const fullPath = location.pathname + location.search;
  const parsed = useMemo(
    () => parseStack(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const redirect = redirectFor(location.pathname, parsed, setupDone);
  const state = readState(location.state);

  // while a redirect is on its way, keep showing the last valid stack
  const valid = redirect === null && parsed ? parsed.stack : null;
  const [shown, setShown] = useState<Stack | null>(valid);
  if (valid && valid !== shown) setShown(valid);
  const stack = valid ?? shown;

  const live = useRef<NavLive>({ idx: 0, path: '', stack: null, replaceNext: false });
  const { items, toast, ctl } = useOverlays(navigate, live);

  // every location change: redirect, give a fresh entry the app's state, leave out a dropped
  // screen, settle the overlays, then record the entry. Guarded by the location object, which
  // React Router creates anew for every navigation: an entry keeps its key, and coming back to
  // it (say, an overlay's entry popped before its render) is a change to handle; StrictMode's
  // second run of the effect sees the same object and stops here.
  const handled = useRef<Location | null>(null);
  useLayoutEffect(() => {
    if (handled.current === location) return;
    const first = handled.current === null;
    handled.current = location;

    if (redirect !== null || !state) {
      const to = redirect ?? fullPath;
      const idx = state?.idx ?? historyMirror.freshIdx();
      moveLive(live.current, idx, to);
      void navigate(to, { replace: true, state: { idx, path: to } satisfies HistoryState });
      return;
    }
    const dropped = action === 'POP' ? historyMirror.get(state.idx)?.dropped : undefined;
    if (dropped && parsed?.stack.entries.some((e, n) => n > 0 && e.screen === dropped)) {
      const to = buildPath(cutAt(parsed.stack, dropped));
      moveLive(live.current, state.idx, to);
      void navigate(to, {
        replace: true,
        state: { idx: state.idx, path: to } satisfies HistoryState,
      });
      return;
    }
    if (ctl.sync(state, action, fullPath, first)) return;

    live.current = {
      ...live.current,
      idx: state.idx,
      path: fullPath,
      stack: parsed?.stack ?? null,
    };
    historyMirror.record(state.idx, { path: fullPath, overlay: state.overlay });
    if (parsed) setLastPath(parsed.stack.area, fullPath);
  }, [location, redirect, state, fullPath, parsed, action, navigate, ctl, setLastPath]);

  const nav = useMemo<Nav>(() => {
    const current = (): Stack => {
      if (!live.current.stack) throw new Error('navigation before the first location');
      return live.current.stack;
    };
    /** every navigation goes through here: from inside an overlay, or after drop() removed the
     * screen on screen, it replaces the current entry instead of pushing */
    const go = (to: string, o: { replace?: boolean; anim?: Transition } = {}) => {
      const l = live.current;
      const fromOverlay = ctl.anyOpen();
      const replace = Boolean(o.replace) || fromOverlay || l.replaceNext;
      if (!replace && to === l.path) return;
      l.replaceNext = false;
      if (fromOverlay) ctl.closeAllNow();
      const idx = replace ? l.idx : l.idx + 1;
      moveLive(l, idx, to);
      void navigate(to, { replace, state: { idx, path: to, anim: o.anim } satisfies HistoryState });
    };
    return {
      push(segment) {
        const next = extend(current(), segment);
        if (!next) throw new Error(`"${segment}" can't follow ${buildPath(current())}`);
        go(buildPath(next));
      },
      back() {
        if (ctl.closeTop()) return;
        const parent = parentOf(current());
        if (!parent) return;
        const to = buildPath(parent);
        live.current.replaceNext = false;
        // history.back() when the previous entry is that parent; after a deep link, replace
        if (historyMirror.get(live.current.idx - 1)?.path === to) {
          moveLive(live.current, live.current.idx - 1, to);
          void navigate(-1);
        } else {
          go(to, { replace: true });
        }
      },
      switchTab(tab) {
        go(switchTarget(useNavStore.getState().lastPath, tab));
      },
      jumpToTab(tab) {
        const from = current();
        useNavStore.getState().setLastPath(tab, rootPath(tab));
        go(rootPath(tab), { anim: jumpHint(from, tab) });
      },
      openPath(path) {
        const target = parsePath(path);
        if (!target?.exact) throw new Error(`openPath: "${path}" is not a valid path`);
        useNavStore.getState().setLastPath(target.stack.area, path);
        go(path, { anim: 'fade' });
      },
      drop(screen) {
        const store = useNavStore.getState();
        store.setPaths(dropScreen(store.lastPath, screen));
        historyMirror.markDropped(screen);
        if (current().entries.some((e, n) => n > 0 && e.screen === screen)) {
          live.current.replaceNext = true;
        }
      },
      resetTo(path) {
        useNavStore.getState().setPaths({});
        go(path, { replace: true, anim: resetHint(path) });
      },
    };
  }, [navigate, ctl]);

  return (
    <NavContext.Provider value={nav}>
      <OverlayContext.Provider value={ctl.api}>
        {stack && (
          <TabHost stack={stack} hint={state?.anim} inert={items.length > 0} screens={screens} />
        )}
        <OverlayHost items={items} onEscape={ctl.closeTop} />
        <ToastHost toast={toast} onDone={ctl.toastDone} />
      </OverlayContext.Provider>
    </NavContext.Provider>
  );
}
