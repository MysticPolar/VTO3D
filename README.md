# 全新的购物体验 · web front-end handoff kit

Everything Claude Code needs to build the web version of the virtual try-on prototype. Front end only: data runs through a typed mock API, so a real backend can be plugged in later without touching the screens.

**Live prototype:** <https://mysticpolar.github.io/VTO3D/> (GitHub Pages, served from the `gh-pages` branch). After changing `reference/prototype/`, run `scripts/deploy-prototype-pages.sh` to update it.

## How to use it

1. Clone `MysticPolar/VTO3D`. It is also the web app's repository.
2. Open Claude Code in it.
3. Paste:
   > Read CLAUDE.md and docs/HANDOFF.md fully. Then do Phase 0 only. When done, show me the checks and stop.
4. Review the report. Then say "Go on with Phase 1", and so on through Phase 7.

## What's inside

| Path | What it is |
|---|---|
| `CLAUDE.md` | The short rules Claude Code loads in every session |
| `docs/HANDOFF.md` | The full spec: stack, architecture, navigation, design system, domain rules, quality bar, the 8 phases, backend notes |
| `docs/SCREENS.md` | Every screen (24): layout, interactions, overlays, data, edge cases, tests. Claude Code reads the relevant sections per phase |
| `docs/contract/` | The typed API contract (`types.ts`, `api.ts`): the mock implements it now, the backend later |
| `reference/prototype/` | The working HTML prototype, the source of truth for look and behaviour. Run: `cd reference/prototype && python3 -m http.server 8080` |
| `reference/design/` | The five-screen mockup, the approved showcase and the nine original screen designs |
| `reference/acceptance/` | The prototype's acceptance test (113 checks, all passing) and its photo fixtures |

## Decisions waiting for you

`docs/HANDOFF.md` §13: new copy the prototype doesn't have, a few navigation defaults, the route for 商家消息, the ZARA demo store, and 38 prototype issues found while writing the spec (each has a Fix or Keep default, so the build never waits on them).
