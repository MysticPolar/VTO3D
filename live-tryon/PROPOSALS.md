# Proposals for the app

Live try-on lives in `live-tryon/` and touches nothing of the app except two ignore lines (below).
Bringing it into the app means changes in other sessions' areas, so they are proposed here, not
made. Scope first: HANDOFF §2 lists real-time video try-on as out of scope for now, so whether
and when it comes in is the user's call.

## For the master session (spec, contract, React build)

### 1. Contract (needs the user's approval, CLAUDE.md rule 4)

The page needs two back-end calls plus try-on data per garment. A sketch in the style of
`docs/contract/`:

```ts
// types.ts
/** One short-lived Decart client token for one connection; never the permanent key */
export interface LiveTryOnGrant {
  token: string;
  expiresAt: string; // ISO
  model: string; // 'lucy-vton-3.6'
  maxSessionSeconds: number;
  reservationId: string;
}

/** What the model needs to dress someone in a product */
export interface LiveTryOnRef {
  image: string; // clean product photo, ≥ 512 px, no person
  prompt: string; // English instruction, see live-tryon/src/catalog/prompts.ts
}
// Product (or the try-on garment type) gains: liveTryOn?: LiveTryOnRef

// api.ts
liveTryOn: {
  /** POST /v1/tryon/live/tokens — refuses with ApiError codes BUSY, BUDGET_EXHAUSTED, … */
  grant(): Promise<LiveTryOnGrant>;
  /** POST /v1/tryon/live/usage — seconds actually generated, so unused budget goes back */
  reportUsage(reservationId: string, seconds: number): Promise<void>;
};
```

The mock can't mint Decart tokens, so in the app the live layer would sit behind a feature flag:
off with the mock (the layer stays today's camera preview), on with a real back end. HANDOFF §14's
table would gain a `liveTryOn` row.

### 2. Where the code goes

Phase 6 (device features), not before:
- `live-tryon/src/core/` → `src/features/liveTryOn/`: the session, Decart connector, copy and
  types are framework-free;
- a `useLiveTryOn()` hook subscribes to `ViewState`;
- the camera layer component renders it with CSS Modules.

`@decartai/sdk` (which brings `livekit-client`, about 240 kB gzipped, most of it loaded only on
connect) would be a new app dependency, which needs approval (rule 8).

### 3. HANDOFF §9.10 additions, if live try-on comes in

- States: `connecting` (camera shown while the model starts, 7–20 s measured), `reconnecting`,
  `ended` (time cap / page hidden / server ended).
- Stop rules that only matter when seconds are billed:
  - when the server ends a session for any reason, disconnect at once: the SDK otherwise
    reconnects on its own and starts a new, billed session;
  - refuse token requests for reconnects after an end;
  - stop the session at `maxSessionSeconds` in the page too;
  - report the generated seconds.
- Camera switch: a new session on the other camera (mirroring is fixed when a session starts).
- Consent: a separate, unticked consent before the camera starts (REPORT.md, open decision 1).

### 4. Two lines I changed in the app's config

`eslint.config.js` (`globalIgnores`) and `.prettierignore` now skip `live-tryon/`, so the app's
`pnpm lint` ignores the package. Before this, a local `live-tryon` build made the app's ESLint fail
on `live-tryon/dist`, because the root ignore patterns only cover the repo's own `dist`. The package
has its own checks (`pnpm --dir live-tryon verify`). Committed separately, so it's easy to review
or revert.

### 5. Spec drift noticed in passing

SCREENS.md §3 calls the layer's 「视频试衣 · 预览」 a "centre pill". The prototype puts it at the right
edge whenever the switch button is hidden (`.cam-top` is `space-between` with two visible children;
see `reference/acceptance/out/03_camera.png`). The live-tryon page matches the prototype.

## For the Mobile UI/UX session (prototype)

Live try-on makes two prototype lines untrue and needs words for states the preview never had. Every
string below is marked DRAFT in `live-tryon/src/core/copy.ts`; the page switches to whatever the
prototype settles on.

| Where | Prototype now | Proposed |
| --- | --- | --- |
| centre pill | 视频试衣 · 预览 | AI 视频试衣 |
| 首页 camera button aria-label | 开启视频试衣（摄像头预览） | 开启 AI 视频试衣 |
| explainer, line 1 | 开启摄像头后，你可以在镜头前实时预览自己。 | 开启摄像头后，AI 会实时为你换上所选单品。 |
| explainer, line 2 | 画面只在本机显示，不会上传或保存。 (no longer true) | 画面仅用于实时生成试穿效果，本应用不保存你的视频。 |
| consent checkbox (new, unticked, required) | – | 我同意将摄像头画面实时传送至境外（美国）的 AI 服务商 Decart 处理，用于视频试衣 |
| toast, start without consent | – | 请先勾选同意，再开启摄像头 |
| footer | 实时 AI 换装需接入试衣模型服务，当前原型仅提供摄像头预览 (no longer true) | 画面由 AI 实时生成，仅供试穿参考，颜色与版型以实物为准 |
| label on generated video | – | AI生成 |
| status line | – | 正在连接 AI 试衣… · 试衣服务繁忙，正在排队… · 正在排队，前面还有 {n} 人 · 网络不稳定，正在重新连接… · 正在换上「{name}」… |
| garment refused (toast) | – | 这件单品暂时无法实时试穿，请换一件试试 |
| garment applied (toast) | 已试穿：{name} (首页's, reused) | same |
| time cap panel | – | 本次试衣已结束 / 每次实时试衣最长 {n} 分钟，可以重新开始。 / 重新开始 · 返回试衣间 |
| page hidden panel | – | 试衣已暂停 / 离开页面时摄像头会自动关闭。 / 继续试衣 · 返回试衣间 |
| server ended panel | – | 试衣已断开 / AI 试衣服务结束了本次连接，请稍后重试。 |
| service panels | – | 试衣服务暂时不可用 · 试衣服务繁忙 · 操作太频繁 · 今日试衣额度已用完 (no retry) · 网络连接失败 · 试衣已停止 (moderation) · 当前浏览器不支持实时试衣 (no retry) |
| test server only | – | 测试访问码 · 请输入访问码 · 请先输入测试访问码 · 访问码不正确 |

Design to settle:
- the garment rail inside the layer (category chips over a row of thumbnails, above the footer).
  On phones under 760 px tall it is hidden in the explainer state, so the explainer fits;
- the status line under the top bar;
- the 「AI生成」 label (Decart also burns a moving 「✦ AI Generated」 into the video);
- the consent row and the ended and service panels.

New copy needs `pnpm fonts` once it's final: the subset fonts lack several of these characters,
which the page currently draws in the system font.
