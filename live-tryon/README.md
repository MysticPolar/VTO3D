# Live try-on (Lucy VTON 3.6)

The 首页 camera layer, made real: the camera stream goes to Decart's real-time try-on model
**Lucy VTON 3.6**, and the video that comes back shows the person wearing the garment picked on the
rail. A self-contained package inside the VTO3D repo: its own back end, test page and tests. The
app does not import it and the app's checks skip it. How it would plug into the app is in
[PROPOSALS.md](PROPOSALS.md); measurements and open decisions are in [REPORT.md](REPORT.md).

## How it works

```
phone browser (this page)              our back end (holds the key)           Decart
  tap 允许使用摄像头 → camera on
  SDK asks for a token ───────────────► POST /api/token
                                          access code, origin, rate,
                                          live-session count, daily budget
                                          ──────────────────────────────────► POST /v1/client/tokens
  ◄──── 60-second client token ─────────  (model, origin, session cap)  ◄────
  camera video ═══════════════ WebRTC, straight to Decart's media servers ═══════════════►
  ◄═══════════════════════════ dressed-up video back ═══════════════════════════════════
  pick a garment → set(prompt + photo) over the same connection
  session ends → POST /api/usage (seconds used, so unused budget goes back)
```

- The permanent Decart key stays in the back end. The browser only ever holds a client token that
  expires 60 seconds after it was made, works only for `lucy-vton-3.6`, only from this page's
  origin, and only for sessions up to the cap (default 2 minutes).
- The back end never sees the video. Media goes from the browser straight to Decart.
- Decart bills per second of generated video: $0.02 standard, $0.04 in fast mode.

## Run it on this Mac

1. Put your Decart key in `live-tryon/.env.local` (git-ignored; `.env.example` lists every setting):
   ```
   DECART_API_KEY=dct_…
   ```
2. Install and start (Node 24, pnpm via corepack):
   ```bash
   pnpm --dir live-tryon install
   ```
   ```bash
   pnpm --dir live-tryon dev
   ```
3. Open http://localhost:5191, tap the camera button, tick the consent box, tap 允许使用摄像头.

No webcam? Add `?source=sample` and the page films the prototype's base avatar instead.

| Page option | What it does |
| --- | --- |
| `?open=1` | open the layer at once |
| `?garment=<id>` | start in this garment (ids in `src/catalog/catalog.json`) |
| `?fast=1` | Decart fast mode: less delay, twice the price |
| `?debug=1` | latency, frame rate and running cost on screen |
| `?source=sample` | the avatar instead of a camera |
| `?connector=fake` | `pnpm dev:fake` only: no Decart at all |

## Test it

| Command | What it checks | Costs money |
| --- | --- | --- |
| `pnpm --dir live-tryon verify` | types, format, 123 unit tests, build, 25 browser tests (Chromium and WebKit) | no |
| `pnpm --dir live-tryon dev:fake` | the page and real back end against a stand-in Decart; open with `?connector=fake` | no |
| `pnpm --dir live-tryon measure` | two real sessions (standard and fast) with latency, cost and the hosts the page talked to | yes, about $1.20 |

`MEASURE_MODES=standard` runs one session only. Results land in `measurements/` (git-ignored).

## Deploy (Vercel)

The test server runs on Vercel: the page as static files, the back end as three Functions
(`api/token.ts`, `api/usage.ts`, `api/health.ts`). Run these from `live-tryon/`:

1. Link the folder to a Vercel project (creates it the first time):
   ```bash
   pnpm dlx vercel@62.4.0 link --yes --project vto3d-live-tryon
   ```
2. Add the two secrets. Each command asks for the value, so it never lands in a file or the shell history:
   ```bash
   pnpm dlx vercel@62.4.0 env add DECART_API_KEY production --sensitive
   ```
   ```bash
   pnpm dlx vercel@62.4.0 env add LIVE_TRYON_ACCESS_CODE production --sensitive
   ```
3. Fetch the project settings (sensitive values stay on Vercel), build here and upload the result:
   ```bash
   pnpm dlx vercel@62.4.0 pull --yes --environment=production
   ```
   ```bash
   pnpm dlx vercel@62.4.0 build --prod && pnpm dlx vercel@62.4.0 deploy --prebuilt --prod
   ```

A hosted deployment refuses to mint tokens until `LIVE_TRYON_ACCESS_CODE` is set. Share the code
only with testers; they type it once per device. Without Upstash (below) the daily cap is counted
per serverless instance, so the hard limits are the per-session cap, the live-session limit and
the credit balance on the Decart account.

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `DECART_API_KEY` | – | permanent key; server only, never `VITE_…` |
| `LIVE_TRYON_ACCESS_CODE` | – | code testers type; required when hosted |
| `LIVE_TRYON_MAX_SESSION_SECONDS` | 120 | longest session; Decart and the page both stop it |
| `LIVE_TRYON_DAILY_MINUTES` | 20 | session time tokens may be minted for per UTC day (0 = off) |
| `LIVE_TRYON_MAX_CONCURRENT` | 2 | live sessions on the Decart account at once |
| `LIVE_TRYON_ALLOWED_ORIGINS` | the page's own | other origins allowed to ask for tokens |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | – | Upstash Redis (Vercel Marketplace) for an exact daily cap |

## What's where

| Path | What |
| --- | --- |
| `server/` | the back end as Web `Request → Response` handlers, shared by Vercel and the dev server |
| `api/` | the three Vercel Functions (one line each) |
| `src/core/` | framework-free live try-on: the session state machine, Decart connector, copy, wire types. The part the app would reuse |
| `src/web/` | this test page: the prototype's camera layer rebuilt, plus the garment rail |
| `src/catalog/` | try-on garments (generated from the prototype) and one model prompt per garment |
| `scripts/sync-catalog.ts` | `pnpm catalog`: copies garments, photos, fonts and tokens from `reference/prototype/` |
| `scripts/dev-fake.ts` | `pnpm dev:fake`: the page with a stand-in Decart |
| `e2e/` | browser tests, and `measure.spec.ts` for real sessions |

After the prototype's catalog changes, run `pnpm --dir live-tryon catalog`; a unit test fails until
the copies match again.

## Matches the prototype, and what's new

Kept from `reference/prototype/js/camera.js` and HANDOFF §9.10: the layout and classes, the
explainer → waiting → live → error states, every camera error message word for word, the
front/back switch (shown only while live with two or more cameras, toast 「已切换摄像头」), and
the stop rules (✕, 暂不开启, 返回试衣间, Esc, back, page hidden; late streams stopped; focus to ✕ when
live).

New, marked DRAFT in `src/core/copy.ts` and `src/web/styles.css` until the Mobile UI/UX session
settles them in the prototype: connecting/reconnecting/queue status line, garment rail, consent
checkbox, access-code field, 「AI生成」 label, session-ended and service-error panels, and two
replacements for prototype lines that live try-on makes untrue (the video now leaves the phone).
