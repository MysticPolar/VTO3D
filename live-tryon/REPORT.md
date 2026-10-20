# Live try-on with Lucy VTON 3.6: report

20 Oct 2026 · `live-tryon/` in the VTO3D repo · Decart JS SDK 0.2.12, model `lucy-vton-3.6`

## What was built

- **Back end** (`server/`, deployed as Vercel Functions): holds the Decart key and hands the page a
  60-second client token per connection, scoped to `lucy-vton-3.6`, to the page's origin and to a
  2-minute session. Before minting it checks the access code, the origin, a per-client rate, the
  account's live-session count and a daily budget. The page reports the seconds actually used, so
  unused budget goes back.
- **Front end**: the prototype's 首页 camera layer, rebuilt on a framework-free session controller
  (`src/core/session.ts`). The camera goes to Decart, the dressed-up video plays back, and a
  garment rail switches what's worn without reconnecting. All prototype states, error messages,
  the camera switch and the stop rules are kept. New states and words are marked DRAFT.
- **Tests**: 123 unit tests (back end, session states and stop rules, error mapping, copy,
  catalog and prompts, SDK options) and 25 browser tests in Chromium and WebKit, all without a
  camera, a key or any cost. One more real-money check (`pnpm measure`) produced the numbers below.

## Measured latency

Three real sessions from this Mac (US East coast, home network), Chrome 155, the sample camera
(the base avatar filmed at 720×1280, 30 fps). Decart put every session on its `us-west-1` media
server, with direct UDP and no relay.

| | Standard, run 1 | Standard, run 2 | Fast, run 1 |
| --- | --- | --- | --- |
| Tap → first dressed frame | 20.0 s | 11.7 s | 14.6 s |
| SDK time-to-first-frame (from connect) | 13.2 s | 7.8 s | 10.2 s |
| Camera-to-screen delay, median (p90) | 1.88 s (2.06) | 1.13 s (1.36) | 1.20 s (1.22) |
| Garment change acknowledged | 1.2–1.4 s | 0.6 s | 0.45–0.6 s |
| Output frame rate (sent) | 14 fps (17) | 17 fps (20) | 25 fps (28) |
| Round trip as the SDK reports it | 786 ms | 250 ms | 524 ms |
| Billed | 25 s · $0.50 | 20 s · $0.40 | 20 s · $0.80 |

What the numbers say:

1. **Starting takes 12–20 seconds.** In run 2, Decart's connect took 5.6 s: socket open 1.0 s,
   room join 0.3 s, sending the first garment 0.4 s, **WebRTC handshake 3.3 s**, publishing the
   camera 1.0 s. About 3.7 s went before it (our token request: Decart's quota and token calls take
   0.3–1.5 s each; the back end now makes them in parallel), and 1.1 s after it, until the model
   produced its first frame. The page shows the camera meanwhile, so the wait isn't a black screen.
2. **The delay you see is about 1.1–1.9 s** between moving and seeing the result. Fast mode was
   steadier (1.20 s, p90 1.22 s) and ran at 25 fps instead of 14–17.
3. **Changing garments is quick**: the model acknowledges in 0.45–1.4 s, and the new garment is
   visible within about 2 s, with no reconnect and no new token.
4. **Results vary a lot between runs** on the same network. Decart's own quality bands call a
   round trip over 500 ms "poor", and run 1 was there. A few runs say nothing about users in Asia.

Quality (screenshots in `measurements/`, not committed): the black blazer, white shirt and denim
jacket all rendered convincingly on the avatar, with face, hair, pose and jeans kept. The blazer
came out worn open over the camisole even though the prompt says "buttoned closed". Decart burns
its own moving 「✦ AI Generated」 watermark into the video.

## Cost

- Decart bills per second of generated video: **$0.02 standard ($1.20 a minute), $0.04 fast
  ($2.40 a minute)**. At ¥7–7.3 to the dollar that is about ¥8.5 a minute standard.
- A full 2-minute session costs $2.40 standard, $4.80 fast. Connecting is free until the model
  starts generating.
- At scale: 1,000 users trying on for 2 minutes a day is about $2,400 a day in standard mode.
  Live try-on needs a usage policy (free seconds per user, or only for logged-in buyers) before it
  ships.
- These measurements cost $1.70 (65 billed seconds). Token minting is free.
- Bandwidth for the user: Decart measures 1.3–2.4 Mbps up and the same down per session, which
  matters on mobile data.
- Bundle: the SDK and LiveKit add about 240 kB of gzipped JavaScript; LiveKit (133 kB of it)
  loads only when a session connects.

## Decisions still open

1. **China.** Recorded as open, as agreed. What we know:
   - **Reachability.** Decart's media runs on LiveKit servers at `*.lkc.decart.ai`, routed by
     region; every session from here went to `us-west-1`. Decart lists no mainland region, and
     the SDK's own documentation says fast mode is US-only. WebRTC over UDP across the border is
     often slow and lossy, and nobody has tested from a mainland network yet. Next step: one
     `pnpm measure` run from a phone or cloud machine in mainland China (Wi-Fi and 4G).
   - **No Google, no analytics.** The page talked only to our server, `api.decart.ai` and
     `us-west-1.lkc.decart.ai` (measured). The SDK's usage reporting to `platform.decart.ai` is
     off, and its Google STUN preflight is never called.
   - **Personal information (PIPL), to verify with counsel.** Live face video is sensitive
     personal information, and sending it to a US processor is a cross-border transfer. That likely
     needs:
     - a separate, explicit consent, never pre-ticked (the draft explainer has one);
     - a personal-information impact assessment;
     - a standard contract filing, certification or security assessment, depending on volume.
   - **Decart's terms.** We must hold the user's consent for their likeness (API Terms 4.3).
     Inputs are not treated as confidential (4.2), and retention is "as long as necessary". The
     moderation subcontractors Google Cloud and Hive, both in the US, may see frames (DPA Annex III).
   - **AI rules.** Face editing falls under China's deep-synthesis rules, and generated video
     needs a visible label (the draft adds 「AI生成」). A public generative-AI service also needs
     algorithm and generative-AI filings, which an overseas model is unlikely to pass.
   - **Options:**
     - a. live try-on outside mainland China only;
     - b. a mainland-hosted try-on model for China, behind the same `RealtimeConnector` interface;
     - c. ask Decart about an in-China deployment.
2. **Production hosting of the token back end.** The test server runs on Vercel, as decided.
   Production depends on 1 and on the app's backend phase (HANDOFF §14: Supabase has no mainland
   region). The back end is three small handlers, so it can move to any of them.
3. **Consent and privacy words.** The prototype promises 「画面只在本机显示，不会上传或保存。」,
   which live try-on makes untrue; it must not ship. Drafts are in PROPOSALS.md for the Mobile
   UI/UX session and a legal review.
4. **Who pays, and how long a session runs** (cost section). Defaults: 2-minute sessions, 20
   minutes a day on the test server.
5. **Standard or fast mode.** Fast halves the worst-case delay and doubles the frame rate, for twice
   the price. The page uses standard unless `?fast=1`.
6. **One garment at a time.** The model takes one reference photo per instruction, while 首页's
   outfit holds up to seven slots. The layer applies the garment picked on its rail. Full looks
   would need one combined "outfit" photo per look.
7. **Garment data.** Each product needs a clean photo of at least 512 px and an English model
   instruction (`src/catalog/prompts.ts` has all 28). Five photos are 268 px wide: slip dress,
   handbag, pumps, strappy heels, gold hoops. In production these belong in the catalog, written
   by merchants or generated from the photo and reviewed.
8. **Hard daily cap on Vercel.** Without Upstash Redis the daily budget counts per serverless
   instance. Adding the free Upstash integration makes it exact; the access code, the session cap
   and the live-session limit apply either way.
