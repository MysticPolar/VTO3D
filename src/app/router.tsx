import type { RouteObject } from 'react-router';
import { SCREENS } from '@/routes/registry';
import { AREAS } from './nav/grammar';
import { NavRoot } from './nav/NavRoot';

/**
 * One splat route per area (HANDOFF §3), under one layout that never unmounts: React Router owns
 * the URL and the history, NavRoot turns the URL into stacks. The child routes only make every
 * URL match; they render nothing.
 */
export const routes: RouteObject[] = [
  {
    element: <NavRoot screens={SCREENS} />,
    children: [
      { index: true, element: null },
      ...AREAS.map((area) => ({ path: `${area}/*`, element: null })),
      { path: '*', element: null },
    ],
  },
];
