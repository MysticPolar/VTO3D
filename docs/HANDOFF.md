# Front-end handoff: 全新的购物体验 (web app)

Version 1 · 17 Oct 2026 · Front end only. The backend comes later (§14).

This is the full spec for Claude Code. `CLAUDE.md` holds the short rules; this file holds the detail; `docs/SCREENS.md` describes every screen; `docs/contract/` is the typed API contract.

---

## 0. Read this first

**What you are building.** A mobile-first web app (H5) that reproduces the HTML prototype in `reference/prototype/` as a production-grade React + TypeScript codebase: real URLs, a typed data layer over a mock backend, tests, and the same look, copy and behaviour as the prototype.

**Which source wins** when two disagree:

| Question | Source of truth |
|---|---|
| Architecture, stack, routes, state, API contract, phases | This file, `CLAUDE.md`, `docs/contract/` |
| Anything visible: layout, sizes, colours, copy, icons, interactions, timings | The prototype (`reference/prototype/`) |
| Behaviour details | The prototype first, then `docs/SCREENS.md`. If they disagree, follow the prototype and mention it in your phase report |
| Gaps in the prototype | `reference/design/` mockups. Agreed deviations from the mockups are listed in `reference/prototype/docs/REPORT.md`; keep them as the prototype does them |

**How to work.** One phase at a time (§11). End every phase with: all checks green, a short report (what now works, what is left, open questions, any prototype bugs found), the phase ticked in `CLAUDE.md`, one commit `phase N: <what now works>`, then stop and wait for review.

**Never:**
- Redesign, restyle, "modernise", translate, shorten or reword anything.
- Load anything from another origin: no Google Fonts or APIs, no analytics, no error-reporting SaaS, no CDN. Everything ships from our own origin (China-ready).
- Call a real payment, SMS, AI, map or logistics service. These are simulated by the mock (§7).
- Present simulated features as real. The prototype's honest copy (e.g. 「演示版暂无…的上身图」, the 2D-preview label on the avatar) stays exactly as it is.
- Use screenshots of the prototype as UI.

**Ask first:**
- Any dependency not listed in §3.
- Changing a route (§8) or the API contract (`docs/contract/`).
- Fixing something in the prototype that looks like a bug, unless §13.2 already lists it (then build its default). Otherwise describe it, propose the fix, and wait.

---

## 1. The product

A Chinese-market (zh-CN) shopping app built around a digital avatar (数字分身). On first launch the user uploads five photos (four full-body angles and a face photo) or a 10-second turn-around video, and the app "generates" their avatar. They then:

| Tab | Route | What it is |
|---|---|---|
| 首页 | `/home` | Virtual fitting room: dress the active digital avatar in that person's garments (one list per category, ✓ on the ones they own), try on photos of garments (temporary until 加入衣橱), switch avatar (切换角色) and backdrop (切换场景), open the camera preview |
| 购物广场 | `/plaza` | Shop: search over every store and product, a bar of favourite stores, categories, product grid → product → checkout; store sheets; 商家消息 (chats with stores) |
| 个人衣橱 | `/wardrobe` | Each person's saved clothes, whatever their source, with ✓ on the ones they own (标记为已拥有); queue items to try on; upload own garments |
| AI造型师 | `/stylist` | Chat that suggests looks (scripted for now) |
| 我的 | `/me` | Profile, orders, avatar management, addresses, settings, help |

Everything happens on phones: iOS Safari, Android Chrome and the WeChat in-app browser are the primary targets.

---

## 2. Scope

**In scope now**
- Every screen, sheet, dialog and interaction in the prototype, except the showcase board, the simulator and the mobile demo menu (they only existed to present the prototype).
- URL routing with deep links and working browser back/forward (§4.3).
- A typed API layer (`src/api`) with a mock implementation that reproduces the prototype's demo behaviour, persists locally, and simulates latency and errors (§7).
- The real browser capabilities the prototype already uses: photo picking with type/size checks and client-side downscaling, live camera preview (`getUserMedia`), clipboard, Web Share with fallback.
- Mobile-first layout for 360–430 px wide screens; on desktop the app shows as a centred phone-width column.
- Unit, component, end-to-end and visual-regression tests (§10).

**Out of scope now (backend phase, §14)**
- Real login (SMS code, WeChat), real payments (Alipay, WeChat Pay, UnionPay), AI avatar generation, AI try-on rendering, real-time video try-on, an LLM stylist, logistics tracking, merchant chat, push notifications, data export and account deletion, analytics.
- Server-side rendering, offline/PWA, other languages, WeChat Mini Program, native apps.

---

## 3. Stack

Use the latest stable version of each unless a version is given. Anything not on this list needs approval.

| Concern | Choice | Notes |
|---|---|---|
| Package manager, runtime | pnpm, Node 24 LTS | Node 24 approved on 19 Oct 2026 instead of 22, which reaches end of life in April 2027 |
| Build | Vite | `build.assetsDir: '_app'` so build output never mixes with `public/assets` |
| UI | React 18.3, TypeScript `strict` | Team standard is React 18; do not move to 19 |
| Routing | React Router 7 (`createBrowserRouter`) | One splat route per area; the stack logic is ours (§4.3). Version 8 needs React 19 |
| Server state | TanStack Query 5 | Every API call goes through a query or mutation hook |
| Client state | Zustand 5 with `persist` | Session flags, navigation memory, drafts, UI choices (§4.4) |
| Styling | CSS Modules + global tokens | No Tailwind, no CSS-in-JS, no component library |
| Class names | `clsx` | |
| Icons | Inline SVG `<Icon>` generated from `reference/prototype/js/icons.js` | No icon font, no icon package |
| Fonts | The prototype's self-hosted subset WOFF2 files | `pnpm fonts` re-subsets (§5.2) |
| Local blob storage | `idb-keyval` | Uploaded photos for the mock backend |
| Unit and component tests | Vitest, Testing Library, jsdom, `@vitest/coverage-v8`, `fake-indexeddb` | coverage gate in Phase 2; IndexedDB for the mock under jsdom |
| E2E and visual tests | Playwright Test (Chromium + WebKit), `@axe-core/playwright` | |
| Lint and format | ESLint 9 (flat config: typescript-eslint, react-hooks, jsx-a11y), Prettier | ESLint 9 until jsx-a11y supports ESLint 10 |
| Font tooling (dev only) | Python 3 with `fonttools` + `brotli` | Same tool the prototype used; only needed when copy changes |

No date library: the app only formats a few Chinese date strings (`7月20日 (周一)`); write small helpers in `src/lib/format.ts`.

---

## 4. Architecture

### 4.1 Folder structure

```
/
├─ CLAUDE.md
├─ docs/                     HANDOFF.md, SCREENS.md, contract/ (copied into src/api in Phase 2)
├─ reference/                READ-ONLY: prototype/, design/, acceptance/. Excluded from tsc, ESLint, Prettier, Vitest
├─ public/assets/            images copied from reference/prototype/assets (same sub-paths)
├─ scripts/                  fonts/ (subset.py, check.ts), visual/ (capture-prototype.ts)
├─ e2e/                      Playwright: acceptance/, nav/, visual/
└─ src/
   ├─ main.tsx               providers + router
   ├─ app/                   AppShell, router, ErrorBoundary, DevFrame (?frame=iphone)
   │  └─ nav/                stack grammar, TabHost, LaunchHost, transitions, useNav, overlay history
   ├─ routes/                one folder per screen (see §8), each <Screen>.tsx + <Screen>.module.css
   ├─ components/            shared UI (§5.7), each in its own folder with a .module.css
   ├─ features/              domain logic as plain TypeScript, unit-tested (§9):
   │                         fitting/ checkout/ orders/ stylist/ wardrobe/ images/ camera/ format/
   ├─ api/                   types.ts + api.ts (the contract), client.ts (picks the implementation),
   │                         keys.ts (query keys), hooks/ (TanStack Query hooks), mock/ (seed, db, handlers), http/ (later)
   ├─ store/                 Zustand stores: session, nav, fitting, drafts, ui
   ├─ styles/                tokens.css, global.css (reset), fonts.css, motion.css, fonts/*.woff2
   └─ lib/                   cx, isDemo(), platform detection, small helpers
```

Rules: `routes/` and `components/` import data only from `api/hooks`. `features/` has no React imports (except `camera/`, which exposes one hook). Nothing imports from `api/mock` except `api/client.ts` and tests.

### 4.2 Device chrome, safe areas and the viewport

The prototype draws a fake iPhone status bar (「9:41」, 44 px) at the top of every screen and pads the bottom by 25.6 px for the home indicator. A real browser has its own chrome, so:

- **Remove the fake status bar** (`.sb`). Add `--top-inset: env(safe-area-inset-top, 0px)` and `--safe-bottom: env(safe-area-inset-bottom, 0px)` on `:root`.
- **Top offsets.** The prototype draws every screen under a 44 px status bar, so any value measured from the top edge of the screen includes those 44 px. Convert exactly those values to `calc(var(--top-inset) + (v − 44px))`:
  - the `top` of elements positioned against the screen, e.g. `.pz-title` 44.8 → `calc(var(--top-inset) + 0.8px)`, `.fit-avatar` top 90, `.cam-top` top 44;
  - the height, `padding-top` or `margin-top` of a screen's first block, which includes the bar: `.sub-head` 88, `.pz-head` 88, `.st-head` 96, `.co-head` 87.4, `.or-head` 92, `.fit-head` 90, `.me-head` 190, `.me-band` 258, `.onb-title` margin-top 64.2, `.av-gen-head` padding-top 70 (and any `calc()` that subtracts such a value, e.g. `.fit-avatar` height);
  - children whose `top` is measured inside such a header, because the header's top is the screen's top: `.sub-head .back-btn` top 41 → `calc(var(--top-inset) − 3px)`, `.sub-title` 47.4 → `calc(var(--top-inset) + 3.4px)`.
  - Everything inside cards, rows, tiles, sheets and other nested boxes stays as it is (e.g. `.wr-tab.is-on::after` top 31.2, `.fit-check` top 3.5, `.av-badge` top 8). Full-bleed backgrounds (the 首页 plate, the onboarding photo) still start at 0.
  - The check: at `--top-inset: 44px` (the dev frame) every screen matches the prototype; at `--top-inset: 0` everything below the status bar moves up by exactly 44 px (§10.2).
- **Bottom.** Keep the prototype's formulas, which already read `--safe-bottom`: the tab bar pads `max(25.6px, var(--safe-bottom))`, footers add `var(--safe-bottom)`.
- **`index.html`:** `<html lang="zh-CN">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#F7F3EE">`, `<title>全新的购物体验</title>`.
- **No page scroll.** The app fills `100dvh` (fallback `100vh`); `html, body` don't scroll (`overflow: hidden; overscroll-behavior: none`). Only the screens' own `.scroll` areas scroll, as in the prototype.
- **No zoom on input focus (iOS).** iOS Safari zooms when a focused input is under 16 px. Don't change the input sizes; on iOS only, add `maximum-scale=1` to the viewport meta from a tiny inline script (iOS still allows pinch-zoom). Don't block zoom on Android.
- **Desktop and tablets (viewport wider than 500 px):** show the app in a centred column `width: min(100vw, 430px); height: 100dvh` on a `#241D19` backdrop. Overlays and toasts stay inside the column.
- **Dev frame `?frame=iphone`** (available when `isDemo()`): renders the app in a 390 × 844 box at the top-left with `--top-inset: 44px`, `--safe-bottom: 0px` and the prototype's status bar markup. This reproduces the prototype's `?app=<id>` mode pixel for pixel and is what the visual tests use (§10).
- **WeChat in-app browser:** WeChat shows its own title bar (it reads `<title>`) and, on iOS, a bottom back/forward bar once there is history. Use `100dvh`, never a hard-coded height. Its back button is `history.back()`, so §4.3's browser-back rules apply. Test the camera there (§11, Phase 6).

### 4.3 Navigation

This is the prototype's model (`reference/prototype/js/app.js`), expressed as URLs. Implement it in `src/app/nav/`.

**Stacks in the URL.** Each tab owns a stack: its root screen plus the secondary screens pushed on top. The URL is the active tab's stack, one path segment group per stack entry:

```
/me/orders/o/VT20260715092418/tracking
 └─ 我的 → 我的订单 → 订单详情 → 物流跟踪
```

**Grammar.** `parseStack(path) → Stack` and `buildPath(stack) → path` are pure functions with unit tests (round trips, every row below, invalid input).

| Segment | Screen (prototype id) | Allowed after |
|---|---|---|
| (tab root) `/home` `/plaza` `/wardrobe` `/stylist` `/me` | `fitting` `plaza` `wardrobe` `stylist` `profile` | (start) |
| `p/:pid` | `product` | any entry (tab roots, `favorites`, `history`, `orders` (再次购买), `o/:oid`, `checkout`, `messages` (the 消息通知 sheet), another `p/:pid` (the store sheet)) |
| `checkout` | `checkout` | `p/:pid`; or directly after `/plaza` (the 购物袋 button, which reopens the saved checkout draft) |
| `messages` | `messages` (商家消息) | `/plaza` (proposed, §13.1 #11) |
| `addresses` | `addresses` | `/me`, `settings`, `checkout` |
| `orders` (+ `?status=`) | `orderlist` | `/me` |
| `o/:oid` | `orders` (order details) | `orders` |
| `tracking` · `returns` | `tracking` · `returns` | `o/:oid` (the order comes from that entry) |
| `tracking/:oid` · `returns/:oid` | `tracking` · `returns` | `orders` (the buttons on a 我的订单 card; back returns to the list) |
| `help` | `help` | `/me`, `o/:oid` |
| `avatar` | `avatarhub` | `/me` |
| `upload` | `avatar` (我的形象 context) | `avatar` |
| `avatars/new` (+ `?name=`) | `avatar` (new-avatar context, 切换角色 → 新建数字分身) | `/home`, `/wardrobe` (proposed, §13.1 #13) |
| `profile` · `notifications` | `editprofile` · `notifications` | `/me`, `settings` |
| `payments` · `settings` · `favorites` · `history` | same ids | `/me` |
| `privacy` | `privacy` | `settings` |

`?status=` (`unpaid` · `toship` · `shipping` · `toreceive` · `aftersale`; omitted = `all`) belongs to the `orders` entry; changing the filter tab updates it with `replace`. It stays in the URL while screens are pushed on top (`/me/orders/o/X?status=toreceive`), so back after a reload keeps the filter.
Checkout has no product of its own in the URL: it shows the checkout draft (§4.4). Opening `…/p/:pid/checkout` without a draft for that product creates one from the product's current colour/size choice and quantity 1; `/plaza/checkout` without any draft shows the prototype's demo cart (蓝色条纹衬衫 · M · ×1).
The launch flow sits outside the tabs: `/welcome` (`onboarding`) → `/welcome/avatar` (`avatar`, first-launch context).
An invalid path redirects (replace) to its longest valid prefix; an unknown path redirects to `/`. An unknown `pid` or `oid` renders that screen's not-found state with a working back button.

**Operations** (`useNav()`):

| Operation | Used for | URL and history | Animation |
|---|---|---|---|
| `push(segment)` | opening any secondary screen | append; history push | push |
| `back()` | back buttons; browser back | drop the last entry: `history.back()` when the previous history entry is that parent, otherwise replace with the parent path (see History bookkeeping) | pop |
| `switchTab(tab)` | the tab bar | go to that tab's remembered path (`nav.lastPath[tab]`, default its root); push | none (instant) |
| re-tap the active tab | the tab bar, at a tab root | nothing; smooth-scroll the root's main scroll area to the top | — |
| `jumpToTab(tab)` | contextual links, e.g. 加入衣橱 → 个人衣橱, 试穿 → 首页 | that tab's stack resets to its root (the root keeps its own state); push | fade; pop if jumping from deeper in the same tab |
| `openPath(path)` | jumping into another tab's canonical chain, e.g. a notice that opens 订单详情 | the target tab's stack becomes that path; push | fade |
| `drop(screen)` | removing a finished flow, e.g. checkout after payment | removes that screen and everything above it from every tab's stack; if it is on screen, the next navigation uses replace | — |
| `resetTo(path)` | entering the app from the launch flow (`app.enterMain()`), 重新体验首次启动 and 重置演示数据 (`app.launch()`) | every tab's remembered path resets to its root; replace | fade into `/home`; none into `/welcome` |

**History bookkeeping.** Every entry the app writes carries `history.state = { idx, path, overlay? }`, and `src/app/nav/history.ts` mirrors the entries it wrote in `sessionStorage` (`idx → path`), so the app always knows what the previous entry is. Rules:
- `back()`: if the mirror says entry `idx − 1` is the parent path, call `history.back()`; otherwise `replace` with the parent path.
- Opening an overlay pushes `{ idx + 1, same path, overlay: id }`. Closing it from the UI calls `history.back()`; closing several closes them with one `history.go(−n)`.
- Never navigate right after `history.back()`/`go()`: they are asynchronous. To navigate from inside an overlay (管理收货地址, 查看订单, a sheet's product row, 去衣橱看看, …), `replace` the overlay's entry with the new path instead of popping first, then close the overlay without touching history.
- A busy overlay (the cashier while 「支付处理中…」) can't be closed: on its `popstate`, push its entry back and ignore the event.
- On `popstate`, close any overlay whose entry is no longer current, then derive the stacks and the transition from the new URL.

How each prototype call maps: `app.go(secondaryId)` → `push`; `app.go(tabId, {}, {tab:true})` (also `data-act="tab"` buttons such as 我的形象 「去试衣间」 and 我的 「我的衣橱」) → `switchTab`; `app.go(tabId)` → `jumpToTab`; `app.open(id, params)` → `openPath(canonical path)`; `app.back()` → `back`; `app.drop(id)` → `drop`; `app.enterMain()` → `resetTo('/home')`; `app.launch()` → `resetTo('/welcome')` (or `/home` when `setupDone`). Canonical paths follow the prototype's `PARENT` map (e.g. `orders` → `/me/orders/o/:oid`, `product` → `/plaza/p/:pid`, `privacy` → `/me/settings/privacy`).

**Transitions** are derived from the old and new stacks, so browser back/forward animate correctly too: same tab and one entry longer → push; same tab and shorter → pop; different tab → none, unless the navigation carried `state.anim = 'fade'`. Push and pop: 380 ms `cubic-bezier(.16,1,.3,1)`; the new screen slides from 100% to 0 while the old one moves to −28% and dims to `brightness(.94)` (pop is the reverse). Fade: 260 ms. Screens that are leaving ignore taps. Under `prefers-reduced-motion: reduce`, navigation is instant.

**Keep-alive.** `TabHost` keeps every entry of every visited tab's stack mounted; only the active tab's top entry is visible. Hidden entries get `visibility: hidden`, `inert` and `aria-hidden` (not `display: none`, which loses scroll positions). This is how tabs and back navigation keep scroll positions, typed text and component state without snapshots (the prototype snapshots and restores instead). Leaving a screen pauses its media: the camera stops (§9.10).

**Tab bar.** One `TabBar` component, drawn inside each tab root screen exactly as in the prototype (`VT.ui.tabBar(active)`), so it moves with the root during push and pop. It never appears on secondary screens or in the launch flow. Five items, in order: 首页, 购物广场, 个人衣橱, AI造型师, 我的; inactive outline icons, active filled icon and bold label.

**Focus.** After any animated navigation, focus moves to the new screen's first heading (`tabindex="-1"`, no visible focus ring for programmatic focus), as the prototype does. Tab switches don't move focus.

**Overlays** (sheets, dialogs and full-screen layers such as the camera, the cashier and avatar generation) are not routes. They render in a portal inside the app column. Opening one pushes a same-URL history entry; browser back and Esc close the top overlay, unless it is busy (§13.2 #1). History handling follows History bookkeeping above. Any navigation closes all open overlays first. Focus moves into the overlay on open and back to the trigger on close. Toasts are not overlays: no history entry, one at a time, a new one replaces the old.

**Launch flow and first-launch rule.**
- `/` redirects (replace) to `/home` when `session.setupDone` is true, otherwise to `/welcome`.
- `/welcome` and `/welcome/avatar` redirect (replace) to `/home` when `setupDone` is true.
- Every other URL opens directly, even before setup, so shared links work.
- `setupDone` becomes true when the user leaves the launch flow into the app: after generating the avatar, after 跳过, or after logging in (SCREENS.md has the exact triggers). Entering the app replaces the history entry with `/home`.
- 我的 → 设置 → 重新体验首次启动 sets it back to false and goes to `/welcome`.

**After payment.** Checkout is dropped from the plaza stack (`/plaza/p/:pid` remains) and 订单详情 opens over 我的订单 (`/me/orders/o/:oid`, fade, replacing the checkout history entry). The plaza tab then returns to the product page.

### 4.4 State

| Kind | Where | Examples |
|---|---|---|
| Server state (will live on the backend) | TanStack Query, through `src/api/hooks` only | catalog, stores, favourites, favourite stores, saved looks, wardrobe, orders, returns, addresses, profile, digital avatars (each with its own photos, body data and wardrobe, §9.15), settings, chat history, store chats, browsing history |
| Client state | Zustand, persisted to `localStorage` key `vto-web-state-v1` | `session` (`setupDone`), `fitting` (active avatar, active category, each avatar's outfit and try-on queue), `ui.fitScene` (the 首页 backdrop), `drafts` (product colour/size choices, checkout draft), `ui` (plaza category, query and chosen store, wardrobe category) |
| This browser session | Zustand persisted to `sessionStorage` key `vto-web-session-v1` | `fitting.temporary` (each avatar's temporary garments, §9.17: 首页 photos as downscaled JPEG data URLs with name and category, and the products tried on but not saved); they never reach the backend until 加入衣橱 |
| In memory only | Zustand without persist, or component state | `nav.lastPath` per tab, overlay stack, toasts, unsent stylist text |
| Mock database | `src/api/mock/db.ts`: JSON in `localStorage` key `vto-web-db-v1`; uploaded image blobs in IndexedDB (`idb-keyval`, store `vto-web-blobs`) served as object URLs | everything in the first row |

- Mutations the prototype shows instantly (hearts, switches, wardrobe add/remove, 标记为已拥有 / 取消已拥有标记, default address, queue changes) are optimistic: update the cache at once, roll back and toast on error.
- Query keys live in `src/api/keys.ts`. After a mutation, invalidate exactly what changed (e.g. paying an order invalidates the order, the order list and the counts on 我的).
- Prefetch on app start: catalog, favourites, wardrobe, profile, order counts. With mock latency, the first screen should not flash skeletons.
- Reset (`devtools.reset()`, behind 重置演示数据) clears the mock database, the blobs and the persisted Zustand stores, then reloads to `/`.

---

## 5. Design system

### 5.1 Tokens

Copy `reference/prototype/css/tokens.css` into `src/styles/tokens.css` unchanged. When the port turns up a literal used in more than one place, add a token next to the existing ones. Known repeat literals:

| Token (new) | Value | Used by |
|---|---|---|
| `--tabbar-bg` | `#FCF8F3` | tab bar |
| `--tabbar-icon` / `--tabbar-label` / `--tabbar-on` | `#3D3833` / `#8B837B` / `#1A1816` | tab bar items |
| `--tabbar-h` | `calc(52.4px + max(25.6px, var(--safe-bottom)))` | tab bar, everything placed above it |
| `--me-band` / `--me-card` | `#F0E7DE` / `#FDF9F4` | 我的 header band and cards |
| `--backdrop` | `#241D19` | desktop backdrop |
| `--focus` | `#8A6F5A` | focus ring (`css/base.css:36`) |
| `--coral-soft` / `--coral` / `--coral-line` | `#F3D5CD` / `#D9897A` / `#D48B7A` | 首页: the 开启视频试衣 pill and its circle; the selected garment's ring |

The `--seg-on` row (`#5B4B42`, the selected 推荐 / 我的上传 tab) is gone with those tabs (21 Oct 2026). The same change added `--own-mark: rgba(60, 50, 43, .84)` (the ✓ 已拥有 mark, §9.17) to the prototype's `tokens.css`, after Phase 0 copied it: add it to `src/styles/tokens.css`.

Palette rules from the original brief still apply: quiet luxury, no gradients beyond the prototype's existing fade-outs, no neon, glow or glassmorphism. The 首页 update (20 Oct 2026) adds a muted coral as the second accent after the yellow dot; it is used only for video try-on and the selected garment on 首页. The ✓ is a dark warm brown at 84 %, never a colour accent.

### 5.2 Typography and fonts

- Copy `reference/prototype/assets/fonts/*.woff2` to `src/styles/fonts/` and the `@font-face` rules from `reference/prototype/css/base.css` to `src/styles/fonts.css` (families "VT Sans SC" 400/500/700/900 and "VT Inter" 400–800 with its `unicode-range`). `font-display: swap`. Use the prototype's stacks `--font` and `--font-cjk`.
- App base: `font-size: 14px; line-height: 1.4` (from `.vt-app`).
- The fonts are subset to the characters the prototype uses. New copy you add (loading and error states, §5.8) may fall back to the system font until you re-run `pnpm fonts`. User-typed text always may; that is fine.
- `pnpm fonts` = `python3 scripts/fonts/subset.py`, a port of `reference/prototype/tools/subset_fonts.py` that scans `src/**/*.{ts,tsx,css}` and `index.html`, reads source fonts from `fonts-src/` (git-ignored; the script prints the file names it expects: Noto Sans SC Regular/Medium/Bold/Black, Inter Regular–ExtraBold), keeps the same options, and also writes `src/styles/fonts/charset.txt`.
- `pnpm fonts:check` (Node, runs in `prebuild`) scans the same files and fails the build, listing the characters that are missing from `charset.txt`.

### 5.3 Units, sizes and screen widths

- Port the prototype's CSS values as they are: px calibrated at 390 px width. Don't convert to rem or vw. Where the prototype uses %, flex or `calc`, keep it; the layout is already fluid.
- The prototype sets `container-type: size` on `.vt-app`; keep that on the app root.
- Test widths: 360, 375, 390, 414, 430; heights 667, 740, 844, 932. Nothing may scroll horizontally or clip text at 360 px.

### 5.4 Motion

| Motion | Value (from the prototype) |
|---|---|
| Push / pop | 380 ms `--ease-out` `cubic-bezier(.16,1,.3,1)`; old screen to −28% with `brightness(.94)` |
| Fade (tab jumps, chain opens) | 260 ms `ease` |
| Bottom sheet | slide 340 ms `--ease-out`; scrim `rgba(28,22,18,.38)` fade 280 ms |
| Dialog | scale .94 → 1, 250 ms `--ease-out` + fade 200 ms |
| Full-screen layer | fade 250 ms |
| Overlay removal | 280 ms after close |
| Toast | in: transform 250 ms `--ease-out` + opacity 200 ms; removed 260 ms after hiding; visible 2.2 s, or 3.6 s with an action button |
| Heart | `vt-pop` 320 ms (.7 → 1.18 → 1) |
| Switch | 200 ms |
| 首页 render swap | crossfade, old image removed after 450 ms |

Put shared keyframes in `src/styles/motion.css`. Respect `prefers-reduced-motion: reduce` everywhere the prototype does (`VT.reducedMotion()`): instant navigation, instant overlay removal, shortened demo timers (§9.11).

### 5.5 Icons

Generate `src/components/Icon/icons.ts` from `reference/prototype/js/icons.js` with a one-off script (name → viewBox + inner SVG). `<Icon name size stroke />` renders inline SVG with `currentColor`, `aria-hidden="true"`. Keep the prototype's icon names and the size/stroke used at each call site (e.g. tab icons 28 px with stroke 1.55, list-row icons 24 px).

### 5.6 Images

- Copy `reference/prototype/assets/{people,clothing,plaza,ui,backgrounds,avatar-onboarding}` to `public/assets/` keeping the sub-paths, so the seed data's paths port unchanged (as `/assets/...`). `plaza/` (banners, model photos and cleaned-up card shots for 购物广场) arrived with the stores redesign (514de38), after Phase 0 copied the others. `avatar-onboarding/` arrived with the avatar onboarding upgrade (21 Oct 2026). It holds the method previews, the five reference photos plus a three-quarter one, the 错误示范 examples, the four turn frames and the result face, about 145 KB in all. The images are from the onboarding asset kit (synthetic illustrative references), except `wrong/heavy_filter.webp`, which was made from the kit's face portrait.
- Every `<img>` gets `width`/`height` or an aspect-ratio box (no layout shift), Chinese `alt` text (the product name) or `alt=""` when decorative, `decoding="async"`. Below-the-fold images `loading="lazy"`; the 首页 avatar, onboarding photo and product hero `fetchpriority="high"`.
- 首页 (prototype, 21 Oct 2026): once the page has loaded, it fetches the four body renders at low priority (`fetchPriority = 'low'`; never before `load`, which would keep the browser's loading indicator spinning), so an outfit change swaps from the cache instead of waiting on the network (about 2.4 s → 0.06 s at 60 KB/s). The rail's first 8 tiles load at once, the rest with `loading="lazy"`.

### 5.7 Component inventory

Port these from `reference/prototype/css/components.css` and `js/ui.js` into `src/components/` (one folder each). Keep the prototype's DOM structure inside each component so its CSS ports 1:1.

- **Navigation:** `TabBar`, `SubHeader` (back button, centred title, optional right action), `BackButton`.
- **Actions:** `Button` (dark / light / ghost / beige variants as in the prototype), `IconButton` (44 × 44 target), `HeartButton` (with pop animation, `aria-pressed`, 「收藏」/「取消收藏」 labels), `Chip`, `ChipRow` (horizontal scroll), `Segmented`, `Stepper` (quantity).
- **Lists and settings:** `ListGroup`, `ListRow` (icon, label, value, sub-label, chevron), `ToggleRow` + `Switch` (`role="switch"`, `aria-checked`), `KeyValue` (price breakdown, order info).
- **Commerce:** `Price` (one ¥ formatter with thousands separators, §9.4), `ColorDots` (incl. the stripe swatch and the 「+N」 overflow), `ProductCard`, `WardrobeTile`, `LookCard`, `OrderCard`, `MiniItem`, `OwnMark` (the ✓ 已拥有 corner mark, `VT.ui.ownMark`: top-right, top-left where a heart has the top-right, or inline before 「已拥有」; size and inset per place, §9.17), `StatusTracker` (4-step order tracker), `Timeline` (logistics).
- **Overlays:** `OverlayHost`, `Sheet` (grab bar, title, close; `full` variant), `Dialog` (returns a promise like `app.dialog`), `Layer` (full-screen), `Menu` (a small menu anchored above its trigger, with a tail: 首页's 拍照), `Toast` (`role="status"`, optional action).
- **Forms:** `Field`, `TextArea`, `ImagePicker` (wraps `<input type="file" accept="image/*">` + the §9.9 pipeline), `VideoPicker` (`accept="video/*"` + the §9.16 checks), `VideoRecorder` (the MediaRecorder layer, §9.16).
- **Feedback:** `Spinner`, `ProgressBar`, `ProgressRing` (indeterminate unless real progress is known, §9.13), `CheckRow` (检测中 / 通过 / 需要重新上传 / 无法检测), `EmptyState`, `Skeleton`, `ErrorState` (§5.8), `DemoNote` (renders only when `isDemo()`).

### 5.8 Loading, error and empty states

The prototype is synchronous, so it has no loading or network-error UI. The web app needs a minimal, consistent treatment that stays out of sight when things are fast:
- **Loading:** keep the screen's header and fixed parts; show `Skeleton` blocks with the final geometry (colour `--chip`) only if data takes longer than 300 ms. Buttons that wait on a mutation show a small `Spinner` and are disabled after 300 ms.
- **Errors:** a failed query shows `ErrorState` in place of the content: 「加载失败，请检查网络后重试」 and a 「重试」 button. A failed mutation rolls back and toasts 「操作失败，请稍后重试」, or the error's `userMessage` when it has one (§7).
- **Empty states** come from the prototype (SCREENS.md lists them).
- **Not found:** a product or order id that doesn't exist shows `EmptyState` with 「没有找到这个商品」 / 「没有找到这个订单」 under a normal `SubHeader` with a working back button (§13.2 #16).
- This new copy is listed in §13 for Walker's approval.

### 5.9 Accessibility and input

- Buttons are `<button type="button">`; links that change the URL are buttons that call `useNav` (the URL is app state, not a document link). Keep every Chinese `aria-label` from the prototype.
- Touch targets at least 44 × 44 px. Focus rings exactly as in the prototype: global `:focus { outline: none }` and `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px }` (`css/base.css:35-36`); tab items use `outline: 2px solid var(--ink); outline-offset: -4px; border-radius: 12px` (`css/components.css:158`).
- Sheets and dialogs: `role="dialog"`, `aria-modal="true"`, labelled by their title; focus trapped while open.
- The tab bar is `<nav aria-label="主导航">`; the active item has `aria-current="page"`.
- **Chinese input methods:** Enter submits only when `!event.nativeEvent.isComposing` (the prototype checks `isComposing`). Search fields ignore `input` events while composing and filter on `compositionend`, so pinyin letters never trigger a "no results" flash.
- `@axe-core/playwright` runs on every screen in Phase 7; no serious or critical violations.

---

## 6. Screens

`docs/SCREENS.md` describes every screen: route, prototype files, design reference, layout, interactions, overlays, data, states and the acceptance checks that exercise it. Use it as the checklist for Phases 3–5; use the prototype's source for exact markup, CSS and copy.

Porting method per screen:
1. Open the screen in the prototype (`?app=<id>`) next to your build (`?frame=iphone`).
2. Port the template string in `js/screens/NN-*.js` to JSX with the same element structure and class names (as module classes), and `css/screens/NN-*.css` to `<Screen>.module.css` with the top-offset rule from §4.2.
3. Replace `VT.store` reads/writes with the hooks from §7, `app.*` navigation with `useNav` (§4.3), `app.sheet/dialog/layer/toast` with the overlay components.
4. Add a `data-screen="<prototype id>"` attribute to the screen root (tests use it).
5. Compare visually (`pnpm visual`) and run that screen's acceptance checks.

---

## 7. API contract

**Files.** `docs/contract/types.ts` (data types) and `docs/contract/api.ts` (the `Api` interface). In Phase 2 copy them to `src/api/types.ts` and `src/api/api.ts` unchanged. They are the agreement with the future backend: changing them needs approval. The garment ownership model (§9.17) needs changes that are only proposed so far, at the end of §9.17 (§13.1 #19).

**Rules**
- The UI never calls the `Api` object directly; it uses hooks in `src/api/hooks/` (`useProducts`, `useToggleFavorite`, …), which wrap `api.*` in TanStack Query.
- `src/api/client.ts` exports the one `api` instance: the mock now (`createMockApi()`), the HTTP client later.
- All methods return promises. Failures throw `ApiError` (`code`, `message`, `userMessage?`). `userMessage` is Chinese, safe to show in a toast.
- Images are URLs (`ImageUrl`). Uploads take a `Blob` that the client has already downscaled (§9.9) and resolve with the updated entity (avatar, profile, wardrobe item, order), which carries the stored URL.
- Long-running work (avatar generation) is a job: start it, then poll its status.
- Payments: `orders.pay` returns a `PaymentAction`. In demo mode the UI opens the simulated cashier first and calls `create` → `pay` → `confirmDemoPayment` only after 确认支付 (§9.4), so 取消 creates nothing. The real backend will return redirect or SDK actions (§14).
- Field names follow `data.js` with the renames listed at the top of `types.ts`; the Phase 2 seed-parity test applies that mapping.

**Mock implementation** (`src/api/mock/`)
- `seed.ts`: a port of `reference/prototype/js/data.js` (catalog, categories, renders, looks, stores, favourite stores, store chats, season picks, seed wardrobe, addresses, shipping options, payment methods, seed orders and return, favourites, history, FAQs, chat seed, scripted replies), plus the demo content listed at the end of this section. Values verbatim.
- `db.ts`: load/save the JSON database (`vto-web-db-v1`), blob storage (idb-keyval), `reset()`.
- `handlers/*.ts`: one file per API area, implementing the prototype's demo rules (§9) on top of the db.
- Latency: each call waits a random 150–350 ms (`VITE_MOCK_LATENCY=150-350`; `0` in tests). Simulated work keeps the prototype's durations (§9.11).
- Error injection (demo mode only): `?mockFail=orders.pay` or `localStorage['vto-mock-fail'] = 'orders.pay,profile.update'` (`*` = everything) makes those methods throw a network `ApiError`.

**Prototype state → web.** Where each `VT.store` field (`reference/prototype/js/store.js`) goes:

| Prototype field | Web |
|---|---|
| `setupDone` | Zustand `session.setupDone` (persisted) |
| `loggedIn` | `auth.session` / `login` / `logout` |
| `avatar` | `avatar.get` / `uploadPhoto` / `uploadVideo` / `removeMaterial` / `discardDraft` / `check` / `useDemo` / `generate` / `job` / `cancel` (the materials calls are draft, §13.1 #14) |
| `mediaConsent` | `privacy.mediaConsent` / `recordMediaConsent(version)` (draft, §9.16) |
| `body` | `avatar.body` / `updateBody` |
| `favorites` | `favorites.list` / `set` |
| `savedLooks` | `savedLooks.list` / `set` |
| `history` | `history.list` / `record` / `clear` |
| `wardrobe` | `wardrobe.*` (garment records with source and ownership, §9.17) |
| `chat` | `stylist.messages` / `send` |
| `orders`, `returns`, `currentOrder` | `orders.*` (a return is `order.return`); the current order is the `oid` in the URL |
| `addresses` | `addresses.*` |
| `profile` | `profile.*` |
| `avatarPrefs`, `notify`, `privacy`, `prefs` | `settings.get` / `update` |
| `fit.cat`, `fit.outfit` | Zustand `fitting.category` (shared) and `fitting.outfit[avatarId]` (per avatar), persisted; the image comes from `fitting.render(outfit)` |
| `tryQueue` | Zustand `fitting.queue[avatarId]` (wardrobe uids, persisted) |
| `avatars`, `activeAvatar` | `avatars.list` / `create` / `rename` / `remove` (draft contract, §13.1 #14); the active avatar's id in Zustand `fitting.avatarId` (persisted). `avatar`, `body` and `wardrobe` are that avatar's (§9.15) |
| `fitScene` | Zustand `ui.fitScene` (persisted) |
| Temporary garments (`sessionStorage['vt-garments-temp-v1']`, `VT.garments`; until 21 Oct 2026 首页's 我的上传 in `vt-fit-uploads-v1`) | Zustand `fitting.temporary`, per avatar, persisted to `sessionStorage` (§4.4, §9.17) |
| `plaza.cat`, `plaza.q`, `plaza.store`, `wardrobeCat` | Zustand `ui` (persisted) |
| `storeFavs` | `stores.favorites` / `setFavorite` |
| `storeChats` | `storeChats.list` / `open` / `send` / `markRead` |
| `selections[pid]` | Zustand `drafts.selections[pid]` (persisted) |
| `cart`, `checkout.{address, shipping, agree}` | Zustand `drafts.checkout` (persisted, §9.4) |
| `checkout.payment` | the default: `settings.prefs.defaultPayment`; this checkout's choice: `drafts.checkout.payment` (§13.2 #14) |
| Module-level state in screen files: gallery index per product, 我的收藏 segment, return drafts per order | non-persisted Zustand (they must outlive the screen) |
| Profile edit draft, wardrobe search open/query | component state (the screen stays mounted while it matters) |

**Demo content that lives in the prototype's screen files** moves into the mock seed and is served through the API, so no screen holds demo data:

| Content | Prototype | API |
|---|---|---|
| Reviews and the fit note | `screens/05-product.js:12-16`, `reviews()` | `catalog.reviews` |
| Size table and the avatar tip | `screens/05-product.js`, `guide()` | `catalog.sizeGuide` |
| 拍照找同款 results | `screens/04-plaza.js` | `catalog.similar` |
| 消息通知 notices | `screens/04-plaza.js`, `notices()` (opened from `screens/14-messages.js`) | `notices.list` |
| Platform banners (images, labels) and the 秋日灵感穿搭 picks | `screens/04-plaza.js`, `banners()`; `data.seasonPicks` | `catalog.banners` |
| Store chat greeting, quick questions and replies | `screens/14-messages.js` | `storeChats.open`, `storeChats.send` |
| Stylist photo reply, 最近的对话 | `screens/07-stylist.js` | `stylist.send`, `stylist.recentChats` |
| Merchant and service chat answers | `screens/09-orders.js`, `openChat` | `support.openChat`, `support.send` |
| Bound payment accounts | `screens/11-account.js`, 支付方式 | `PaymentMethod.account` |
| Demo verification code 246810 | `screens/01-onboarding.js` | `auth.requestCode` |
| Stylist suggestion chips | `data.chatSuggestions` | `stylist.suggestions` |

Fixed UI text (titles, buttons, 「演示数据」 notes) stays in the components.

---

## 8. Route table

Prototype screen id ↔ web route ↔ component. Use the prototype id in `data-screen` and in test names. The last column is the prototype URL suffix used for the visual baselines (`reference/prototype/index.html?app=…`); the web side uses the route with `?frame=iphone`.

| Id | Title (prototype) | Route | Component | Baseline `?app=` |
|---|---|---|---|---|
| `fitting` | 虚拟试衣间 (tab 首页) | `/home` | `routes/Home` | `fitting` |
| `plaza` | 购物广场 | `/plaza` | `routes/Plaza` | `plaza` |
| `wardrobe` | 个人衣橱 | `/wardrobe` | `routes/Wardrobe` | `wardrobe` |
| `stylist` | AI 造型师 | `/stylist` | `routes/Stylist` | `stylist` |
| `profile` | 我的 | `/me` | `routes/Me` | `profile` |
| `onboarding` | 启动页 | `/welcome` | `routes/Welcome` | `onboarding` |
| `avatar` | 上传照片 / 视频，创建数字分身 | `/welcome/avatar` (first launch) | `routes/AvatarUpload` | `avatar` |
| `avatar` | (same screen, 我的形象 context) | `/me/avatar/upload` | `routes/AvatarUpload` | `avatar&from=profile` |
| `avatar` | (same screen, new-avatar context) | `/home/avatars/new?name=…` (proposed) | `routes/AvatarUpload` | — (same layout as `avatar`; covered by its acceptance checks) |
| `product` | 商品详情 | `<parent>/p/:pid`, canonical `/plaza/p/:pid` | `routes/Product` | `product&pid=striped-shirt` |
| `checkout` | 结算下单 | `<parent>/p/:pid/checkout` | `routes/Checkout` | `checkout` |
| `messages` | 商家消息 | `/plaza/messages` (proposed) | `routes/Messages` | `messages` |
| `orderlist` | 我的订单 | `/me/orders?status=all` | `routes/OrderList` | `orderlist&filter=all` |
| `orders` | 订单详情 | `/me/orders/o/:oid` | `routes/OrderDetail` | `orders&oid=VT20260715092418` |
| `tracking` | 物流跟踪 | `/me/orders/o/:oid/tracking` | `routes/Tracking` | `tracking&oid=VT20260715092418` |
| `returns` | 申请退换货 (form) | `/me/orders/o/:oid/returns` | `routes/Returns` | `returns&oid=VT20260710151207` |
| `returns` | 申请退换货 (in progress) | `/me/orders/o/:oid/returns` | `routes/Returns` | `returns&oid=VT20260702110846` |
| `avatarhub` | 我的形象 | `/me/avatar` | `routes/AvatarHub` | `avatarhub` |
| `editprofile` | 我的资料 | `/me/profile` | `routes/EditProfile` | `editprofile` |
| `addresses` | 收货地址 | `/me/addresses` (also after `checkout`) | `routes/Addresses` | `addresses` |
| `payments` | 支付方式 | `/me/payments` | `routes/Payments` | `payments` |
| `notifications` | 消息通知 | `/me/notifications` | `routes/Notifications` | `notifications` |
| `settings` | 设置 | `/me/settings` | `routes/Settings` | `settings` |
| `privacy` | 隐私与安全 | `/me/settings/privacy` | `routes/Privacy` | `privacy` |
| `help` | 帮助与客服 | `/me/help` | `routes/Help` | `help` |
| `favorites` | 我的收藏 | `/me/favorites` | `routes/Favorites` | `favorites` |
| `history` | 浏览记录 | `/me/history` | `routes/History` | `history` |

26 baselines. A screen's web route for the baseline is its canonical route with the same parameters (e.g. `/plaza/p/striped-shirt/checkout?frame=iphone`).

`messages` (商家消息) arrived with the 购物广场 stores redesign (prototype commit 514de38, 19 Oct 2026), after Phase 0 captured 25 baselines. Its route is a proposal until confirmed (§13.1 #11): a segment `messages` after `/plaza`, so the screen sits on the plaza stack like the prototype's `PARENT` map (`messages: 'plaza'`) and back returns to 购物广场. Products opened from its 消息通知 sheet push on top of it (`/plaza/messages/p/:pid`).

---

## 9. Domain rules

Port these as plain functions in `src/features/` (used by the mock and, where noted, by the UI) with unit tests covering at least the listed cases. Values come from the prototype; file references point into `reference/prototype/js/`.

### 9.1 Search, store and category filters

- **Category filter** (`data.inCat`): `all` matches everything; `shoesbag` matches category `shoes` or `bag`; any other id matches the same category.
- **A product's store** (`data.storeOf`, `data.js:202-204`): the store whose `name` equals the product's `brand`, with the first store as a fallback that no seed product needs. The seven stores are listed in SCREENS.md (购物广场).
- **购物广场 feed** (`screens/04-plaza.js:12-17`, `:36-45`), always in `data.plazaOrder` order:
  - Without a query: the chosen store's products AND the category. The chosen store is `plaza.store` while that store is one of the favourite stores; otherwise, and for `'all'`, every store.
  - With a query: every store's products, whichever store is chosen, AND the category. Typing a non-blank query also sets `plaza.store` to `'all'`; tapping a store tab clears the query.
- **购物广场 search** (`screens/04-plaza.js:36-50`): `q = query.trim().toLowerCase()`; empty `q` = no search. A product matches when `[name, cardName, tags, brand, storeFullName, colourNames.join('')].join(' ').toLowerCase()` contains `q`. A store matches when `[name, fullName, tagline].join(' ').toLowerCase()` contains `q`. All seven stores are searched, favourite or not, in `data.stores` order, and the category doesn't apply to them.
- **个人衣橱 search** (`screens/06-wardrobe.js:17-22`): same normalisation; matches `(name + tags).toLowerCase()`; uploads match their own name. AND with the category.
- Cases (matching stores · products): 「衬衫」 → Reformation, through its tagline 「轻盈面料 · 经典衬衫」 · 4; 「reformation」 and 「REFORMATION」 → Reformation · 1 (striped-shirt); 「蓝」 → none · 5; 「soft archive」 → Soft Archive · 6; 「zara」 → ZARA · 4; 「旗舰店」 → ZARA, Forma, Reformation · 13 (store full names are searched); 「面料」 → Reformation · 0; 「259」 → none · 0 (price isn't searched); 「上衣」 → none · 0 (category labels aren't searched); 「白燕」 → none · knit-cardigan and maxi-skirt (奶油白 + 燕麦色); 「衬衫」 with the 鞋包 chip → Reformation · 0.
- Counts. Plaza chips under 全部: 全部 29 · 上衣 10 · 下装 4 · 外套 8 · 连衣裙 1 · 鞋包 5 · 配饰 1. Products per store: ZARA 4 · Soft Archive 6 · Linea Studio 6 · Mono Atelier 3 · Forma 8 · Reformation 1 · Linea Denim 1. A store with a chip: ZARA + 外套 → knit-cardigan, brown-blazer; ZARA + 上衣 → nothing (「这家店暂无「上衣」商品」). Wardrobe seed counts (本人): 全部 21 · 上衣 6 · 下装 3 · 鞋包 5 · 配饰 1 · 外套 5 · 连衣裙 1.
- The web build searches with the query debounced by 200 ms (products and stores alike) and keeps the previous results on screen while the next arrive, so the feed never flashes empty. The wardrobe filters its own list locally.

### 9.2 Outfit slots and try-on

- Seven slots: `top`, `bottom`, `dress`, `outer`, `shoes`, `bag`, `acc`. A product's slot is its category (`data.slotOf`), not the 首页 menu it was picked from (「上装」 lists black-blazer, which fills `outer`). A photo's slot is its garment category (`custom.cat`).
- **Toggle on 首页:** tapping a selected item removes it; tapping another item for an occupied slot replaces it. A `dress` clears `top` and `bottom`; a `top` or `bottom` clears `dress`. `outer`, `shoes`, `bag`, `acc` combine with anything.
- **首页 rail** (`screens/03-fitting.js`, `rail`; §9.17): one list of the active person's garments, whatever their source: this session's temporary garments, newest first, then the wardrobe in its own order. Each 首页 category lists the garments of its garment category (上装 top, 下装 bottom, 连衣裙 dress, 外套 outer, 鞋履 shoes, 包包 bag, 配饰 acc) plus those its `data.fitCatsAll` list names (上装's list adds knit-cardigan, beige-blazer, black-blazer and utility-jacket). ✓ on the owned ones; the coral ring on the worn ones, both on a worn owned one. An empty category shows 「还没有{label}」. Cases (本人, seed): 上装 → [knit-cardigan ✓, striped-shirt, black-blazer ✓, white-tee, white-shirt, brown-sweater, ribbed-tank ✓, basic-cami ✓]; 外套 → [knit-cardigan ✓, black-blazer ✓, taupe-coat, black-cardigan ✓, denim-jacket]; 下装 → [straight-jeans, pleated-skirt ✓, beige-trousers ✓]; after 试穿上身 on grey-hoodie, 上装 starts with grey-hoodie (no ✓) for the session; a new avatar → 「还没有上装」. (From 051585b the rail listed only the image-ready garments; from the 首页 update of 20 Oct 2026 until 21 Oct 2026 it had 推荐, every try-on garment with the image-ready ones first, and 我的上传.)
- **`applyTryOn(outfit, refs)`** (`VT.tryOn`, `screens/05-product.js:195`), used by 试穿上身, 个人衣橱 (立即试穿, the queue, 一键试穿这套, 再次试穿), AI 造型师 (looks and outfits) and 我的收藏. `refs` are product ids, or `up:{uid}` for a photo (§9.17). A product the active person hasn't got first becomes a temporary garment of theirs (`shopping_plaza`, not owned, not saved), so the rail lists it. Then it applies each garment in order with the rules above, merging into the current outfit; sets the 首页 menu category from the first garment (`VT.garments.fitCatOf`, `:210`): the first try-on category whose full list contains it, skipping 「上装」 unless it is a `top` or `outer` garment, else the category of its garment category, so a garment without a render still opens its own category and is on the rail; if the avatar isn't ready, calls `avatar.useDemo()`; then `jumpToTab('home')`. 420 ms later it toasts 「已为你的数字分身换上所选单品」, or, if any sent garment is in `missing`, 「演示版暂无「{name}」的上身图，已加入当前搭配」 (3000 ms) naming the first such garment.
- **Toasts when toggling on 首页:** added and missing → 「演示版暂无「{name}」的上身图，已加入当前搭配」 (2800 ms); added and shown → 「已试穿：{name}」; removed → no toast.
- **Garment photos on 首页** (拍照; SCREENS.md 首页): a confirmed photo (§9.9) becomes a temporary garment of the active person (`addPhoto`, §9.17: `custom {src, name, cat}`, `source: 'photo_upload'`, not owned; name at most 16 characters, blank → 「我的衣物」; `cat` from the 首页 category chosen, default the active one: 上装 → top, 下装 → bottom, 连衣裙 → dress, 外套 → outer, 鞋履 → shoes, 包包 → bag, 配饰 → acc) at the front of the rail. It fills the slot of its garment category with the slot rules above, as `up:{uid}`. `pickRender` always counts it as missing, so it is never drawn: the render changes only when the slot rules take something else off. Putting one on (confirming, or tapping its tile) toasts 「演示版暂无「{name}」的上身图，已加入临时试穿」 (2800 ms). Temporary garments last for the browser session, belong to that person and never reach a wardrobe on their own; outfit entries whose photo is gone (a new session) are dropped.
- **加入衣橱** (the 临时试穿 card): moves the photo the card shows (the first worn photo, temporary ones first) into the **active avatar's** wardrobe (`wardrobe.upload` with the image, name and category; front of the list; the same `uid`, so the outfit keeps wearing it; not owned; the wardrobe filter goes back to 全部). Once: the garment is no longer temporary, so the button reads 已在衣橱 (hanger icon; ✓ means owned). Deleting it in 个人衣橱 also takes it off the outfit, so the card goes. Toast 「已加入个人衣橱」, or 「已加入「{avatar name}」的衣橱」 with more than one avatar, with the action 「去看看」 → `jumpToTab('wardrobe')`.
- Cases: confirm a jacket photo under 外套 → outfit `{outer: up:…}`, render stays base, the photo first in 外套 without ✓, the wardrobe unchanged; 加入衣橱 → wardrobe +1 (`source: 'photo_upload'`, not owned), button 已在衣橱; a 上装 photo over `{dress: satin-slip-dress}` → `{top: up:…}` and the render goes from look3 to base; the next session → an unsaved photo is gone and its `{outer: up:…}` dropped, a saved one stays on the rail and in the outfit.
- **Wardrobe 「去试衣间」:** takes the queue in order (photos included), empties the queue, then `applyTryOn`. With nothing to send: toast 「所选衣物暂不支持试穿」 and stay.
- Cases: `{}` + [black-blazer] → `{outer}`; `{top: basic-cami, bottom: straight-jeans}` + [satin-slip-dress] → `{dress}` only; `{dress}` + [striped-shirt] → `{top: striped-shirt}`; Look 1 items → `{top: basic-cami, bottom: straight-jeans, bag: brown-tote, shoes: white-sneakers}`. Menu category after `applyTryOn`: grey-hoodie, utility-jacket, knit-cardigan, black-blazer → `upper`; brown-blazer, taupe-coat → `outer`; pleated-skirt, maxi-skirt → `lower`; a 外套 photo → `outer`.

### 9.3 Choosing the on-body image (`pickRender`)

`screens/03-fitting.js:13-35`. Four renders exist (`data.renders`, in this order): `base`, `look1`, `look2`, `look3`. Score each render:
- For every selected slot: +3 if the render wears that exact item; −2 if it wears a different item in that slot; −2 if the slot is `dress` and the render wears a top or bottom, or the slot is `top`/`bottom` and the render wears a dress; otherwise −0.5.
- For every unselected slot among `outer`, `bag`, `acc`, `dress`, `shoes`: −0.3 if the render wears something there that `base` doesn't.
- Highest score wins; a tie keeps the earlier render (only a score higher by more than 1e-6 replaces the current best). `missing` = selected items the winner doesn't wear, in slot order `top, bottom, dress, outer, shoes, bag, acc`.

| Outfit | Result |
|---|---|
| `{}` | `base`, missing [] |
| `{outer: black-blazer}` | `look2` |
| `{dress: satin-slip-dress}` | `look3` |
| `{top: grey-hoodie}` | `base`, missing [grey-hoodie] |
| `{top: basic-cami, bottom: straight-jeans, shoes: white-sneakers, bag: brown-tote}` | `look1` |
| `{bag: black-handbag}` · `{shoes: black-pumps}` | `look2` |
| `{acc: gold-hoops}` | `look3` |
| `{outer: black-blazer, dress: satin-slip-dress}` | `look3`, missing [black-blazer] |
| `{shoes: white-sneakers, dress: satin-slip-dress}` | `base`, missing [satin-slip-dress] (known quirk, keep: §13.2) |

On 首页 the new image cross-fades in; the old one is removed after 450 ms; nothing happens if the render id is unchanged.

### 9.4 Checkout and placing an order

- **Totals** (`screens/08-checkout.js:18-24`): `goods = price × qty`; `ship` = 0 (标准快递) or 12 (顺丰次日达); `coupon` = 20 on every order; `total = max(0, goods + ship − coupon)`. Quantity 1–9.
- **Line title:** colour `short` + `cardName` (e.g. 「蓝色条纹衬衫」).
- **Delivery date:** today + `etaDays` (3 or 1), shown `M月D日 (周X)` with 周日…周六.
- **Money format:** one formatter everywhere, with thousands separators: 「¥239」, 「¥2,311」, 「- ¥20」 (§13.2 #12).
- Cases: striped-shirt ×1 standard → 239; ×1 express → 251; ×9 standard → 2,311; ×9 express → 2,323. With the clock at 2026-07-17 (a Friday): standard → 「7月20日 (周一)」, express → 「7月18日 (周六)」.
- **The checkout draft** (Zustand `drafts.checkout`, persisted): `productId`, `color`, `size`, `qty`, `addressId`, `shipping`, `payment`, `agree` (default true). 立即购买 on the 加入衣橱 sheet replaces the item part (qty 1). The 修改规格 sheet edits a copy and writes it back (and the product's colour/size choice) on 确定. `payment` starts from `settings.prefs.defaultPayment`; changing it at checkout doesn't change the default. `addressId` starts from the default address; on 收货地址, 设为默认, saving an address with 设为默认 on, and deleting the selected address also update it (as the prototype's `checkout.address`).
- **立即下单:** not agreed → the agreement row shakes (400 ms) and toasts 「请先阅读并同意《用户协议》和《隐私政策》」. No address → toast 「请先添加收货地址」 (§13.1). Otherwise, in demo mode: open the simulated cashier (900 ms 「正在调起{name}…」, then the confirm state). 取消 → toast 「已取消支付，订单未提交」; no API call has been made, so nothing exists. 确认支付 → 「支付处理中…」 while `orders.create(draft)` → `orders.pay(id, payment)` (returns `demo`) → `orders.confirmDemoPayment(id)` run, taking at least 900 ms → 「支付成功」. While processing, the cashier can't be closed. If any of the three calls fails: close the cashier, toast 「操作失败，请稍后重试」, and if `create` had succeeded, `orders.cancel` that order so no stray 待付款 order is left.
- **The created order** (mock; `createOrder`, `screens/08-checkout.js:227`). `create` makes it with status −1, `payBy` = now + 24 h (`M月D日 HH:mm`), eta 「付款后 3 天内」 and one logistics line 「订单已提交，等待付款」, hidden from `list` and `counts` until it is paid. `confirmDemoPayment` on an order that `create` made and nothing has paid yet applies the checkout outcome below; on any other unpaid order it applies §9.5's re-pay outcome. id `VT` + local `YYYYMMDDHHmmss`; added first; `shop` = brand + 「 官方旗舰店」; `title` = line title; `colorLabel` = colour short name; `paid` = total; after payment: status 0, progress 1, eta `M月D日`; steps 已下单 (now `M月D日 HH:mm`) · 已发货 (「待发货」) · 运输中 (「—」) · 预计送达 (the date); carrier 「待分配」; one logistics line 「订单已提交并完成支付（演示），等待商家发货」; the address is copied into the order. Then the item part of the checkout draft is cleared (`productId`, `color`, `size`, `qty`); `addressId`, `shipping`, `payment` and `agree` stay.
- **Wardrobe side effect of buying** (`VT.garments.purchase`, §9.17): the order records the active person (`avatarId`). Not in their wardrobe → added first (`shopping_plaza`, colour and size, **not owned**; a temporary try-on of it is the record that joins); already there → unchanged, owned or not. It becomes owned at 确认收货 (§9.5).
- **After 支付成功:** 「查看订单」 → `drop('checkout')`, then `openPath('/me/orders/o/:oid')` (fade). 「继续逛逛」 → `drop('checkout')`, then `jumpToTab('plaza')`.

### 9.5 Orders

| Status | Label | Filter | 我的订单 buttons (left · right) | 订单详情 |
|---|---|---|---|---|
| −1 | 待付款 | `unpaid` | 取消订单 · 去支付 | pay bar 立即支付, 取消订单 row, no tracker |
| 0 | 待发货 | `toship` | 提醒发货 · 查看详情 | tracker at step 1 |
| 1 | 已发货 | `shipping` | 查看物流 · 确认收货 | 确认收货 button (§13.2 #7) |
| 2 | 运输中 | `shipping` | 查看物流 · 确认收货 | 确认收货 button |
| 3 | 待收货 | `toreceive` | 查看物流 · 确认收货 | 确认收货 button |
| 4 | 已完成 | `all` only | 申请售后 / 售后进度 · 再次购买 | — |

- Filter `aftersale` = the order has a return (any status). `all` = everything. Unknown status label: 「处理中」. A return adds 「 · 售后中」 after the status label on list cards.
- Seed counts: 全部 4 · 待付款 1 · 待发货 0 · 运输中 1 · 待收货 1 · 售后 1.
- **ETA line** (`etaLine`, `screens/09-orders.js:17-22`): −1 → 「请在 {payBy} 前完成支付」 (fallback 「请在 24 小时内完成支付」, §13.2 #10); 3 → 「包裹已送达，请及时确认收货」; 4 → 「已签收，感谢你的购买」; otherwise 「预计 {eta} 送达」.
- **Tracker** (`progress`, `:27-35`): `done = clamp(progress ?? status + 1, 1, 4)`; dots at 10.3 / 37.58 / 63.76 / 89.33 % of the card width; the fill runs from the first dot to dot `done` (`POS[done−1] − POS[0]`). Cases: progress 2 → 27.28 %; progress 4 → 79.03 %; status 0 without progress → done 1, fill 0.
- **Pay an unpaid order** (「去支付」, 「立即支付」; `pay` then `confirmDemoPayment`): status 0, progress 1, eta 「3 天内」, `steps[1]` = 已发货 / 「待发货」, logistics line 「订单已支付（演示），等待商家发货」 added first; no wardrobe change. Cancelling the cashier toasts 「已取消支付，订单仍在「待付款」」.
- **Confirm receipt** (after its dialog 「确认收货？」 / 「请确认已收到商品且无质量问题。」 line break 「确认后订单将完成，这件衣服会在衣橱中标记为已拥有（演示）。」): status 4, progress 4, `steps[3]` = 已签收 / now, logistics line 「你已确认收货，交易完成」 added first; the garment becomes owned for the order's person (`received`, §9.17); toast 「已确认收货，已标记为已拥有」. Case: VT20260715092418 → 本人's striped-shirt owned, still one record, source still `shopping_plaza`.
- **Cancel** (unpaid only, after its dialog): the order is deleted; toast 「订单已取消」; on 订单详情, go back.
- **提醒发货:** toast 「已提醒商家尽快发货」, no change **[demo]**.
- **Copy waybill:** spaces removed (SF1428 6630 9921 → SF142866309921); toast 「运单号已复制」, or 「运单号：{no}」 if the clipboard fails. Same pattern for the order number (「订单编号已复制」 / 「订单编号：{id}」).

### 9.6 Returns

- Stages: 提交申请 · 商家审核 · 寄回商品 · 退款完成 (换货: 换货完成). A step is done when its index < `stage`. New returns start at stage 1 and never advance in the demo.
- Form: type 退货 (shown 「退货退款」, default) or 换货; reason required, one of 「尺码不合适」「颜色 / 款式与预期不符」「质量问题」「不想要了（7 天无理由）」 (missing → toast 「请选择申请原因」); note optional, at most 120 characters, trimmed; up to 3 photos (§9.9).
- Submit: time = now `M月D日 HH:mm`; back one screen; toast 「{退货|换货}申请已提交（演示）」. Withdraw (after its dialog): delete the return; the screen becomes the empty form; toast 「售后申请已撤销」.
- The unsent form is kept per order in memory (survives leaving and coming back, not a reload).

### 9.7 AI stylist replies (mock)

- Rules from `data.chatReplies`, checked in array order; the first rule with any keyword contained in the message (plain substring, no normalisation) wins:
  1. 拍了 刚拍 拍的 上传了 刚上传 上传的 → `upload` plan
  2. 购物广场 这件 → `focal` plan
  3. 已有 衣橱 我的衣服 现有 → `owned` plan
  4. 正式 通勤 上班 会议 面试 → text + looks [look2]
  5. 裙 连衣裙 约会 优雅 女人味 → text + looks [look3]
  6. 休闲 舒适 轻松 日常 周末 → text + looks [look1]
  7. 冷 降温 保暖 秋 冬 → text + wardrobe set [taupe-coat, brown-sweater, straight-jeans, white-sneakers]
  - none → `data.chatFallback`, text only.
- **Plans** (`screens/07-stylist.js`, `plan`), built when the message arrives from the active person's garments (§9.17). A plan is messages: an AI text and an outfit (`wardrobe`: product ids, or `up:{uid}` for a photo), then, for missing pieces, another AI text and products to buy (`buy`: product ids). The cards show ✓ from the current ownership whenever they are drawn.
  - In the templates: `{who}` is 你 for 本人, else the name in corner brackets (「爸爸」); `{label}` is the occasion's 通勤装 / 约会穿搭 / 休闲穿搭, or empty; `{need}` names the missing slots (上衣, 下装, 鞋子); `{list}` joins names as a、b和c, and `{quoted}` does the same with each name in corner brackets (「a」和「b」).
  - Privacy: with `privacy.wardrobeAI` off, every plan is one text: 「你在设置里关闭了「允许 AI 造型师读取衣橱」，我暂时看不到你的衣服。」 line break 「可以在「设置 → 隐私与安全」中重新开启。」
  - Occasion, the first that matches: 通勤 上班 正式 会议 面试 职场 → 通勤装, favouring 西装 衬衫 西裤 通勤 职场 利落 知性 质感; 约会 聚会 晚餐 派对 → 约会穿搭, favouring 裙 优雅 约会 温柔 气质 缎面 细跟 法式; 休闲 周末 日常 咖啡 出游 旅行 轻松 → 休闲穿搭, favouring T恤 牛仔 针织 休闲 百搭 日常 板鞋 卫衣 舒适.
  - Outfit (`compose`): a dress, or a top and a bottom, then an outer layer, shoes and a bag, shown in the order outer · top · dress · bottom · shoes · bag (an accessory focus goes last). Each slot takes an owned garment first, then the one whose name and tags hold the most favoured words, then wardrobe order. A dress is picked for 约会 when no top or bottom is the focus; otherwise only when a top and a bottom can't both be found and the focus isn't a top or bottom. Missing: the top and bottom (without a dress) and the shoes; an outer layer or a bag is never missing.
  - Products to buy (`suggest`): for each missing slot, products of that category in `data.plazaOrder` that the person doesn't own, never the focus; the ones they have without owning (saved or tried on) first, then by the favoured words; `max(1, ⌊4 / slots⌋)` per slot, 4 at most.
  - `owned` (用我现有的衣服…): only the person's owned, saved garments.
    - None owned: 「{who}的衣橱里还没有标记为「已拥有」的衣服，我暂时没法只用已拥有的衣服来搭配。」 line break 「可以在个人衣橱里打开一件衣服，选择「标记为已拥有」。」 line break 「也可以先看看这些单品（需要另外购买）：」 + products to buy for a top, a bottom and shoes.
    - A top or bottom missing: 「只用{who}已拥有的衣服，还搭不出完整的一套{label}：还缺少{need}。」 line break 「已拥有的单品放在下面，缺少的可以看看这些（需要另外购买）。」 + the outfit (if it has anything) + products to buy.
    - Otherwise: 「好的，我只用{who}已拥有的衣服搭了一套{label}：」 line break 「{a} + {b} + …。」 line break 「这几件都已拥有，可以直接去试衣间试穿。」 + the outfit. Without shoes, then 「{who}已拥有的衣服里还没有{need}，可以看看这些（需要另外购买）：」 + shoes to buy.
  - `focal` (帮我搭配这件…): the product the sentence means is the focus, with the person's other saved garments (owned first).
    - Finding it: a garment word (the first of 连衣裙 裙 裤 衬衫 T恤 背心 毛衣 针织衫 卫衣 上衣 外套 西装 大衣 夹克 开衫 鞋 包 耳饰 配饰 in the message) scores 4 when the name has it, else 2 for the same category; a colour (蓝 白 黑 米 棕 灰 驼 咖 燕麦 焦糖 金) 3 in the name, else 2 in the first colour's name, else 1 in another colour's; +1 when the person saved it without owning it; +1 when viewed (浏览记录). Ties: the one viewed more recently, then catalogue order. With neither word (「这件」 alone): the product viewed last.
    - Not found: 「我没找到你说的这件单品。可以在购物广场打开它的商品详情，再来问我怎么搭配。」
    - Found: 「以「{product}」为主角，从{who}的衣橱里挑了{list}来搭配：」 (nothing to add: 「以「{product}」为主角，先放在下面：」), then line break and 「这几件都已拥有。」 (all owned), 「这几件都还没有标记为已拥有。」 (none owned) or 「其中{quoted}需要另外购买，其余都是{who}已拥有的。」 (the pieces not owned, the focus included); + the outfit. Missing pieces: 「还缺少{need}，可以看看这些单品：」 + products to buy.
  - `upload` (我刚拍了一件…): the newest garment photo (temporary ones first) of the category the garment word names, else the newest photo, is the focus, with the person's saved garments (owned first). It is never taken as owned.
    - No photo: 「还没有找到{who}拍的衣服。可以在首页点「拍照」，拍一件或从相册上传，我再帮你搭配。」
    - Found: 「用{who}拍的「{photo}」做主角，搭配了{list}：」 (nothing to add: 「用{who}拍的「{photo}」做主角，先放在下面：」); when the photo isn't owned, line break 「这件还没有标记为已拥有；演示版暂无它的上身图，试穿时会加入当前搭配。」; when other pieces aren't owned, line break 「{quoted}也还没有标记为已拥有。」; + the outfit. Missing pieces: 「还缺少{need}，可以看看这些单品：」 + products to buy.
- A photo message gets the fixed reply in `screens/07-stylist.js:179` + looks [look2].
- The reply arrives 1100 ms after sending (200 ms with reduced motion); the UI shows the typing bubble until then. Sending is never blocked; parallel replies each get their own bubble.
- The thread keeps at most 60 messages: the first 4 (the seed) plus the newest 56, always (§13.2 #22).
- Cases: 「我想要更正式一些」 → 4; 「换成裙装搭配」 → 5; 「根据我已有的衣服来搭配」 → 3; 「周末出游穿什么好？」 → 6; 「降温保暖穿什么好？」 → 7; 「晚餐约会穿什么好？」 → 5; 「我想穿裙子去上班」 → 4 (order wins); 「用我现有的衣服搭一套通勤装」 → 3, not 4; 「帮我搭配这件在购物广场看到的蓝衬衫」 → 2; 「我刚拍了一件外套，帮我搭配」 → 1; 「hello」 → fallback.
- Plan cases (seed, 本人 unless noted):
  - 「用我现有的衣服搭一套通勤装」 → 通勤装: black-blazer + ribbed-tank + beige-trousers + white-sneakers, all owned, nothing to buy.
  - 「帮我搭配这件在购物广场看到的蓝衬衫」 → striped-shirt with knit-cardigan, pleated-skirt, white-sneakers and brown-tote; 「其中「条纹亚麻衬衫」和「棕色皮质托特包」需要另外购买，其余都是你已拥有的。」
  - 爸爸, 「根据我已有的衣服来搭配」 → taupe-coat + oxford-shirt + beige-trousers, all owned; then 「「爸爸」已拥有的衣服里还没有鞋子，可以看看这些（需要另外购买）：」 and white-sneakers, black-pumps, strappy-heels.
  - A 外套 photo from 首页, then 「我刚拍了一件外套，帮我搭配」 → the photo with ribbed-tank, pleated-skirt, white-sneakers and brown-tote; the text says the photo and 「棕色皮质托特包」 aren't marked owned.
  - `privacy.wardrobeAI` off → the privacy text for all three plans.
- Saving a look stores `savedAt`; saved looks list newest first. The look sheet's 「保存搭配」 only saves (never unsaves) and toasts 「已保存到「历史造型」」 every time.

### 9.8 Wardrobe

- Every entry is a garment record of one person (§9.17). New entries go first: photos (添加衣物, and 首页's 加入衣橱), 加入衣橱 from 商品详情 and purchases (both `shopping_plaza`, not owned). Re-adding a product that is already there only updates its colour and size (no move, no duplicate, ownership kept) and the sheet reads 「已在你的衣橱中」.
- **Ownership.** ✓ marks owned garments only. 「标记为已拥有」 / 「取消已拥有标记」 (item sheet and long-press menu) set `isOwned` and nothing else (`wardrobe.setOwned`, proposed in §9.17); toasts 「已标记为已拥有」 (check icon) / 「已取消已拥有标记」. 确认收货 is the only other way (§9.5).
- Any garment can be deleted (「删除」, after its dialog). Deleting also removes it from the try-on queue, that person's 搭配集 and the 首页 outfit.
- Upload: name at most 16 characters, prefilled with the file name without extension (cut to 16); blank → 「我的衣物」; category default 上衣. It is saved as `photo_upload`, not owned. After saving: filter back to 全部, search cleared, grid scrolled to the top, toast 「已添加到衣橱」.
- 加入衣橱 → 「去衣橱看看」 also resets the filter to 全部 and clears the search, so the new item is visible (§13.2 #15).
- The wardrobe heart (`fav`, 喜欢) is separate from 我的收藏 and from ownership, and has no toast.
- Photos can be queued and tried on: they join the 首页 outfit without an on-body image (the item sheet notes 「演示版暂无这件衣物的上身图，试穿时会加入当前搭配」).
- Cases: seed 本人 → 21 garments, 8 with ✓; 标记为已拥有 on w2 (striped-shirt) → ✓, source still `shopping_plaza`, still 21; 取消已拥有标记 → no ✓; hearting it changes `fav` only.

### 9.9 Images from the user

One shared pipeline in `src/features/images`: check type → check size → decode → downscale → `canvas.toBlob('image/jpeg', quality)`. Never upscale (except the profile square). Rely on the browser's EXIF orientation handling and test with a rotated phone photo.

| Use | Output | Prototype |
|---|---|---|
| Avatar photos (正面 / 背面 / 左侧 / 右侧全身, 面部生活照) | longest side ≤ 900 px, JPEG 0.82, a Blob in IndexedDB, measured first (§9.16) | `screens/02-avatar.js` (`takePhoto`) |
| Avatar video frames (4 per video) | ≤ 480 px, JPEG 0.82, Blobs in IndexedDB (§9.16) | `screens/02-avatar.js` (`analyzeVideo`) |
| Wardrobe garment | ≤ 520 px, JPEG 0.82 | `screens/06-wardrobe.js:215` |
| 首页 garment photo (从相册上传, the phone camera, or a 拍摄衣服 frame) | ≤ 520 px, JPEG 0.82 | `screens/03-fitting.js` (`readImage`), `camera.js` (`capture`) |
| Stylist photo | ≤ 420 px, JPEG 0.8, a Blob in IndexedDB (§9.16) | `screens/07-stylist.js` (`shrink`) |
| Return evidence (max 3) | ≤ 360 px, JPEG 0.78, a Blob in IndexedDB (§9.16) | `screens/09-orders.js` (`shrinkPhoto`) |
| Profile photo | centre square, 320 × 320, JPEG 0.82, a Blob in IndexedDB (§9.16) | `screens/10-profile.js` (`squarePhoto`) |
| 拍照找同款 | preview only (≤ 520 px) | `screens/04-plaza.js` |

Photos of the user and the photos they send never go into `localStorage` as data URLs. That covers the avatar photos and video frames, the profile photo, return evidence and stylist photos. They are Blobs in IndexedDB, and the state refers to them by key (`{ media: key }`, §9.16). In the prototype, garment photos are still JPEG data URLs: saved photo garments in the state, temporary ones in `sessionStorage` (§9.17).

Errors, the same for every picker (§13.2 #21, #30): not `image/*` → 「请选择图片文件（JPG / PNG 等）」 (avatar picker: 「请选择图片文件（JPG / PNG / HEIC 等）」); over 25 MB → 「图片超过 25MB，请换一张」; decode failure → 「无法读取这张图片，请换一张」 (avatar picker: 「无法读取这张图片，请换一张试试」). While a photo is processed its slot shows 「处理中…」 (avatar slots: 「检测中…」).

### 9.10 Camera (video try-on preview)

- `getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`. The front camera preview is mirrored; a track reporting `environment` is not.
- States: intro (permission explainer) → wait (「正在请求摄像头权限…」) → live, or error. On live, focus moves to ✕. The switch button appears only when live and `enumerateDevices()` finds 2+ cameras; it switches to a camera other than the current one and toasts 「已切换摄像头」 once the new stream plays.
- Errors (`camera.js`, `errorCopy`):

| Cause | Title | Body |
|---|---|---|
| `NotAllowedError`, `PermissionDeniedError`, `SecurityError` | 没有获得摄像头权限 | 请在浏览器地址栏左侧的「网站设置」中允许使用摄像头，然后点击重试。 |
| `NotFoundError`, `DevicesNotFoundError`, `OverconstrainedError` | 未检测到可用的摄像头 | 请确认设备已连接摄像头，或换一台带摄像头的设备打开原型。 (§13.1) |
| `NotReadableError`, `TrackStartError` | 摄像头正被占用 | 摄像头可能正被其他应用使用，请关闭后重试。 |
| no `navigator.mediaDevices.getUserMedia` | 当前环境不支持摄像头 | 摄像头需要在 HTTPS 或 localhost 环境下使用，请用 README 中的本地服务器方式打开原型。 (§13.1) |
| anything else | 无法开启摄像头 | 请稍后重试。 |

  The prototype's embedded-preview error (「当前页面无法使用摄像头」) is dropped.
- **Stop rule:** every track stops and the video is cleared when the layer closes for any reason (✕, 暂不开启, 返回试衣间, Esc, browser back, any navigation), when 首页 is hidden (tab switch), and on `visibilitychange` to hidden. Every start, retry and switch stops the previous stream first. Keep a `closed` flag: a stream that resolves after closing is stopped at once.
- **拍摄衣服** (首页 → 拍照; `camera.js`, `capture`): on touch devices (`pointer: coarse`) a file input with `capture="environment"` opens the phone's own camera. Elsewhere an in-app layer starts `getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })` at once (no intro): 「正在打开摄像头…」, then the live preview with a shutter (mirrored only when the track reports `user`), or an error from the table above with 「重试」 and 「从相册上传」. The shutter takes the current frame, unmirrored, through §9.9's 首页 garment rule and closes the layer. The stop rule above applies to this layer too.

### 9.11 Timings

Waits that stand for server work live in the mock; waits that are purely visual live in the UI. Reduced motion uses the second value, as in the prototype.

| What | Duration | Where it lives |
|---|---|---|
| Avatar generation (simulated stages) | 6400 ms (1200); stage = ⌊t / total × 4⌋; result 450 ms after the last stage | mock `avatar.generate` / `job` (stage only, `progress: null`) |
| 智能检测 rows | first after 300 ms, then every 260 ms (all at once) | UI |
| Video recording | 3-2-1 countdown (1), then 10 s; the turn step moves every 2.5 s | UI (MediaRecorder) |
| Stylist reply | 1100 ms (200) | mock `stylist.send` |
| Merchant / service chat reply (订单详情, 帮助与客服) | 800 ms | mock `support.send` |
| Store chat reply (商家消息) | 900 ms; no reduced-motion variant | mock `storeChats.send` (§9.14) |
| Cashier opening (「正在调起…」) | 900 ms (150) | UI (demo cashier) |
| Payment processing | 900 ms (200) minimum | UI waits for the mock calls and at least this long |
| Login completes → next step | 500 ms after the success toast | UI |
| 跳过 → toast on 首页 | 300 ms | UI |
| Try-on toast after the jump | 420 ms | UI |
| Verification-code countdown | 59 s, 1 s steps | UI |
| Toast | 2200 ms; 3600 ms with an action button; 2800/3000 ms for the try-on 「演示版暂无…」 toasts | UI |

### 9.12 Collections and counts

- 我的 stats: 我的衣橱 = the active person's saved garments (temporary ones don't count); 我的收藏 = hearted products + saved looks (`favCount`); 浏览记录 = history entries. Seed: 21 / 8 / 6.
- Favourites list in the order first hearted (re-hearting keeps the old position, as the prototype's map does). Saved looks newest first.
- **History:** record a view every time the product page is shown (first open, back from checkout, returning to its tab); one entry per product, newest first, at most 30. Store `viewedAt`; group as 今天 / 昨天 / `M月D日` at render time (§13.2 #23). Seed entries are placed relative to the first run: today 09:12 and 09:05, yesterday 21:40 and 21:31, three days ago (twice), so the demo looks the same as the prototype on day one.
- Hearting anywhere (购物广场, 商品详情, 我的收藏) toasts 「已收藏」 / 「已取消收藏」 and updates every heart for that product on screen, including `aria-pressed` and the 「收藏」/「取消收藏」 label. A heart never makes a product owned (§9.17).
- **Stores and store chats** (§9.14):
  - The 商家消息 badge on 购物广场 is the sum of `unread` over all store chats: seed 1 (ZARA). It shows the number, 「99+」 above 99, nothing at 0; the button's aria-label is then 「商家消息，{n} 条未读」 instead of 「商家消息」.
  - The store bar is 「全部」 plus the favourite stores, seed 5 (ZARA, Soft Archive, Linea Studio, Mono Atelier, Forma); 「已收藏 {n}」 on the 管理 sheet counts them.
  - 「在售 {n} 件」 is the number of catalogue products of that store, whatever chip is active: ZARA 4 · Soft Archive 6 · Linea Studio 6 · Mono Atelier 3 · Forma 8 · Reformation 1 · Linea Denim 1.
  - 商家消息 lists the chats with at least one message, newest activity first: seed ZARA, Mono Atelier, Forma.

### 9.13 Avatar, setup and session

- **Status:** `none` → `ready` after generation or `useDemo()`; regenerating makes it `ready` with a new `generatedAt`. New photos or a video stay a draft until a generation finishes, so the upload flow no longer makes an avatar `stale` (only data saved before 21 Oct 2026 can still be `stale`).
- **Generation** (`startGeneration`, `simulate`, `finish` in `screens/02-avatar.js`):
  - Call `avatar.generate()` on the draft materials and poll `avatar.job()` every 500 ms.
  - Show the job's `stage` (素材解析中 → 身体模型生成中 → 面部特征生成中 → 细节优化中 → 创建完成) in an indeterminate ring with 「{n}/5」. Show a percentage only when `progress` isn't null, and never a time estimate (§9.16).
  - The demo mock runs the stages over 6400 ms (§9.11), and the UI says 「模拟进度 · 演示版未接入建模服务」.
  - Back while it runs → dialog 「停止生成？」 → `avatar.cancel()` and the toast 「已取消生成」. Every way of cancelling toasts it, the 我的形象 layer included.
  - Failure → 「生成没有完成」, the stages done so far with ✓ and the failed one with ✕, then 「重试」 (a new job on the same materials) or 「返回检查」.
  - One job at a time: repeated taps start nothing.
  - Demo samples → the toast 「已使用示例素材生成演示分身」.
- **Finish buttons by context:**
  - First launch → 「进入虚拟试衣间」 (`resetTo('/home')`, sets `setupDone`).
  - 新建数字分身 → the same label. It drops the flow, opens 首页 and toasts 「已切换到「{name}」」.
  - From the upload screen in 我的形象 → 「完成」 (back to `/me/avatar`, toast 「数字分身已更新」) and 「去首页试穿」 (drops the upload screen, then `jumpToTab('home')`; §13.2 #5).
  - 重新生成 on 我的形象 → 「完成」 (stay, toast 「数字分身已更新」) and 「去首页试穿」.

  创建完成 also offers 「修改名称」, 「重新生成」 and 「更换素材」, and labels the preview 「2D 形象预览 · 演示版」.
- **启动页:** 「开始体验」 → `resetTo('/home')` if the avatar is `ready`, otherwise push `/welcome/avatar`. 「登录」 → login sheet; on success the avatar becomes ready via `useDemo()` if needed, then `resetTo('/home')`. 「跳过」 on the upload screen → `useDemo()`, `resetTo('/home')`, then 300 ms later 「已使用示例数字分身，可在「我的 → 我的形象」中更换」.
- **Login sheet** **[demo]**: phone prefilled 「13800138888」; 「获取验证码」 fills the code from `auth.requestCode` (246810) with toast 「演示验证码已自动填入」 and a 59 s countdown 「{n}s 后重发」 → 「重新获取」; 「登录」 has no validation in the demo, toasts 「登录成功（演示账号）」 and continues 500 ms later. From 设置 it only refreshes 设置.
- **Logged out by default.** Only 设置 reads it (「登录 / 注册」 ↔ 「退出登录」).
- **Body data:** height 130–210, weight 30–150, shoe 33–46 (inclusive; checked in that order with 「身高请填写 130–210 cm」, 「体重请填写 30–150 kg」, 「鞋码请填写 33–46」); size one of XS–XL.
- **Profile edit:** name trimmed, required (「昵称不能为空」), at most 12; bio at most 20; gender 女 / 男 / 保密; nothing is stored until 「保存」, which goes back and toasts 「资料已保存」.
- **Addresses:** name required (「请填写收货人」); phone `^1\d{10}$` for a new address or when typed while editing (「请输入 11 位手机号」), stored masked (`139****5678`); address at least 6 characters after trimming (「请填写完整的详细地址」), at most 48; tag 家 / 公司 / 学校 (default 家). Exactly one default while the book isn't empty: turning the default on moves it; deleting the default makes the first address the default; the first address added becomes the default. The book can be empty (§13.2 #32).

### 9.14 Stores, favourite stores and store chats

Added with the 购物广场 stores redesign (prototype commit 514de38). Screens: SCREENS.md, 购物广场 and 商家消息.

- **Favourite stores** (`s.storeFavs`, `screens/04-plaza.js:253-268`): an ordered list of store ids; seed `zara, soft-archive, linea-studio, mono-atelier, forma`. Any of the seven stores can be favourited (search rows, the store sheet, 管理). Favouriting puts the store first. Unfavouriting removes it and, when it was the chosen store (`plaza.store`), sets the chosen store back to `'all'`. Toasts 「已收藏店铺「{name}」」 / 「已取消收藏「{name}」」. Cases: seed + favourite reformation → [reformation, zara, soft-archive, linea-studio, mono-atelier, forma]; then unfavourite reformation → the seed order; chosen store mono-atelier + unfavourite mono-atelier → chosen store `'all'`.
- **Store chats** (`s.storeChats`, `screens/14-messages.js`), demo behaviour of the mock:
  - One thread per store, with an unread count, its last activity and its messages (mine or the store's, text, display time). The seed is in SCREENS.md (商家消息).
  - The 商家消息 list holds the threads with at least one message, newest activity first.
  - Opening a thread sets its unread count to 0. A thread with no messages shows the greeting 「您好，欢迎光临 {full name}，请问有什么可以帮您？」 without storing it.
  - Sending stores my message at once (time `HH:mm`), storing the greeting first when the thread was empty, and makes the thread the newest. 900 ms later the store's reply is stored the same way. The reply adds 1 to the unread count unless the thread is still open on screen.
  - Reply rules, checked in this order; the first rule with any keyword contained in the message (plain substring, no normalisation) wins:
    1. 发货 什么时候 多久 到货 快递 → 「亲，现货商品下单后 48 小时内发货，一般 2–3 天送达～」
    2. 尺码 码 大小 身高 体重 合身 → 「亲，可以参考商品页的「尺码表」；告诉我身高体重，也可以帮您推荐尺码哦～」
    3. 优惠 券 便宜 活动 折扣 打折 → 「收藏店铺的顾客可领取 ¥30 新品券，下单时自动抵扣（演示数据）～」
    4. 退 换 → 「支持 7 天无理由退换，签收后可在「我的订单」中申请～」
    5. 面料 起球 洗 材质 → 「面料正常穿着不易起球，建议冷水轻柔手洗或干洗～」
    - none → 「收到～客服稍后为您详细解答（演示回复）。」
  - Quick questions under the thread: 「什么时候发货？」「尺码怎么选？」「有优惠券吗？」.
  - Cases: 「什么时候发货？」 → 1; 「尺码怎么选？」 → 2; 「有优惠券吗？」 → 3; 「可以退货吗？」 and 「可以换颜色吗」 → 4; 「这件会起球吗？」 → 5; 「退货多久能退款？」 → 1 (order wins); 「手机号码多少」 → 2 (「码」 alone matches); 「多少钱？」 and 「你好」 → fallback.
- The merchant chat on 订单详情 and the service chat (§9.11) are separate from the store chats: nothing is stored, and they never appear in 商家消息 (§13.2 #36).

### 9.15 Digital avatars (切换角色)

Added with the 首页 update (20 Oct 2026; `js/store.js` `VT.store.avatars`). Screens: SCREENS.md 首页, 上传照片 / 视频 (`new` context), 个人衣橱, 我的形象.

- **An avatar owns** its photos, status and generation time (`avatar`), body data (`body`), its garments (the wardrobe and this session's temporary garments, each with its own ownership, §9.17), its 首页 outfit and its try-on queue. **Shared by all avatars:** the avatar preferences (`avatarPrefs`, in `Settings`), the profile, favourites and saved looks, browsing history, orders and returns (an order names the avatar it was bought for), addresses, the checkout draft, the stylist chat, favourite stores and store chats, settings, the 首页 category and the backdrop (`fitScene`). The product behind a garment (image, store, price) is shared too.
- **Seed:** 本人 (`id: 'me'`, `self: true`), named after the profile nickname, and, since 个人衣橱 V2 (8bf9527), three demo people, 伴侣, 爸爸 and 妈妈 (`data.seedRoles`), each with their own wardrobe (and its ownership, §9.17), 搭配集 and body data. 本人 can't be renamed here (the nickname is edited in 我的资料) or deleted.
- **Create** (切换角色 → 新建数字分身: a name, required, at most 8 characters, else 「请填写名称」 → the upload screen in the `new` context → generate): the avatar is created only when generation finishes, with its photos or video frames (or the demo samples), status `ready`, an empty wardrobe, outfit and queue and the default body data (165 cm · 48 kg · M · 37); it becomes the active avatar. Cancelling or leaving before that creates nothing.
- **Switch:** the chosen avatar becomes active, and every screen reads its data: the 首页 outfit, render and rail, 个人衣橱, every ✓, the counts on 我的, 我的形象, the stylist's plans and wardrobe sets, the wardrobe side effect of buying (§9.4) and 加入衣橱. Toast 「已切换到「{name}」」.
- **Rename / delete** (我的形象, for an avatar other than 本人): rename → 「名称已保存」; delete, after its dialog, removes the avatar and all its data (its temporary garments too), switches back to 本人 and toasts 「已删除「{name}」，已切换回本人」.
- 「重新体验首次启动」 switches back to 本人 first; 「清除已上传的照片」 clears every avatar's photos; 「重置演示数据」 restores the seed avatars and clears every temporary garment.
- **[demo]** Every avatar renders as the preset model, because avatar generation is simulated (§9.13): a second avatar looks the same on 首页 and in 我的形象, and the 切换角色 sheet says so (「演示版的数字分身均使用示例模特形象」).
- Cases: seed → [本人, 伴侣, 爸爸, 妈妈], active 本人, wardrobe 21; create 「家人」 → those four + 家人, active 家人, wardrobe 0, outfit `{}`, every 首页 category 「还没有…」; switch to 本人 → wardrobe 21 and the outfit she had; 加入衣橱 while 家人 is active → only 家人's wardrobe grows; delete 家人 while active → the four, active 本人. Ownership (§9.17): white-sneakers is owned by 本人 (✓), only saved by 伴侣 (no ✓), and not in 妈妈's wardrobe; a photo 本人 took on 首页 shows only in her rail.


### 9.16 Avatar materials: checks, consent and storage

Added with the avatar onboarding upgrade (21 Oct 2026; `js/screens/02-avatar.js`, `js/media.js`). Screen: SCREENS.md 2.

- **Inputs.** Either five photos, 正面全身 `front`, 背面全身 `back`, 左侧全身 `left`, 右侧全身 `right` and 面部生活照 `face`, or one video of about 10 s (6–20 s accepted). The two are alternatives: generation needs one complete set.
- **Photo checks**, in the browser and in this order. The slot shows the first failure.
  1. Type `image/*`, at most 25 MB, decodable (§9.9 errors). HEIC works only where the browser decodes it.
  2. Resolution: short side ≥ 300 px, else 「分辨率太低，请上传更清晰的原图」.
  3. Orientation, full-body slots only: width ≤ 1.05 × height, else 「全身照请竖拍，让头到脚都在画面中」.
  4. Light, at ≤ 256 px. Mean luminance (0.299 R + 0.587 G + 0.114 B) must be ≥ 0.28, else 「光线过暗，请在明亮、均匀的光线下拍摄」. It must also be ≤ 0.94, with at most 30 % of pixels above 248, else 「画面过曝，请避开强光直射」.
  5. Sharpness: the variance of the 4-neighbour Laplacian at ≤ 256 px must be ≥ 30, else 「画面模糊，请对焦后重新拍摄」.
  6. Duplicates: a 64 × 64 luminance print, zero-mean and unit-length. A dot product ≥ 0.96 means the same picture, and the later slot gets 「与「{label}」是同一张照片，请换一张」.
     - An 8 × 8 average hash isn't enough: it flagged a back view and a side view against the same wall.
     - With the prints, different angles score ≤ 0.85, and re-saved, resized or brightened copies ≥ 0.987.
  - The thresholds were calibrated on the onboarding kit. Its reference photos measure sharpness 118–251 and brightness 0.83–0.88; its blurry example measures 1.1 and its dark one 0.20.
- **Video checks:**
  - Type `video/*`, at most 200 MB, decodable.
  - Length read from the file. WebM recordings report `Infinity`, so seek to the end; the recorder's own clock is the fallback. 6–20 s.
  - Short side ≥ 360.
  - Four frames at 10 / 36 / 62 / 88 %: average brightness ≥ 0.28 and sharpness ≥ 12.
  - The error copy is in SCREENS.md 2.
- **What is never claimed.** Body completeness, the face, the background, the real angles and video stability need an AI service. Their rows show 无法检测 with the reason.
  - Demo samples are never checked: every row shows 无法检测.
  - The AI results will come from `avatar.check` (draft). The demo can only simulate one, labelled 演示: `?mockFail=avatar.check`.
- **Gates.** 下一步 needs all five photos, or the video, to pass. 开始生成建模 needs no failed check. 「演示：使用示例照片」 / 「演示：使用示例素材」 is the labelled demo bypass **[demo]**.
- **Consent.** Before the first photo or video, once per version (`mediaConsent = { v: 1, at }`). The sheet states:
  - the purpose;
  - on-device storage, and how to delete;
  - that a third-party AI service will process the media (its name comes with the formal agreement), and that the app will ask again before sending anything.

  The checkbox isn't pre-ticked, and 不同意 uploads nothing. With a backend, the consent is recorded on the server (`privacy.recordMediaConsent`, draft) before the first transmission (§14).
- **Storage.**
  - Photos (≤ 900 px, JPEG 0.82) and video frames (≤ 480 px) are Blobs in IndexedDB, referenced by key from the avatar. Never data URLs in `localStorage`.
  - The same store (`js/media.js`) has held the user's other photos since 21 Oct 2026: the profile photo, return evidence and the photos sent to AI 造型师 (§9.9).
    - They are referenced as `{ media: key }`: `profile.photo`, `returns[oid].photos[]` and a chat message's `img`.
    - Unlike the avatar's, they are shared by every avatar (§9.15).
    - Every reader goes through `VT.media.src(ref)`, `VT.ui.profilePhoto` included.
  - The video file stays in memory (an object URL) during the visit and isn't kept.
  - An unfinished visit's drafts are deleted when another visit starts, and again at the next start-up.
    - Start-up deletes every key the saved state doesn't refer to: an unfinished visit's drafts, an unsent return's photos. It never deletes a key the page made since it opened.
    - A photo the state stops referring to is deleted at once: a replaced profile photo, an evidence photo removed with ✕, the photos of a withdrawn return, and a chat photo that falls off the 60-message cap.
  - **Migration.** Start-up moves photos that earlier versions saved as data URLs into IndexedDB: avatar photos as `{ src }`, and until 21 Oct 2026 the profile, evidence and chat photos as bare strings. Each place gets its own blob.
    - The new references go in through a store update, after the blobs are written. The app loads its own copy of the state while the migration waits, so changes made to the copy read at the start would be lost.
    - That is what happened to the first version of the avatar-photo migration, which never took effect.
  - 清除已上传的照片 deletes them all, including the photos of an unsent return, and removes the chat's photo messages. Deleting an avatar deletes its media.
  - The web build keeps Blobs in IndexedDB the same way until they're uploaded, then uses the server's URLs (§5).
- **Generation.** A job with the stages parse → body → face → refine → done. `progress` exists only when the service reports it (§9.13). One job runs at a time. A failure keeps the materials, and 重试 starts a new job on them.
- Cases:

| Input | Result |
|---|---|
| The kit's dark example (640 × 640) | 光线过暗 (0.20 < 0.28) |
| The kit's blurry example | 画面模糊 (1.1 < 30) |
| The back photo uploaded again as 右侧全身 | 同一张照片 |
| A 3.0 s WebM | 「视频只有 3.0 秒，请拍摄约 10 秒」 |
| A 10.4 s WebM | 通过 (10.3 s read from the file) |

### 9.17 Garments and ownership (`VT.garments`)

Added 21 Oct 2026 (`js/garments.js`; its header comment describes the record). Screens: SCREENS.md 首页, 购物广场, 个人衣橱, AI 造型师, 商品详情, 结算下单, 我的订单, 我的收藏. One model for the whole app: every screen reads and changes the same records, only through it. Port it as `src/features/garments`, shared by the mock and the hooks; no screen keeps its own list or rule.

- **A record** is one garment of one person: `uid`, `avatarId`; a catalogue product (`p` = productId, `merchantId` = its store) or a photo (`custom {src, name, cat}`); `source`; `isOwned`; `isSavedToWardrobe` / `isTemporary`; `fav` (the wardrobe's 喜欢), `color`, `size`, `addedAt`, and `fromUpload` on a photo saved before this model. The product behind it (image, store, price) is shared. A person has at most one record per product.
- **`source`** is how it entered the app, and never changes: `manual` (already there, or entered by hand: the seed's owned garments), `shopping_plaza` (加入衣橱 or 试穿 from a product, or a purchase), `photo_upload` (拍照 / 相册 on 首页, 添加衣物 in 个人衣橱).
- **`isOwned`**: the person physically owns it. Only a confirmation sets it: their 标记为已拥有 (取消已拥有标记 clears it) or 确认收货 of their order. Never the source, saving, a heart (收藏 or 喜欢), a try-on or a checkout. It is the only thing ✓ means; changing it keeps the source and adds no record.
- **Groups** (`group`): `owned` when `isOwned`; else `shopping_plaza`, `photo_upload`, or `unclassified` (`manual`, not owned). Only ✓ is shown: no screen labels, splits or filters by group.
- **Saved and temporary.** Saved garments are the person's wardrobe: persisted, the 个人衣橱 grid, 我的's count. Temporary ones last for this browser session only (`sessionStorage['vt-garments-temp-v1']`): photos taken on 首页 and products tried on that the person hasn't got. 首页's rail and AI 造型师's upload plan see them; 个人衣橱 and 我的 don't. 加入衣橱 (首页 for a photo, 商品详情 for a product), or buying the product, moves the same record (same `uid`) into the wardrobe. Deleting a person drops their temporary garments; 重置演示数据 drops them all.
- **What a person can try on** (`all`): their temporary garments, newest first, then their wardrobe in its own order; a temporary product saved in the meantime shows once. **Outfit refs** (`ref` / `fromRef`): a product id, or `up:{uid}` for a photo, temporary or saved.
- **Changes:**
  - 加入衣橱 on 商品详情 (`addProduct`): the person's record for that product gets the colour and size (ownership stays); without one, their temporary try-on of it joins the wardrobe; else a new `shopping_plaza` record, not owned. `isNew` picks 「已加入衣橱」 or 「已在你的衣橱中」.
  - 试穿 of a product they haven't got (`adopt`, inside `applyTryOn` and 首页's outfit sync): a temporary `shopping_plaza` garment.
  - A photo (`addPhoto`): temporary from 首页, saved from 添加衣物; `photo_upload` and not owned either way. 加入衣橱 on 首页 (`keep`) saves the temporary one.
  - A purchase (`purchase`): a new saved `shopping_plaza` record with colour and size, not owned, unless the person has the product (then nothing changes); a temporary try-on of it is the record that joins. The order keeps `avatarId`.
  - 确认收货 (`received`): the order's person (`avatarId`; 本人 for the seed orders) owns it now. A record deleted in the meantime comes back, owned.
  - 标记为已拥有 / 取消已拥有标记 (`setOwned`): `isOwned` only.
  - 删除 (个人衣橱): the record, its queue slot, its place in that person's 搭配集 and its 首页 outfit slot.
- **✓ on a product** (`ownsProduct`): the active person has a saved, owned record of it. It drives 购物广场's and 商家店铺's cards, 我的收藏, 商品详情's 「已拥有」, AI 造型师's cards and 穿搭瞬间's 相关单品. The mark is `OwnMark` (§5.7), `aria-hidden`; the element's label adds 「，已拥有」.
- **Seed** (`data.seedWardrobe`, `data.seedRoles`): 本人 has 21 garments (`w1`–`w21`). 8 are owned (`manual`): knit-cardigan, black-blazer, pleated-skirt, white-sneakers, black-cardigan, ribbed-tank, beige-trousers, basic-cami. The other 13 are `shopping_plaza`, not owned; striped-shirt's order VT20260715092418 is on its way. 伴侣, 爸爸 and 妈妈 own theirs (`manual`) except those they saved (`shopping_plaza`): 伴侣's utility-jacket and white-sneakers, 爸爸's brown-blazer, 妈妈's satin-slip-dress and black-handbag.
- **Older saved states** (prototype only; the web build has none): at start-up a record without `isOwned` is upgraded in place: `owned` → `manual`, owned; `collected` → `shopping_plaza`; `purchased` → `shopping_plaza`, owned if an order for that product is 已完成; `uploaded` → `photo_upload`. The old 我的上传 list (`vt-fit-uploads-v1`, shared by everyone) moves once into the active person's temporary garments, leaving out the photos already saved.
- Cases: seed 本人 → 8 of 21 owned; 加入衣橱 brown-blazer → first, `shopping_plaza`, `merchantId` zara, not owned; again → still one record; buy it → still one, not owned, order `avatarId` me; 确认收货 of VT20260715092418 → striped-shirt owned, one record, source `shopping_plaza`; 试穿上身 grey-hoodie → temporary `shopping_plaza`, not owned, not in the wardrobe; a 首页 photo → temporary `photo_upload`, not owned; its 加入衣橱 → saved, not owned, no temporary garment left; white-sneakers → owned by 本人, saved by 伴侣, none for 妈妈.
- **Proposed contract change (needs the user's approval).** `docs/contract/` still describes the old wardrobe and is not changed. It would gain:
  - `WardrobeSource` = `'manual' | 'shopping_plaza' | 'photo_upload'` (was `'owned' | 'collected' | 'purchased' | 'uploaded'`).
  - `WardrobeItem` gains `isOwned`, `isSavedToWardrobe`, `isTemporary`, `avatarId` and `merchantId` (catalogue items: the product's `storeId`).
  - `wardrobe.setOwned(avatarId, uid, owned)`. `wardrobe.remove` no longer rejects any item (删除 works on every garment) and takes it off that avatar's outfit.
  - `Order` gains `avatarId`; `orders.confirmReceipt` marks that avatar's garment owned, re-creating it if it was deleted.
  - Temporary garments stay on the client (session storage) until 加入衣橱: `wardrobe.add` for a product, `wardrobe.upload` for a photo.
  - Also needed for AI 造型师: a `{role: 'wardrobe'}` message holds garment refs (a product id or a photo), and a new `{role: 'buy', productIds}` message holds the products to buy.

---

## 10. Quality bar

| Area | Requirement |
|---|---|
| Visual | Every screen in §8 at 390 × 844 in `?frame=iphone` differs from the prototype's `?app=<id>` screenshot by at most 2% of pixels (Playwright `maxDiffPixelRatio: 0.02`, per-pixel `threshold: 0.2`). Both sides: seed data, clock frozen at 2026-07-17 10:00, time zone `Asia/Shanghai`, `deviceScaleFactor: 2`. |
| Behaviour | Every applicable check in `reference/acceptance/flow_test_v2.py` ported to Playwright with the same name (§10.1), plus the navigation tests in §11 Phase 1. |
| Browsers | E2E in Chromium and WebKit at 390 × 844 (mobile, touch). Overflow suite at 360 × 740 and 430 × 932: no horizontal scroll, no clipped text. |
| Unit coverage | `src/features` and `src/app/nav` at least 90% of lines; every rule in §9 has its cases. |
| Console and network | Zero console errors or warnings during E2E. Zero requests to any other origin (a Playwright route guard fails the test). |
| Accessibility | axe: no serious or critical violations on any screen. |
| Performance | Initial JS at most 180 KB gzip (secondary screens are lazy-loaded per route); no layout shift from images; 首页 interactive within 2.5 s on a mid-range Android phone over 4G (check manually with Chrome DevTools throttling in Phase 7). |
| Code | `pnpm typecheck`, `pnpm lint` clean; no `any` without a comment saying why; no `// TODO` without a phase or question attached. |

### 10.1 Porting the acceptance checks

- Keep each check's name as the test title (so results line up with the prototype's run), e.g. `test('plaza heart toggles', …)`. Templated names expand per tab, e.g. `AC3: tab → plaza`.
- Read the current screen from the visible screen root's `data-screen`, not from `VT.liveApp`.
- Skip the checks that test the showcase board and simulator: 「showcase has 5 primary phones in order」, 「captions numbered 1–5」, 「subtitle per spec」, 「board phone opens simulator on 首页」, 「启动页 reachable as a flow screen」. The 「mobile: …」 checks become the default (the web app is always full-screen).
- The flows that start from the simulator's side list start from a URL instead.
- Use the fixtures in `reference/acceptance/fixtures/`:
  - `me_full.jpg`, `me_face.jpg`, `my_jacket.jpg`, `not_image.txt`;
  - `body_back.webp`, `body_left.webp`, `body_right.webp`: the onboarding kit's angle photos;
  - `too_dark.webp`, `too_blurry.webp`: its bad examples;
  - `turn_10s.webm`, `turn_3s.webm`: 10.4 s and 3 s canvas recordings made with Chromium's MediaRecorder.

  The camera checks run in Chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream` and the camera permission granted.
- Run the suite with `reducedMotion: 'reduce'` (faster timers), except the transition tests.
- On 21 Oct 2026 the 首页 loading change added 「首页 preloads the body renders after the page loads」 and 「首页 rail loads off-screen thumbnails lazily」 (a last block in a fresh context; the robot then had 136 checks).
- The prototype's test has 195 checks: 175 before the garment ownership change (below), which were 162 after the avatar onboarding upgrade below, plus 8 for 商家店铺 and 5 for the personal photos (below). The 首页 update (20 Oct 2026) replaced 「首页 rail lists only garments with a render」 with 「首页 rail lists image-ready garments first」 and 「selected garment without a render shows until tapped off」 with 「garment without a render can be tapped off」 (both renamed again by the ownership change); the prototype sends the garment through `VT.tryOn`, so the web test sends it from a screen instead (个人衣橱's 「立即试穿」 on striped-shirt works before 商品详情 exists). It also added nine checks that run last, in a fresh 390 × 844 context with the fake camera and empty storage: 「首页 header: 切换角色 · 切换场景 · 开启视频试衣」, 「拍照 opens 拍摄衣服 / 从相册上传」, 「upload → 我的上传, tried on, not in the wardrobe」, 「加入衣橱 saves the upload once」, 「我的上传 lasts for the browser session」, 「拍摄衣服 captures a photo (getUserMedia)」, 「切换场景 changes the backdrop」, 「新建数字分身: its own empty wardrobe, now active」, 「切换角色 back to 本人 restores her wardrobe」. Port them as one serial file, like the 购物广场 stores block.
- The 购物广场 stores block (11 checks, 514de38) runs last in the prototype, in the mobile context, from the seed with setup done. Its checks build on each other's state (a store favourited from search and removed again in 管理, the ZARA chat read and answered), so port them as one serial file that starts from `devtools.reset()` with `setupDone`: 「plaza: store bar = 全部 + favourite stores only」, 「plaza: 全部 shows every store, with the platform banner」, 「plaza: a favourite store shows only its products」, 「plaza: category narrows the chosen store」, 「plaza: search covers every store and product」, 「plaza: favouriting a store from search adds it to the bar」, 「plaza: 管理 removes a store from the bar」, 「plaza: chat icon opens 商家消息」, 「plaza: store chat replies and clears unread」, 「plaza: back from 商家消息 → 购物广场」, 「product brand opens its store sheet」. The store reply takes 900 ms even with reduced motion (§9.11).
- On 21 Oct 2026 the avatar onboarding upgrade made these changes (the robot then had 162 checks):
  - **First launch.** 「photo upload previews」 became 14 checks:
    - 「选择上传方式: 照片上传 or 视频上传, 跳过 kept, 4-step progress」
    - 「consent before any upload (purpose, on-device, deletion, third-party AI); 不同意 uploads nothing」
    - 「consent stored」
    - 「照片上传: 4 full-body angles + 面部生活照, each with an example; tips; 正确 / 错误示范」
    - 「下一步 disabled until the photos pass」
    - 「real checks: too dark, blurry and the same photo twice → 需重拍 with the fix」
    - 「delete a photo → its slot shows the example again」
    - 「replacing them: 5 × 通过, 下一步 enabled」
    - 「photos stay on this device in IndexedDB, never in localStorage」
    - 「智能检测: what the browser measured 通过, AI-only checks 无法检测」
    - 「the materials are previewed before generating, each replaceable」
    - 「生成建模: 5 stages, labelled as simulated, no percentage or time estimate」
    - 「创建完成: a 2D preview (not called 3D), name, 修改名称 / 重新生成 / 更换素材」
    - 「the avatar keeps its 5 photos as IndexedDB references」
  - **我的形象.** 「demo samples: no check is claimed as passed」 follows 「我的形象 → 上传照片」.
  - **新建数字分身.** 「新建数字分身: its own empty wardrobe, now active」 became 「新建数字分身: one new avatar, its own empty wardrobe, now active」, done with a double tap. 「the new avatar is listed in 切换角色」 follows it.
  - **A new 11-check block, 创建数字分身,** in a fresh 390 × 844 context with the fake camera, then a 360 × 740 one:
    - 「视频上传: the turn shown in 4 steps, 8 capture conditions, 上传视频 + 开始拍摄」
    - 「a 3-second video fails its length check; 下一步 stays disabled」
    - 「a 10-second video passes (length read from the file)」
    - 「the video plays back before it is submitted」
    - 「开始拍摄 (MediaRecorder): 3-2-1, a 10 s timer with the turn steps, then checked like an upload」
    - 「智能检测 (video): 4 frames + play; format/length and light measured, the rest 无法检测」
    - 「failed generation shows where it stopped; 重试 (same materials) → 创建完成」
    - 「a video avatar keeps 4 frames on the device, not the video」
    - 「a failed check (simulated AI result, labelled 演示) names the fix; replacing the photo clears it」
    - 「隐私与安全 → 清除已上传的照片 deletes the avatar media from the device」
    - 「360 px: every step of 创建数字分身 fits the width」
  - The recording check needs MediaRecorder and a fake camera (Chromium). In WebKit, run the upload path and expect the fallback.
- Later on 21 Oct 2026 the profile photo, return evidence and stylist photos moved to IndexedDB (§9.16). That added 5 checks, and with 商家店铺's 8 the robot had 175:
  - 「change profile picture」 now expects an object URL (`blob:`) instead of a data URL.
  - **A new 5-check block** runs last, in a fresh 390 × 844 context with empty storage. It opens screens by URL (`?app=profile`, `?app=returns&oid=…`, `?app=stylist`). 隐私与安全 is opened in the app, so an unsent return draft survives the trip. Each check builds on the one before, so port it as one serial file:
    - 「头像, 售后凭证 and AI 造型师 photos stay on this device in IndexedDB, never in localStorage」: a profile photo replaced once, two evidence photos with one removed by ✕, then a stylist photo. That leaves 3 blobs and no `data:image` in `localStorage`.
    - 「头像, 售后凭证 and AI 造型师 photos load from IndexedDB after a reload」
    - 「data URLs saved by an earlier version move to IndexedDB at start-up (avatar photos too)」: the test writes an old state (avatar photos as `{ src }`, the rest as bare data URLs) and reloads. The web build has no such legacy data, so it can skip this one.
    - 「清除已上传的照片 also deletes the 头像, 售后凭证 (sent or not) and AI 造型师 photos」: it includes an unsent return draft's photo.
    - 「撤销申请 deletes its evidence photos」
- The garment ownership change (21 Oct 2026, §9.17) renamed 11 checks and added 20, so the robot has 195:
  - **Renamed.** 「首页 rail lists image-ready garments first」 → 「首页 rail: no 推荐 / 我的上传; 本人's 上装 in one list, ✓ on the owned ones」; 「garment without a render can be tapped off」 → 「garment without a render can be tapped off (it stays in the rail this session)」; 「collected item at top of wardrobe」 → 「加入衣橱: top of the wardrobe, from 购物广场 with its store, not owned: no ✓, no source label」; 「wardrobe queue bar」 → 「wardrobe queue bar; a queued tile is numbered, not ✓」; 「uploaded garment saved」 → 「添加衣物: saved as a photo garment, not owned (no ✓)」.
    - In the 首页 block: 「首页 header: 切换角色 · 切换场景 · 开启视频试衣」 → 「首页 header: 切换角色 · 切换场景 · 开启视频试衣; no 推荐 / 我的上传 tabs」; 「upload → 我的上传, tried on, not in the wardrobe」 → 「upload → the one rail, tried on: temporary, not owned (no ✓), not in the wardrobe」; 「我的上传 lasts for the browser session」 → 「the photo lasts for the browser session (still temporary)」; 「加入衣橱 saves the upload once」 → 「加入衣橱 saves the upload once, still not owned」, which now runs after the reload.
    - In the 个人衣橱 V2 block: 「category filters follow the person (妈妈 连衣裙 1, 本人 全部 15)」 → 「category filters follow the person (妈妈 连衣裙 1, 本人 全部 21)」; 「long-press: 立即试穿 · 加入搭配集 · 分享 · 删除 (not the item sheet)」 → 「long-press: 立即试穿 · 加入搭配集 · 取消已拥有标记 · 分享 · 删除 (not the item sheet)」.
  - **Added to the main run:** 「the selection border and ✓ are separate (worn dress: border only; worn owned blazer: both)」, 「each category lists the person's garments of that kind from every source (VT.garments)」, 「a product tried on from elsewhere joins the rail: temporary, from 购物广场, not owned, not in the wardrobe」 and 「加入衣橱 twice, then bought: one record, still not owned (until 确认收货)」. The third needs a product 本人 hasn't got (grey-hoodie, from 商品详情), so the web test runs it from Phase 4.
  - **Added to the 首页 block:** 「外套 lists the photo with the wardrobe's own garments (owned ✓ and not), no source headings」 after the upload, and 「per person: 本人 owns the white sneakers (✓), 伴侣 only saved them, 妈妈 has none; the photo stays 本人's」 last.
  - **Added to the 个人衣橱 V2 block:** 「个人衣橱: ✓ exactly on the owned garments; hearts apart (♥ without ✓ and ✓ without ♥); no source labels」, 「标记为已拥有: ✓ on the tile, source kept, no new record; the heart still toggles on its own」, 「取消已拥有标记 takes the ✓ away again」.
  - **A new 11-check block, 衣物归属,** in a fresh 390 × 844 context with empty storage, opened at `?app=stylist`. Each check builds on the ones before (the seed order received, then 爸爸, then a photo), so port it as one serial file. It reaches 订单详情 and 商品详情, so it runs whole from Phase 5; Phases 3 and 4 run the checks they can (§11).
    - 「AI 造型师 look cards: ✓ on the items 本人 owns, nothing on the others」
    - 「用我现有的衣服…: owned garments only, each with ✓」
    - 「a 购物广场 product as the focus: the blue shirt without ✓, owned pieces with ✓, the ones to buy named」
    - 「确认收货 confirms ownership: the striped shirt is owned now (one record, source kept)」
    - 「…and AI 造型师's card for it shows ✓ at once」
    - 「爸爸 owns no shoes: his owned outfit (✓), the gap said, shoes to buy apart (no ✓)」
    - 「a photo they took as the focus: in the outfit, not taken as owned (no ✓), said so」: the robot adds the photo with `VT.garments.addPhoto`; the web test takes it with 首页's 拍照.
    - 「去试衣间试穿 wears the photo with the rest on 首页」
    - 「购物广场: ✓ on exactly the products 本人 owns (a heart is not ownership)」
    - 「商品详情 says 已拥有 only for a product 本人 owns」
    - 「我的 counts the saved wardrobe only (temporary garments are not in it)」
  - 「首页 rail loads off-screen thumbnails lazily」 keeps its name; it now first makes grey-hoodie, oxford-shirt and bow-blouse temporary garments, so 上装 has 11 tiles: 8 eager · 3 lazy.

### 10.2 Visual baselines

`pnpm visual:baseline` (script `scripts/visual/capture-prototype.ts`) serves `reference/prototype/` on a free port and screenshots each `?app=<id>&<params>` URL from §8 into `e2e/visual/__baseline__/<id>.png` (the second variants are `avatar-profile.png`, `returns-progress.png`; the first `returns` row is `returns.png`). `pnpm visual` screenshots the same screens from the web app and compares with `expect(screenshot).toMatchSnapshot('<id>.png')` (`snapshotPathTemplate` points at `__baseline__`). **Never run the visual suite with `--update-snapshots`**: that would overwrite the prototype baselines with the app's own screenshots. Commit the baselines.

The baselines Phase 0 captured predate the 购物广场 stores redesign (prototype commit 514de38): `plaza` changed with it, `orderlist` too (the unpaid order's shop is now 「ZARA 官方旗舰店」), and `messages` is new. Re-capture them all from 514de38 or later, adding the `messages` row (`?app=messages`), before Phase 3 compares anything. The 首页 update (20 Oct 2026) changed `fitting` (and its inset crop); it was re-captured in the same change. The garment ownership change (21 Oct 2026, §9.17) changed `fitting`, `plaza`, `wardrobe`, `stylist`, `profile`, `favorites` and `product` (with their inset crops; `product` also picked up the 商家店铺 brand row); they were re-captured from a clean export of 1c50a8c (5ea5dda).

**Inset check.** `pnpm visual` also renders each screen at `--top-inset: 0` in a 390 × 800 viewport and compares it with the same baseline cropped to y ≥ 44 (same threshold). This catches top offsets that were converted wrongly (§4.2). 首页 and 启动页 have full-bleed photos that don't move, so review those two by eye.

---

## 11. Phases

Each phase ends with every check below green, the report, the `CLAUDE.md` tick, one commit, and a stop. Before each phase, re-read it and the sections it points to. Acceptance checks are named as in `flow_test_v2.py` (§10.1).

`pnpm verify` skips the visual and acceptance checks of screens that aren't built yet: a phase adds the screens it builds to `BUILT` in `e2e/screens.ts`, and its report lists what was skipped (decided 19 Oct 2026).

### Phase 0 · Scaffold

1. Scaffold the Vite React + TypeScript project with pnpm in a temporary folder, then copy its files into the repo root. Never run the scaffolder in the repo root: it offers to empty the folder, which would delete `docs/` and `reference/`. Add the §3 dependencies.
2. TypeScript `strict` plus `noUncheckedIndexedAccess`; path alias `@/` → `src/`. ESLint and Prettier; exclude `reference/` and `e2e/visual/__baseline__/` everywhere. The repo already exists, so skip `git init`; extend its `.gitignore` with `node_modules`, `dist`, `fonts-src`, Playwright reports and results, `reference/acceptance/out`.
3. Copy the images to `public/assets/`, the fonts and `@font-face` rules, `tokens.css` and the reset from `base.css` into `src/styles/` (§5.1, §5.2, §5.6).
4. `index.html` and the viewport rules from §4.2. `AppShell` renders the phone-width column (desktop backdrop) and supports `?frame=iphone`.
5. `.env`: `VITE_DEMO=true`, `VITE_MOCK_LATENCY=150-350`. `.env.test`: `VITE_MOCK_LATENCY=0`.
6. `package.json` scripts, matching `CLAUDE.md`: `dev`, `build` (runs `fonts:check` first), `preview`, `typecheck`, `lint`, `format`, `test`, `e2e`, `visual`, `visual:baseline`, `fonts`, `fonts:check`, `verify` (typecheck + lint + test + build + e2e + visual).
7. `scripts/fonts/check.ts`: create `src/styles/fonts/charset.txt` once from the prototype (same character collection as `reference/prototype/tools/subset_fonts.py`), then report characters in `src/` that are missing from it. Until Phase 6 it only warns; from Phase 6 it fails the build.
8. Vitest + Testing Library with one smoke test. Playwright config: projects for Chromium and WebKit at 390 × 844 (`isMobile`, `hasTouch`, `deviceScaleFactor: 2`), `timezoneId: 'Asia/Shanghai'`, a route guard that fails on any request to another origin, and a console-error collector that fails the test.
9. `scripts/visual/capture-prototype.ts` and `pnpm visual:baseline` (§10.2). Commit the baselines.

Done when:
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
- [ ] `pnpm e2e` smoke passes in Chromium and WebKit: `/` loads, no console errors, no cross-origin requests.
- [ ] `e2e/visual/__baseline__/` holds one PNG per row of §8 (25).
- [ ] `pnpm dev` shows the empty shell in a phone-width column; `?frame=iphone` shows the 9:41 status bar.

### Phase 1 · App shell and navigation

Build §4.3 with placeholder screens: every route renders a placeholder with the screen's Chinese title (from SCREENS.md), its `data-screen`, a long list (to test scroll memory) and buttons that push the next screen of each flow.

1. `parseStack` / `buildPath`, the transition rule, `useNav` (`push`, `back`, `switchTab`, `jumpToTab`, `openPath`, `drop`, `resetTo`) and History bookkeeping (§4.3).
2. `TabHost` with keep-alive, `LaunchHost`, push/pop/fade transitions, focus management.
3. The real `TabBar` (icons from §5.5) and `SubHeader`.
4. `OverlayHost` with `Sheet`, `Dialog`, `Layer`, `Toast` and the overlay history rule.
5. `session` store with `setupDone`; the `/`, `/welcome` redirects.

Done when:
- [ ] Unit tests: every grammar row, round trips, invalid paths → longest valid prefix, transition derivation, `drop`.
- [ ] E2E: every §8 route deep-links to the right `data-screen`; tapping through then pressing in-app back or browser back lands on the same screen; browser forward re-pushes; after a deep link, in-app back goes to the parent; tab switches are instant and bring back the other tab's stack and scroll position; re-tapping the active tab scrolls to the top; a contextual jump fades and resets that tab to its root; browser back and Esc close the top overlay and return focus; reduced motion makes navigation instant.
- [ ] Acceptance checks on placeholders: 「AC3: tab → …」, 「AC2/4: … has one bar with the 5 tabs」, 「tab switch to … is instant」, 「… has no back button (primary)」, 「secondary screen hides tab bar」, 「first launch (no setup) opens 启动页」, 「AC1: relaunch after setup opens 首页」.

### Phase 2 · Data layer and domain rules

1. Copy the contract (§7) into `src/api/`. Port `data.js` to `src/api/mock/seed.ts`.
2. Mock `db`, handlers, latency, error injection, `devtools.reset`.
3. Query keys and hooks for every API method. Zustand stores `fitting`, `drafts`, `ui` with `persist`.
4. Every rule in §9 as a function in `src/features/`, with the listed test cases.
5. The §5.8 components (`Skeleton`, `ErrorState`, `EmptyState`, button busy state, rollback toast). From Phase 3 on, every screen ships with its loading, error, empty and not-found states.

Done when:
- [ ] All §9 cases pass.
- [ ] A seed-parity test loads `reference/prototype/js/data.js` in a Node `vm` with a fake `window` and checks that `seed.ts` matches it (catalog, try-on categories against `fitCatsAll`, renders, looks, stores, favourite stores, store chats, season picks, seed orders and return, the seed wardrobes with their ownership (`own`, `saved`), addresses, shipping, payments, FAQs, chat).
- [ ] Mock round trips (Vitest, latency 0): checkout creates an order → it appears under the right filter → pay → 待发货; confirm receipt → 已完成 and the garment owned; submit and withdraw a return; address add/edit/delete keeps exactly one default; adding to the wardrobe puts the item first, not owned, and adding it again keeps one record; 标记为已拥有 keeps the source; favouriting a store puts it first and unfavouriting removes it; a store chat message gets its reply, which counts as unread unless the thread is still open (§9.14); `reset()` restores the seed.
- [ ] Coverage at least 90% of lines in `src/features` and `src/api/mock`.

### Phase 3 · The five tab screens

首页, 购物广场, 个人衣橱, AI造型师, 我的, with all their sheets, at full fidelity (SCREENS.md). 购物广场's sheets include the store sheet, 管理 (「收藏的商家」) and 「秋日灵感穿搭」; its secondary screen 商家消息, with the 「消息通知」 sheet and the store chat sheet (which the store sheet's 「联系商家」 also opens), is built here too. Includes the image pipeline (§9.9) for garment upload, the stylist photo and 首页's 拍照, and the garment model (§9.17) with `OwnMark` on every garment card these screens show. 首页 includes 切换场景, the one rail of the person's garments, the 拍照 menu, 确认衣物照片, temporary garments and 加入衣橱; 切换角色's sheet is built here and its 新建数字分身 flow in Phase 4 with the upload screen (add the `avatars/new` route, §13.1 #13, to the grammar then). The camera layer and the 拍摄衣服 layer wait for Phase 6: until then the camera button opens the layer's permission explainer only, and 拍摄衣服 opens the file picker.

Done when:
- [ ] Visual diff ≤ 2% for `fitting`, `plaza`, `wardrobe`, `stylist`, `profile`, `messages`.
- [ ] Acceptance: 「outfit change: blazer → look2 render」, 「outfit change: dress → look3 render」, 「the selection border and ✓ are separate (worn dress: border only; worn owned blazer: both)」, 「首页 rail: no 推荐 / 我的上传; 本人's 上装 in one list, ✓ on the owned ones」, 「each category lists the person's garments of that kind from every source (VT.garments)」, 「honest toast for garments without imagery」, 「garment without a render can be tapped off (it stays in the rail this session)」 (both sent from 个人衣橱 until 商品详情 exists, §10.1), 「首页 header: 切换角色 · 切换场景 · 开启视频试衣; no 推荐 / 我的上传 tabs」, 「拍照 opens 拍摄衣服 / 从相册上传」, 「upload → the one rail, tried on: temporary, not owned (no ✓), not in the wardrobe」, 「外套 lists the photo with the wardrobe's own garments (owned ✓ and not), no source headings」, 「the photo lasts for the browser session (still temporary)」, 「加入衣橱 saves the upload once, still not owned」, 「切换场景 changes the backdrop」, 「per person: 本人 owns the white sneakers (✓), 伴侣 only saved them, 妈妈 has none; the photo stays 本人's」, 「plaza search」, 「plaza scroll kept after switching tabs」, 「plaza heart toggles」, 「plaza: store bar = 全部 + favourite stores only」, 「plaza: 全部 shows every store, with the platform banner」, 「plaza: a favourite store shows only its products」, 「plaza: category narrows the chosen store」, 「plaza: search covers every store and product」, 「plaza: favouriting a store from search adds it to the bar」, 「plaza: 管理 removes a store from the bar」, 「plaza: chat icon opens 商家消息」, 「plaza: store chat replies and clears unread」, 「plaza: back from 商家消息 → 购物广场」, 「wardrobe filter 下装」, 「wardrobe queue bar; a queued tile is numbered, not ✓」, 「添加衣物: saved as a photo garment, not owned (no ✓)」, 「个人衣橱: ✓ exactly on the owned garments; hearts apart (♥ without ✓ and ✓ without ♥); no source labels」, 「标记为已拥有: ✓ on the tile, source kept, no new record; the heart still toggles on its own」, 「取消已拥有标记 takes the ✓ away again」, 「stylist draft kept across tabs」, 「AI stylist reply with looks」, 「look → 首页 with outfit」, and from the 衣物归属 block (§10.1) 「AI 造型师 look cards: ✓ on the items 本人 owns, nothing on the others」, 「用我现有的衣服…: owned garments only, each with ✓」, 「a 购物广场 product as the focus: the blue shirt without ✓, owned pieces with ✓, the ones to buy named」, 「爸爸 owns no shoes: his owned outfit (✓), the gap said, shoes to buy apart (no ✓)」, 「a photo they took as the focus: in the outfit, not taken as owned (no ✓), said so」, 「去试衣间试穿 wears the photo with the rest on 首页」, 「购物广场: ✓ on exactly the products 本人 owns (a heart is not ownership)」, 「我的 counts the saved wardrobe only (temporary garments are not in it)」.
- [ ] Hearts, filters (including the chosen store), favourite stores, store chats, the outfit, the try-on queue and ownership (✓) survive a reload; temporary garments survive it too, but not a new browser session.

### Phase 4 · Launch, product and checkout flows

启动页 and the login sheet, avatar upload and generation (first-launch context), 商品详情 (its brand row opens the store sheet from Phase 3), 结算下单, the payment sheet and the after-payment navigation.

Done when:
- [ ] Visual diff ≤ 2% for `onboarding`, `avatar`, `product`, `checkout`.
- [ ] Acceptance: 「开始体验 → avatar creation」, the 14 first-launch avatar checks and 「non-image rejected」 (§10.1), 「AC1: setup complete → 首页 (virtual fitting room)」, 「setupDone stored」, the 创建数字分身 block (§10.1), 「plaza → product details」, 「AC6: back from product → plaza」, 「加入衣橱 → 个人衣橱 tab」, 「加入衣橱: top of the wardrobe, from 购物广场 with its store, not owned: no ✓, no source label」, 「plaza tab returns to its own history (product page)」, 「立即购买 → checkout」, 「checkout address sheet lists address book」, 「pay → 订单详情 (in 我的 → 我的订单)」, 「加入衣橱 twice, then bought: one record, still not owned (until 确认收货)」, 「finished checkout removed from plaza history」, 「product brand opens its store sheet」, 「a product tried on from elsewhere joins the rail: temporary, from 购物广场, not owned, not in the wardrobe」, 「商品详情 says 已拥有 only for a product 本人 owns」, 「新建数字分身: one new avatar, its own empty wardrobe, now active」, 「the new avatar is listed in 切换角色」, 「切换角色 back to 本人 restores her wardrobe」. 商品详情 「试穿上身」 on a garment without a render (e.g. grey-hoodie) gives the 「演示版暂无…」 toast, selects it on the 首页 rail as a temporary garment (no ✓) and keeps it there after it is tapped off. An unknown `pid` shows 「没有找到这个商品」 and records nothing in 浏览记录.

### Phase 5 · 我的 flows

我的订单, 订单详情 (merchant chat, order info, pay bar), 物流跟踪, 申请退换货, 我的形象 (upload in its own context, 重新生成, body data, preferences), 编辑资料, 收货地址, 支付方式, 消息通知, 设置, 隐私与安全, 帮助与客服, 我的收藏, 浏览记录.

Done when:
- [ ] Visual diff ≤ 2% for every remaining §8 row.
- [ ] Acceptance: 「new order 待发货」 (it reads 订单详情, built in this phase), 「我的 → …」 and 「… → back → 我的」 for every row on 我的, 「order details → back → 我的订单」, 「我的订单 → back → 我的」, 「我的 → 待收货 filter」, 「待收货 shows the delivered order」, 「全部 shows all orders」, 「order details 运输中」, 「订单详情 → 物流跟踪」, 「tracking timeline」, 「物流跟踪 → back → 订单详情」, 「订单详情 → 申请退换货」, 「return evidence photo added」, 「return submitted → back on details」, 「merchant chat replies」, 「order info sheet」, 「去支付 moves order out of 待付款」, 「我的 tab remembers its own history」, 「edit profile saved」, 「change profile picture」, 「我的形象 → 上传照片」, 「demo samples: no check is claimed as passed」, 「generate → back to 我的形象」, 「重新生成 stays on 我的形象」, 「avatar preference toggle」, 「address added」, 「我的收藏 lists favourites」, 「浏览记录 includes viewed products」, 「确认收货 confirms ownership: the striped shirt is owned now (one record, source kept)」, 「…and AI 造型师's card for it shows ✓ at once」, and the whole 衣物归属 block as one serial file (§10.1). An unknown `oid` shows 「没有找到这个订单」.

### Phase 6 · Device features and polish

1. The camera layer (§9.10): explainer, live preview, front/back switch, every error message, stop rules.
2. Share with clipboard fallback; iOS input-zoom fix; desktop column; reduced-motion pass.
3. Latency and failure runs (the §5.8 states exist since Phase 3): run the whole E2E suite once with `VITE_MOCK_LATENCY=150-350`, and once with `?mockFail=*` on a sample of mutations to see each roll back with its toast.
4. Font pipeline: `pnpm fonts` works with source fonts in `fonts-src/`; `fonts:check` now fails the build.
5. Manual device pass, reported as a table: iPhone Safari, iPhone WeChat, Android Chrome, Android WeChat × (safe areas, input zoom, photo picker from camera and gallery, camera preview and switching, back button, toolbars and `100dvh`, fonts). Use `pnpm dev --host` on the LAN; the camera needs HTTPS outside `localhost`, so use an HTTPS tunnel for phone camera tests.

Done when:
- [ ] Acceptance: 「camera preview live (getUserMedia)」, 「camera stops on close」, 「拍摄衣服 captures a photo (getUserMedia)」, plus new tests: the camera stops on tab switch, on navigation and when the page is hidden.
- [ ] The latency run and the failure run pass.
- [ ] The device table is filled in, with any issue either fixed or listed in the report.

### Phase 7 · QA and hardening

Done when:
- [ ] Every ported acceptance check passes in Chromium and WebKit; every §8 row passes the visual diff; the overflow suite passes at 360 × 740 and 430 × 932.
- [ ] axe: no serious or critical violations; zero console errors; zero cross-origin requests.
- [ ] Initial JS ≤ 180 KB gzip; the manual 首页 timing check from §10 is recorded.
- [ ] `README.md` (install, scripts, env flags, demo tools, how the mock works, how to plug in the backend) and `docs/DEVIATIONS.md` (every intentional difference from the prototype, with the reason) are written.
- [ ] `pnpm verify` passes from a clean clone.

---

## 12. Definition of done

- All phases ticked in `CLAUDE.md`, one commit each.
- Every row of §10 met, and `pnpm verify` passes from a clean clone.
- Side by side with the prototype on a phone, a reviewer can't tell them apart, except for the browser's own chrome and the differences in `docs/DEVIATIONS.md`.
- No dependency outside §3 without approval; no request to another origin; nothing from Google.
- Swapping the mock for a real backend means writing `src/api/http/` and changing `src/api/client.ts`, with no screen code changes.

---

## 13. Open decisions

For Walker to confirm. Until then, build the default; nothing here blocks a phase.

### 13.1 Defaults to confirm

| # | Decision | Default |
|---|---|---|
| 1 | New copy that the prototype doesn't have: loading and errors (§5.8) 「加载失败，请检查网络后重试」 · 「重试」 · 「操作失败，请稍后重试」; not-found states 「没有找到这个商品」 · 「没有找到这个订单」 (with a back button); checkout without an address: row 「添加收货地址」, toast 「请先添加收货地址」; the corrected fallback 「请在 24 小时内完成支付」 | Use it |
| 2 | Tab switches create browser history entries, so browser back after a tab switch returns to the previous tab | Yes |
| 3 | Shared links open directly, even before first-launch setup | Yes |
| 4 | On desktop the app is a centred phone-width column on a dark backdrop | Yes |
| 5 | Simulated waits keep the prototype's timings (§9.11) | Yes |
| 6 | The deviations from the mockups listed in `reference/prototype/docs/REPORT.md` (no back arrows on the 个人衣橱 and AI造型师 tabs, one tab icon set, live counts on 我的, 隐私与安全 inside 设置, order filter names, the 跳过 button, …) | Keep as the prototype |
| 7 | Two camera error texts mention 「原型」 and 「README」 (未检测到可用的摄像头, 当前环境不支持摄像头) | Keep verbatim; reword before launch |
| 8 | Consent before the first face or body photo or video (PIPL, §14). The prototype has had the sheet 「上传前请确认」 since 21 Oct 2026 (§9.16) | Port it. The text of 《敏感个人信息处理规则》, the provider's name and recording the consent on the server (`privacy.recordMediaConsent`, draft) come with the backend |
| 9 | Where to show the ICP 备案 number (e.g. 设置 → 关于) | Backend phase |
| 10 | Demo-only UI (重置演示数据, 重新体验首次启动, 演示 notes, the demo verification code, the 「原型演示」 group and 「原型 v2.0」 in 设置) | Keep, behind `isDemo()` |
| 11 | Route for 商家消息, the screen the 购物广场 stores redesign added (prototype commit 514de38, 19 Oct 2026): `/plaza/messages`, a `messages` segment after `/plaza` (§4.3, §8) | Use it |
| 12 | ZARA is a real trademark (Inditex). The demo uses it as one of its seven stores: the store name 「ZARA 官方旗舰店」, a ZARA wordmark as its logo, a banner image with a ZARA wordmark (`assets/plaza/banners/zara.webp`), four products, a seed order and chat copy (「2024 秋冬系列」). The public GitHub Pages copy of the prototype already shows it | Keep it in the demo seed as the prototype has it (acceptance checks and baselines depend on it); replace it with a fictional or licensed store before any public launch |
| 13 | Route for creating another digital avatar (切换角色 → 新建数字分身, 20 Oct 2026): `/home/avatars/new?name=…`, a segment group `avatars/new` allowed after `/home` and `/wardrobe` (where the 切换角色 sheet opens), the name in `?name=` (§4.3, §8) | Use it |
| 14 | Multiple digital avatars change the API contract: the avatar-scoped `avatar.*`, `wardrobe.*` calls and an `avatars` area (list, create, rename, remove). Drafted in `docs/contract/` (marked draft). The avatar onboarding upgrade (21 Oct 2026) extends the draft with five photo kinds, video upload, draft materials, `avatar.check`, job stages with an optional `progress`, and the media consent | Review the draft before Phase 2 copies the contract |
| 15 | Temporary garments (首页's photos and the products tried on but not saved; until 21 Oct 2026 我的上传) last for the browser session (sessionStorage), belong to the avatar they were made for, and reach the backend only through 加入衣橱 (§9.17) | Yes |
| 16 | New copy from the 首页 update: 切换角色, 切换场景 and the backdrop names 暖灰 · 奶白 · 燕麦 · 深咖, 拍照, 拍摄衣服, 从相册上传, 确认衣物照片, 临时试穿, 演示版暂无上身图, 加入衣橱 / 已在衣橱, 新建数字分身 and its sheets (SCREENS.md 首页). 推荐 / 我的上传 went with the ownership change (#18) | Use it |
| 17 | New copy from the avatar onboarding upgrade (SCREENS.md 2), and its deliberate differences from the mockup: no percentage or time estimate while generating, no 3D claim, 「素材检测结果」 instead of 「AI 智能检测结果」, 背景简洁度 for the brief's 背景清晰度, and 10 s instead of 10–15 s | Use it |
| 18 | The garment ownership change (21 Oct 2026, §9.17): one garment model; ✓ only for what a person owns, confirmed by them (标记为已拥有) or by 确认收货; no source labels or tabs anywhere; the demo ownership in the seed; its new copy: 已拥有, 标记为已拥有 / 取消已拥有标记, 已标记为已拥有 / 已取消已拥有标记, 还没有{分类}, 演示版暂无这件衣物的上身图，试穿时会加入当前搭配, the new 确认收货 dialog line and toast, 可以单独购买的单品 and the AI 造型师 plan replies (§9.7). REPORT deviations 37–40 | Use it |
| 19 | The garment model changes the API contract (§9.17, 「Proposed contract change」): new `WardrobeSource` values, ownership and temporary flags on `WardrobeItem`, `wardrobe.setOwned`, `Order.avatarId`, ownership on `confirmReceipt`, two stylist message shapes. Not drafted in `docs/contract/` yet | Approve it, then draft it in `docs/contract/` before Phase 2 copies the contract |

### 13.2 Known prototype issues

Found while writing `docs/SCREENS.md` (file:line in `reference/prototype/js/` unless noted). **Fix** = build the corrected behaviour described here. **Keep** = port the prototype's behaviour as it is. Anything else that looks wrong: ask (§0).

| # | Issue | Default |
|---|---|---|
| 1 | The payment sheet can be closed during 「支付处理中…」 and the order still completes (`screens/08-checkout.js:202`) | **Fix:** it can't be closed while processing |
| 2 | Close races: a camera stream that arrives during the 280 ms close animation is never stopped (`camera.js:103`); Esc in the last ~280 ms of progress, or 取消/Esc during the 350 ms result delay, still completes the generation. The generation part is fixed in the prototype (21 Oct 2026): a cancelled job never finishes | **Fix:** a `closed` flag; cancel timers and jobs on close |
| 3 | Camera: when the preview goes live, focus falls to the page and Esc stops working (`camera.js:109`); 切换 can reopen the same camera and toasts before the new stream starts (`camera.js:129-135`) | **Fix:** as §9.10 |
| 4 | Closing the generation layer with Esc or browser back shows no 「已取消生成」 (fixed in the prototype, 21 Oct 2026) | **Fix:** the same toast for every way of cancelling |
| 5 | 「去首页试穿」 after generating from the upload screen leaves `/me/avatar/upload` on 我的's stack (fixed in the prototype, 21 Oct 2026) | **Fix:** drop the upload screen first, so 我的 returns to 我的形象 |
| 6 | `pickRender` can report a garment that has imagery as missing when it is combined with an item from another render (`{shoes: white-sneakers, dress: satin-slip-dress}` → base, missing the dress) | **Keep:** the acceptance checks depend on the scoring; real try-on replaces it |
| 7 | 确认收货: 我的订单 shows it for statuses 1–3, 订单详情 and 物流跟踪 only for 2–3 (`screens/09-orders.js:101` vs `:190`, `:265`) | **Fix:** statuses 1–3 everywhere |
| 8 | 订单详情 offers 申请退换货 for every paid order; 我的订单 only for 已完成 | **Keep** |
| 9 | Orders store only an address id, so editing or deleting an address changes old orders (`screens/09-orders.js:198`) | **Fix:** orders keep an address snapshot (already in the contract) |
| 10 | Fallback copy 「请在 24 小时内 前完成支付」 (`screens/09-orders.js:18`) | **Fix:** 「请在 24 小时内完成支付」 |
| 11 | 在线客服 answers about `currentOrder` (the last order placed at checkout, else VT20260715092418), not the order on screen (`screens/09-orders.js:47`, `:392`) | **Fix:** pass the order on screen (`SupportChannel.orderId`) |
| 12 | Amounts mix 「¥2,331」 and 「¥2311」 (`ui.js:16` vs `:37`) | **Fix:** thousands separators everywhere |
| 13 | Quantity 「+」 is never disabled at 9 (`screens/08-checkout.js:122`) | **Fix:** disabled at 9 |
| 14 | Choosing a payment method at checkout overwrites the 支付方式 default, contradicting its note 「结算时默认选中，可在下单时临时更换」; 「使用新银行卡支付」 then leaves 支付方式 with nothing selected (`screens/08-checkout.js:90`, `screens/11-account.js:175-183`) | **Fix:** separate default and per-checkout choice (§9.4) |
| 15 | 「去衣橱看看」 keeps the wardrobe's category and search (`screens/05-product.js:167`); saving an upload resets the category but keeps an open search (`screens/06-wardrobe.js:197-205`); either can hide the new item | **Fix:** reset to 全部 and clear the search |
| 16 | An unknown product id renders the fallback shirt, its actions throw, and the bad id is recorded in 浏览记录 (`screens/05-product.js:22`, `:78`); an unknown order id shows another order | **Fix:** not-found states (§13.1); nothing recorded |
| 17 | The 「订单运输中」 notice (「消息通知」 sheet, now opened from 商家消息) says 「点击查看物流」 but opens 订单详情 (`screens/04-plaza.js:343`, `:348`) | **Keep:** 订单详情 shows the tracker |
| 18 | **Resolved in the prototype** (514de38): the brand sheet listed the same category, not the same brand; the brand row now opens the store sheet with that store's products (SCREENS.md, 商品详情). Still true: every product shows the same size table, tip and reviews | **Keep** the size table, tip and reviews **[demo]** |
| 19 | Settings that are stored but change nothing: notification and privacy switches (except 「允许 AI 造型师读取衣橱」, which since 21 Oct 2026 turns AI 造型师's plan replies into its privacy reply, §9.7), 尺码标准, 小额免密, body data, avatar preferences | **Keep:** the backend gives them meaning |
| 20 | The wardrobe heart and the look-card save update `aria-pressed` but leave their `aria-label` stale (`screens/06-wardrobe.js:97`, `screens/07-stylist.js:100`); the look sheet's 「保存搭配」 leaves both stale (`:214`) | **Fix** |
| 21 | Only the avatar picker has the 25 MB limit: the wardrobe, stylist, return, profile-photo and 拍照找同款 pickers have none; a stylist photo that can't be decoded is stored at full size (`screens/06-wardrobe.js:180`, `screens/07-stylist.js:136`, `:160`) | **Fix:** one pipeline (§9.9) |
| 22 | Stylist replies that arrive while the user is on another screen skip the 60-message cap (`screens/07-stylist.js:188`) | **Fix:** the mock always applies it |
| 23 | 浏览记录 stores the text 「今天」, which never changes on later days (`store.js:130`) | **Fix:** timestamps (§9.12) |
| 24 | Toasts overlap the wardrobe queue bar (`css/components.css:246`, `css/screens/06-wardrobe.css:40`) | **Fix:** toasts sit above the bar while it shows |
| 25 | 「清除已上传的照片」 leaves wardrobe uploads and chat photos (`screens/11-account.js:238-240`) | **Keep:** revisit with the PIPL work (§14) |
| 26 | A blank upload name is saved as empty (`screens/06-wardrobe.js:197`) | **Fix:** 「我的衣物」 |
| 27 | HEIC passes the type check, but only Safari can decode it | **Keep:** the decode error appears; convert on the server later |
| 28 | 重新体验首次启动 skips avatar creation when the avatar is ready (`screens/11-account.js:274`, `screens/01-onboarding.js:69`) | **Keep** |
| 29 | Logged out by default, yet 我的资料 shows 「已绑定」 and 隐私与安全 shows 「登录密码 已设置」 | **Keep** **[demo]** |
| 30 | Two different messages for a non-image profile photo (`screens/10-profile.js:40` vs `screens/11-account.js:59`) | **Fix:** the §9.9 messages in both |
| 31 | The 「退出登录」 / 「登录 / 注册」 button (`.set-logout`) has no CSS, so it renders as plain ink text | **Keep** that look |
| 32 | The address book can't be empty: deleting every address brings the two seeds back, and the next save re-inserts them (`store.js:117`, `screens/11-account.js:100`) | **Fix:** an empty book stays empty and shows 「还没有收货地址」; checkout then shows the §13.1 address copy |
| 33 | Dead code: the `.or-lg-*` CSS, `isNew` on orders, `avatar.demo`, `VT.avatarGen.readImage`, `.onb-shade` | Don't port |

Rows 34–38 were found while bringing this spec in line with prototype commits 051585b (首页 rail) and 514de38 (购物广场 stores). Their defaults are proposals: confirm or override them like the rest of §13.

| # | Issue | Default |
|---|---|---|
| 34 | Tapping off a selected garment that no render wears removed its thumbnail from the 首页 rail, so keyboard focus dropped to the page | **Resolved in the prototype** (首页 update, 20 Oct 2026; still so with the garment model of 21 Oct 2026): a garment stays on the rail when it is taken off (a product tried on from elsewhere, for the session), so focus stays on its tile |
| 35 | maxi-skirt (added in 514de38) is in no try-on category (`data.fitCatsAll`). 试穿上身 on it left the 首页 menu where it was, and the skirt never showed on the rail, so it couldn't be tapped off | **Resolved in the prototype** (garment model, 21 Oct 2026, §9.17): the rail lists a garment under its own garment category too, so maxi-skirt shows under 下装 once the person has it or tries it on, and 试穿上身 opens 下装. `data.fitCatsAll` stays as it is |
| 36 | Two merchant chats: 订单详情's 「联系商家」 (`screens/09-orders.js:390`) is unstored, answers exact questions after 800 ms and greets 「您好，我是店铺客服…」; the store chats on 商家消息 (`screens/14-messages.js`) are stored, answer by keyword after 900 ms and greet 「您好，欢迎光临 {店铺}…」. A chat started from an order never shows up in 商家消息 | **Keep** both as they are; merge them when the backend brings real merchant chat |
| 37 | The new 购物广场 and 商家消息 text (copy, aria-labels, reply keywords) uses 13 characters that the prototype's subset fonts lack (义便列右折抵探摆般迎逸顶飘), so the prototype draws the visible ones, such as 「欢迎光临」 and 「飘逸」, in the system font. Phase 0's `charset.txt` predates them | **Keep** in the prototype. The web build's `pnpm fonts` covers them once re-run; recreate `charset.txt` from the current prototype. Expect those glyphs to differ from the baselines after Phase 6 |
| 38 | Store chat times are stored as display text (`t`: 「10:24」, 「昨天」, 「7月13日」, or `HH:mm` for new messages), so they never age into 「昨天」 (`screens/14-messages.js:19`, `data.js:208-212`) | **Fix:** store timestamps and format them when rendering, like 浏览记录 (§13.2 #23); place the seed times relative to the first run |

---

## 14. Backend later

Not part of this build. Listed so the front end doesn't paint itself into a corner.

**The swap.** Implement `src/api/http/` against the backend and point `src/api/client.ts` at it. Screens don't change. The REST shape below is a first sketch for discussion, not a commitment.

| Contract area | Sketch |
|---|---|
| `auth` | `POST /v1/auth/sms-code`, `POST /v1/auth/login` (phone + code), `POST /v1/auth/wechat` (code from WeChat web authorization), `POST /v1/auth/logout` |
| `catalog` | `GET /v1/products?category=&q=&store=`, `GET /v1/products/:id`, `GET /v1/tryon/garments`, `GET /v1/banners` |
| `stores` | `GET /v1/stores?q=`, `GET /v1/stores/:id`, `GET /v1/me/store-favorites`, `PUT/DELETE /v1/me/store-favorites/:storeId` |
| `storeChats` | `GET /v1/me/store-chats`, `GET /v1/me/store-chats/:storeId` (marks it read), `POST /v1/me/store-chats/:storeId/messages`, `POST /v1/me/store-chats/:storeId/read` (real-time delivery later) |
| `favorites` · `looks` · `history` | `GET/PUT/DELETE /v1/me/favorites/:pid`, `GET/PUT/DELETE /v1/me/looks/:id`, `GET/POST /v1/me/history` |
| `avatars` | `GET/POST /v1/me/avatars`, `PATCH/DELETE /v1/me/avatars/:id`; the avatar calls below move under `/v1/me/avatars/:id/…` (photos, jobs, body) |
| `wardrobe` | per avatar: `GET /v1/me/avatars/:id/wardrobe`, `POST …/wardrobe` (from a product or an upload), `PATCH/DELETE …/wardrobe/:uid` (`PATCH` sets `fav` or `isOwned`, §9.17) |
| `fitting` | `POST /v1/tryon/renders` → job (AI try-on is slow; the mock answers at once) |
| `avatar` | `POST /v1/me/avatar/photos` (direct upload to object storage with a signed URL), `POST /v1/me/avatar/jobs`, `GET /v1/me/avatar/jobs/:id`, `GET /v1/me/avatar` |
| `stylist` | `GET /v1/stylist/messages`, `POST /v1/stylist/messages` (streaming later) |
| `orders` · `returns` | `POST /v1/orders`, `GET /v1/orders?status=`, `GET /v1/orders/:id`, `POST /v1/orders/:id/pay` → `PaymentAction`, `POST /v1/orders/:id/cancel`, `POST /v1/orders/:id/confirm` (also marks the garment owned in that avatar's wardrobe), `POST/DELETE /v1/orders/:id/return`, `GET/POST /v1/orders/:id/messages` |
| `profile` · `body` · `settings` · `addresses` | `GET/PATCH /v1/me/profile`, `PUT /v1/me/profile/photo`, `GET/PATCH /v1/me/body`, `GET/PATCH /v1/me/settings`, `GET/POST/PATCH/DELETE /v1/me/addresses/:id` |
| `support` | `GET /v1/support/faqs`, `POST /v1/support/feedback` |

**China launch notes** (verify each with legal and ops before the backend phase):
- **Hosting.** A site served from mainland China needs an ICP 备案 for its domain, and the number must be displayed in the app. Serve static files from a mainland CDN; keep every script and font on our own domains.
- **Supabase** (the team's default backend) has no hosted region in mainland China, as far as we know (check the current region list). For a China launch, plan a self-hosted deployment on a mainland cloud or a different mainland backend.
- **Payments.** Alipay mobile web payment (redirect); WeChat Pay JSAPI inside WeChat (needs the user's OpenID from an official account) and WeChat Pay H5 in other mobile browsers; UnionPay. These map to `PaymentAction` kinds `redirect` and `wechat-jsapi`. After any return from a payment page, re-fetch the order: never trust the redirect alone.
- **Login.** SMS code everywhere; WeChat web authorization inside the WeChat browser.
- **Personal information (PIPL).** Face photos, and likely full-body photos and body measurements, count as sensitive personal information: a separate, explicit consent before upload (not pre-ticked), a stated purpose and retention period, a way to delete the avatar and photos, storage in China. The prototype already has the consent sheet before the first upload (§9.16). Front-end work still to come: links to the user agreement and privacy policy, and working 导出 / 删除 entries in 隐私与安全.
- **AI-generated images and chat.** Generating a person's avatar and try-on images from their photos falls under China's deep-synthesis and AI-content labelling rules: expect visible "AI生成" labels on generated images, consent for face editing, and algorithm/service filings for the generation models and the LLM stylist.
- **Uploads.** Uploaded images need content moderation on the server; the UI will need a rejected-upload message (`ApiError.code === 'CONTENT_REJECTED'`).
- **Retire demo code.** Everything behind `isDemo()`, the mock, error injection and `?frame=iphone` must be off in production builds.
