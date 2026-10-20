# 全新的购物体验 — web front end

Mobile-first web app (H5) for a Chinese-market virtual try-on and personal wardrobe app.
**Front end only.** Every data call goes through `src/api`, which has a local mock implementation for now. A real backend comes later; build nothing server-side.

## Read first
- **Full spec:** `docs/HANDOFF.md`. Read all of it before Phase 0. Before each later phase, re-read that phase (§11) and the sections it points to.
- **Every screen:** `docs/SCREENS.md` (layout, interactions, overlays, data, edge cases, acceptance checks per screen). Read the sections for the current phase's screens, not the whole file at once.
- **API contract:** `docs/contract/types.ts` + `docs/contract/api.ts` (copied into `src/api/` in Phase 2)
- **Source of truth for look, copy and behavior:** the working HTML prototype in `reference/prototype/`.
  - Run it: `cd reference/prototype && python3 -m http.server 8080`, then open http://localhost:8080
  - One screen without the frame: `http://localhost:8080/index.html?app=<screenId>` (ids in HANDOFF §8)
  - `reference/prototype/docs/REPORT.md` lists what is real vs simulated, and the agreed deviations from the mockups
- **Design references:** `reference/design/` (the five-screen mockup and the original screen designs)
- **Acceptance checks** the prototype passes: `reference/acceptance/flow_test_v2.py`

## Golden rules
1. **Match the prototype.** Port layout, sizes, colours, copy and interactions exactly. CSS values are px at a 390×844 baseline and were calibrated against the designs. Do not redesign.
2. **Copy is Chinese, verbatim** from the prototype. Do not translate, shorten or "improve" it.
3. **Five tabs only:** 首页 `/home` · 购物广场 `/plaza` · 个人衣橱 `/wardrobe` · AI造型师 `/stylist` · 我的 `/me`. Every other screen is secondary: back button, no tab bar.
4. **UI never touches mock data directly.** It goes through `src/api` hooks only. `src/api/types.ts` is the contract with the future backend; ask before changing it.
5. **China-ready:** no Google services, no overseas CDNs, no analytics. Fonts, images and scripts are self-hosted, same origin.
6. **No fake status bar** (the prototype's 9:41) in the app. Use safe-area insets (HANDOFF §4.2). The dev-only `?frame=iphone` mode adds it back for screenshot comparison.
7. **One phase at a time** (HANDOFF §11). At the end of each phase: run every check, report the results, tick the checklist below, commit, then stop and wait for review.
8. **Ask before** adding any dependency not listed in HANDOFF §3, changing a route or the API contract, or fixing a prototype bug that HANDOFF §13.2 doesn't already list (for listed ones, build the default given there).

## Commands (create them in Phase 0, keep this list accurate)
- `pnpm dev`: dev server. Append `?frame=iphone` to compare a screen with the prototype
- `pnpm build` / `pnpm preview`
- `pnpm typecheck` · `pnpm lint` (ESLint + Prettier check) · `pnpm format` · `pnpm test` (Vitest) · `pnpm e2e` (Playwright, Chromium + WebKit) · `pnpm visual` (screenshot diff vs prototype)
- `pnpm visual:baseline`: re-capture the prototype screenshots (`--prototype <dir>` reads another copy, e.g. a clean export of the last commit). Never run the visual suite with `--update-snapshots`
- `pnpm fonts`: re-subset the fonts after adding Chinese copy. `pnpm fonts:check` runs before every build and lists characters the fonts lack (from Phase 6 the build fails)
- `pnpm verify`: everything above in one go; run it before every phase commit. Visual and acceptance checks of screens not built yet are skipped (`BUILT` in `e2e/screens.ts`)
- `node scripts/icons/generate.ts`: regenerate `src/components/Icon/icons.ts` after the prototype's icons change

## Project map
`src/app` shell, router, providers · `src/routes` screens · `src/components` shared UI · `src/features` domain logic · `src/api` contract + mock · `src/store` Zustand · `src/styles` tokens, fonts, motion · `public/assets` images · `scripts` fonts and visual-baseline tools · `e2e` Playwright

## Phase checklist
- [x] Phase 0: Scaffold
- [x] Phase 1: App shell and navigation
- [ ] Phase 2: Data layer and domain rules
- [ ] Phase 3: The five tab screens
- [ ] Phase 4: Launch, product and checkout flows
- [ ] Phase 5: 我的 flows
- [ ] Phase 6: Device features and polish
- [ ] Phase 7: QA and hardening

## Conventions
- TypeScript strict. Components in PascalCase. One folder per screen in `src/routes/<Screen>/` with `<Screen>.tsx` and `<Screen>.module.css`
- Colours, radii and type live in `src/styles/tokens.css`. When a literal repeats, make it a token
- Keep the prototype's Chinese `aria-label`s. Buttons are `<button>`; toggles expose `aria-pressed` / `role="switch"`
- Demo-only copy (演示 notes, fake verification code) goes through `<DemoNote>` / `isDemo()` so it can be removed when the backend lands
- Commit message per phase: `phase N: <what now works>`
