# Screens

Every screen of the app: what it shows, what each control does, its sheets and dialogs, the data it reads and writes, its edge cases and the acceptance checks that cover it. Written from the prototype's source and checked by running the prototype.

**How to use this file**
- It is the checklist for Phases 3–5 (HANDOFF §11). Read the sections for the screens in the current phase, not the whole file at once.
- The prototype file named in each section is the source of truth for markup, CSS, exact copy and anything this file leaves out. If the two disagree, follow the prototype and mention it in the phase report.
- Many sections note prototype bugs and suggest fixes. HANDOFF §13.2 decides which ones to fix; build what it says.

**Conventions**
- 「…」 is verbatim UI copy. **[demo]** marks simulated, demo-only behaviour: it goes through the mock API or behind `isDemo()`.
- push, switch tab, contextual jump, open chain, back and drop are the navigation operations in HANDOFF §4.3. The routes use the grammar in HANDOFF §4.3.
- `s.<field>` is the prototype's store (`js/store.js`); HANDOFF §7 maps each field to the API or a client store. `data.<name>` is `js/data.js`, ported to the mock seed. `VT.ui.*` helpers become the components in HANDOFF §5.7.
- The prototype's fake status bar and the `VT.framed` (embedded preview) code paths are dropped everywhere (HANDOFF §4.2).
- Durations are in ms; "reduced motion" means `prefers-reduced-motion: reduce`.

## Index

| # | Screen | Id | Route |
|---|---|---|---|
| 1 | 启动页 | `onboarding` | `/welcome` |
| 2 | 上传照片 · 创建数字分身 | `avatar` | `/welcome/avatar` |
| 3 | 首页 · 虚拟试衣间 | `fitting` | `/home` |
| 4 | 购物广场 | `plaza` | `/plaza` |
| 5 | 个人衣橱 | `wardrobe` | `/wardrobe` |
| 6 | AI 造型师 | `stylist` | `/stylist` |
| 7 | 我的 | `profile` | `/me` |
| 8 | 商品详情 | `product` | `/plaza/p/:pid` |
| 9 | 结算下单 | `checkout` | `/plaza/p/:pid/checkout` |
| 10 | 商家消息 | `messages` | `/plaza/messages` (proposed, HANDOFF §13.1 #11) |
| 11 | 我的订单 | `orderlist` | `/me/orders?status=…` |
| 12 | 订单详情 | `orders` | `/me/orders/o/:oid` |
| 13 | 物流跟踪 | `tracking` | `/me/orders/o/:oid/tracking` |
| 14 | 申请退换货 | `returns` | `/me/orders/o/:oid/returns` |
| 15 | 我的形象 | `avatarhub` | `/me/avatar` |
| 16 | 我的资料 | `editprofile` | `/me/profile` |
| 17 | 收货地址 | `addresses` | `/me/addresses` |
| 18 | 支付方式 | `payments` | `/me/payments` |
| 19 | 消息通知 | `notifications` | `/me/notifications` |
| 20 | 设置 | `settings` | `/me/settings` |
| 21 | 隐私与安全 | `privacy` | `/me/settings/privacy` |
| 22 | 帮助与客服 | `help` | `/me/help` |
| 23 | 我的收藏 | `favorites` | `/me/favorites` |
| 24 | 浏览记录 | `history` | `/me/history` |

## Launch flow (first launch only)

### 1. 启动页 · `onboarding`

**Route** `/welcome` · **Type** launch · **Prototype** `js/screens/01-onboarding.js`, `css/screens/01-onboarding.css` · **Design ref** `reference/design/screens/01_onboarding.png`

**Purpose.** First-launch welcome screen. It leads either into avatar creation (开始体验) or into a demo login that goes straight to 首页.

**Layout (top → bottom).** One fixed full-screen composition. Nothing scrolls. No status bar, back button or tab bar.
- Full-bleed photo `assets/people/onboarding-scene.webp` (cover, anchored to the bottom, `fetchpriority="high"`), alt 「身穿米白针织衫与阔腿裤的模特站在暖色调的服装店内」. `.onb-shade` is an empty `display:none` div, so drop it.
- Top-left copy: an h1 on two lines, 「全新的」 / 「购物体验」, followed by a yellow dot. Below it, a two-line tagline: 「更智能，更个性化的」 / 「时尚购物方式。」.
- Three static feature rows (icon tile, bold title, caption): 「虚拟试衣」「真实上身效果」 · 「个人衣橱」「统一管理搭配」 · 「智能推荐」「发现你的风格」 (icons `dress-hanger`, `hanger`, `bag-line-handle`). They are not tappable.
- Actions pinned to the bottom edge (safe-area aware): a dark 「开始体验」 button with a → icon, and an outline 「登录」 button.

**Interactions.**
- 「开始体验」 → if `avatar.status === 'ready'`, calls `app.enterMain()`. Otherwise it pushes `avatar` with `{ from: 'launch' }` → `/welcome/avatar` (slide).
- 「登录」 → opens the 登录 sheet with an `after` callback. `after` sets `avatar.status = 'ready'` and `avatar.demo = true` if the avatar isn't ready yet (the code comment says a returning account already has a digital avatar), then calls `app.enterMain()`.
- `app.enterMain()` (app.js:113): sets `setupDone = true`, closes all overlays, **clears every stack, including the launch flow**, and shows 首页 `/home` with a fade. Use a replace navigation so browser back can't return to `/welcome`.

**Overlays.**
- **登录 sheet.** Built by `openLogin(app, after)` and exported as `VT.login`. 设置 also uses it for 「登录 / 注册」, with `after = refresh`. It is a bottom sheet titled 「登录」 with a ✕ close button (aria 「关闭」).
  - Lead text: 「登录后可同步你的数字分身、衣橱与订单。」
  - 「手机号」 field: fixed prefix 「+86」, `type=tel`, numeric, max 11 digits, placeholder 「请输入手机号」, **pre-filled with 「13800138888」 [demo]**.
  - 「验证码」 field: numeric, max 6 digits, placeholder 「6 位验证码」, with an inline 「获取验证码」 button.
  - A dark full-width 「登录」 button, then the note 「演示原型：不会发送短信，也不会创建真实账号。」 **[demo]**.
  - 「获取验证码」 → fills the code field with 「246810」 **[demo]** and shows the toast 「演示验证码已自动填入」. The button is disabled and counts down 「59s 后重发」 … 「1s 后重发」 in 1000 ms steps, then re-enables as 「重新获取」. The countdown stops when the sheet closes. Reopening the sheet starts fresh.
  - 「登录」 → **no validation [demo]**: an empty phone or code also succeeds. It sets `loggedIn = true`, closes the sheet and shows the toast 「登录成功（演示账号）」 (check icon). `after()` runs **500 ms** later; on 启动页 that goes to 首页 as described above.
  - The sheet closes on ✕, a tap on the scrim, Esc or back. Closing without logging in changes nothing. Initial focus goes to ✕.

**Data.** Reads `avatar.status`. Writes `loggedIn` (login), `avatar.status` and `avatar.demo` (login), and `setupDone` (through `enterMain`). No keep-scroll or keep-value state.

**States & edge cases.**
- At app start, `app.launch()` (app.js:104) opens 首页 if `setupDone`, otherwise 启动页. This screen therefore appears only on first launch, after 设置 → 「重新体验首次启动」 (sets `setupDone = false` and keeps all data), or after 「重置演示数据」.
- After 「重新体验首次启动」 the avatar is usually still `'ready'`, so 「开始体验」 skips avatar creation and goes straight to 首页. `'none'` and `'stale'` go to the upload screen.
- Being logged in changes nothing on this screen: 「登录」 always opens the sheet. Only 设置 reads `loggedIn` (to show 登录 / 注册 or 退出登录).

**Components used.** `VT.ui.img`, `VT.icon`, `.btn--dark.btn--xl` + `.btn-arrow`, `.btn--outline`. Sheet: `app.sheet`, `.sheet-lead`, `.field` / `.field-row` / `.field-prefix` / `.field-btn`, `.btn--lg.btn--block`, `.sheet-note`. Also `app.toast`, `app.later`, `app.enterMain`.

**Acceptance checks.** `启动页 reachable as a flow screen` (simulator entry) · `开始体验 → avatar creation` · `first launch (no setup) opens 启动页` · `mobile: full-screen app, first launch`.


### 2. 上传照片 · 创建数字分身 · `avatar`

**Route** `/welcome/avatar` (first launch, `params.from = 'launch'`) · `/me/avatar/upload` (from 我的形象, `params.from = 'profile'`) · `/home/avatars/new?name=…` (切换角色 → 新建数字分身, `params.ctx = 'new'`; proposed, HANDOFF §13.1 #13; pushed on 个人衣橱's stack when started there) · **Type** launch (first launch) | secondary (from 我的形象 or 切换角色) · **Prototype** `js/screens/02-avatar.js`, `css/screens/02-avatar.css` · **Design ref** `reference/design/screens/02_avatar_upload.png`

**Purpose.** The user picks a full-body photo and a portrait, then runs the simulated digital-avatar generation: for their own avatar (本人), or, in the `new` context, for another person's avatar (HANDOFF §9.15).

**Layout (top → bottom).**
- Fake status bar (dark). Drop it in the web build.
- Scroll area (`data-keep-scroll="av"`). Everything scrolls except the bottom CTA:
  - Top row: back button (aria 「返回」) on the left and a 「跳过」 pill on the right. **「跳过」 appears on first launch only** (hidden when `from === 'profile'` and in the `new` context). The design ref has no 「跳过」; it was added on purpose (REPORT deviation 10).
  - h1 「上传照片，创建数字分身」. Two-line lead: 「上传清晰的全身照和生活照，」 / 「我们将为你生成专属的3D数字分身，用于虚拟试衣。」 In the `new` context: 「上传「{name}」清晰的全身照和生活照，」 / 「我们将为 TA 生成专属的3D数字分身，用于虚拟试衣。」
  - Three-step stepper (aria 「创建进度」): 「上传照片」 (current) → 「生成建模」 → 「完成」. Finished steps show ✓, and the current step has `aria-current="step"`.
  - Two cards side by side with the same structure:
    - **全身照**: 「上传全身照」, 「展示你的身材和体型特征」. Sample image `assets/people/upload-fullbody.webp`. Tips 「请上传正面、站立的全身照片」 / 「建议光线充足，背景简洁」.
    - **生活照**: 「上传生活照」, 「展示你的面部特征和气质」. Sample image `assets/people/upload-portrait.webp`. Tips 「请上传清晰、自然的正面照」 / 「建议素颜或淡妆，五官清晰」.
    - Each card has a tall photo frame that shows the sample until the user uploads. A round button sits at the bottom centre of the frame. It is a `<label>` wrapping a hidden `<input type="file" accept="image/*">`, with a ＋ icon and aria 「上传全身照」 / 「上传生活照」. The tips sit under the frame.
  - After an upload, the card shows the user's photo (alt 「已上传的全身照预览」 / 「已上传的生活照预览」) with a badge at the top left (check icon + 「已上传」). The button turns into ↻ with aria 「重新选择全身照」 / 「重新选择生活照」. The tips become check icon + 「已上传：{file name}」 / 「点击按钮可重新选择」; names over 14 characters show the first 13 plus 「…」.
- Fixed bottom CTA, outside the scroll area, with a fade above it: dark 「生成我的数字分身」 (first launch), 「重新生成数字分身」 (from 我的形象) or 「生成数字分身」 (`new`), each followed by a → icon.

**Interactions.**
- Back → pop to `/welcome` (first launch), `/me/avatar` (我的形象) or the screen that opened 新建数字分身 (`new`; nothing is created).
- Photo button → native file picker. While a file is processed, that slot shows a 「处理中…」 overlay with a spinner and its input is disabled. Then `readImage(file)` runs:
  - The type must start with `image/`, otherwise toast 「请选择图片文件（JPG / PNG / HEIC 等）」.
  - Files over **25 MB** (25×1024×1024 bytes) get the toast 「图片超过 25MB，请换一张」.
  - The file is decoded with `<img>`. If decoding fails, toast 「无法读取这张图片，请换一张试试」.
  - The image is downscaled so the **longest side is at most 900 px** (it is never upscaled), then re-encoded as a **JPEG at quality 0.8** data URL. The slot stores `{ src, name, w, h }`.
  - On success, toast 「全身照已上传」 / 「生活照已上传」 (check icon). If the avatar was `'ready'`, it becomes `'stale'`. Picking again replaces the photo. This screen has no delete control.
- 「跳过」 (first launch only) → sets `avatar.status = 'ready'` and `demo = true` if not already ready, then calls `enterMain()`: 首页 with a fade, history cleared. 300 ms later it shows the toast 「已使用示例数字分身，可在「我的 → 我的形象」中更换」 **[demo]**.
- In the `new` context the photos go to a draft, not to the active avatar. The draft is emptied when the screen is pushed and kept when the user comes back to it (a reload loses it); nothing reaches the store until generation finishes.
- CTA → `runGeneration(app, usingSamples, ctx)`, where `usingSamples = !fullbody || !portrait` and `ctx` is `'new'` when `params.ctx === 'new'`, `'profile'` when `from === 'profile'`, otherwise `'launch'`. The CTA is never disabled: generating without photos is allowed, and the sample photos are used instead.

**Overlays.**
- **Generation layer** (`runGeneration`). It is full screen (aria 「正在生成数字分身」) and sits above everything. **[demo]**: there is no backend.
  - Content: a fake status bar; the stepper at step 2 (「上传照片」 ✓, 「生成建模」 current); the full-body photo (uploaded or sample) in a frame with an animated scan line and grid; a large 「{n}%」 readout (aria-live) and a progress bar (aria 「生成进度」); a four-item checklist 「解析身材比例与体型特征」「识别面部特征与发型」「构建数字分身模型」「匹配肤色与光影细节」; the note 「未上传全部照片，演示将使用示例照片」 when `usingSamples`; and a 「取消」 button in the footer.
  - Timing: progress runs **4200 ms** (900 ms with reduced motion), eased with `1 − (1 − t)^1.6`. Checklist item *i* (0–3) is highlighted while progress is between i×24 % and (i+1)×24 %, and ticked from (i+1)×24 %. The result appears **350 ms** after progress reaches 100 %.
  - 「取消」 → closes the layer and shows the toast 「已取消生成」. The store is unchanged, unless 取消 is pressed after progress reaches 100 % (HANDOFF §13.2 #2). Esc and back also close the layer, but without the toast.
  - Result (`finish`): the store gets `avatar.status = 'ready'`, `generatedAt = Date.now()` and `demo = true`. The stepper moves to step 3. The layer shows `assets/people/avatar-base.webp` (always the preset, never the user's photos), 「数字分身已生成」 and two lines: 「演示原型使用预设的数字分身（2D 形象预览）。」 / 「真实产品将基于你上传的照片进行三维重建。」 **[demo]**. When `usingSamples` it also shows the toast 「已使用示例照片生成演示分身」. The primary button gets focus.
  - Finish buttons depend on the context:
    - `launch`: 「进入虚拟试衣间」 (→ icon) calls `enterMain()`, which sets `setupDone`, clears history and shows 首页. 「重新上传照片」 closes the layer and stays on this screen; the avatar stays `'ready'`.
    - `profile`: 「完成」 closes the layer, pops back to 我的形象 `/me/avatar` and shows the toast 「数字分身已更新」 (check icon). 「去首页试穿」 makes a contextual tab jump to 首页 `/home`. 我的 keeps `/me/avatar/upload` on its stack, so tapping 我的 afterwards shows this upload screen again.
    - `new`: the result creates the avatar first (`VT.store.avatars.create(name, { status: 'ready', fullbody, portrait, generatedAt, demo: true })`), with an empty wardrobe and outfit, and makes it the active avatar. 「完成」 closes the layer, pops back to the screen that opened 新建数字分身 and toasts 「已切换到「{name}」」 (check icon). 「去首页试穿」 drops this screen from every stack, then goes to 首页 (pop on 首页's own stack, fade from 个人衣橱) and shows the same toast 300 ms later. 取消, Esc and back before the result create nothing.
    - `hub` (started from 我的形象's 「重新生成」 through `VT.avatarGen.run`): the same two buttons. 「完成」 closes the layer and re-renders 我的形象 in place, which then shows 「更新于 …」, with the toast 「数字分身已更新」. 「去首页试穿」 goes to 首页.

**Data.** Reads `avatar.fullbody`, `avatar.portrait` and `avatar.status`. Writes:
- `avatar.fullbody` / `avatar.portrait` = `{ src: JPEG data URL, name, w, h }`
- `avatar.status`: `'none'` → `'ready'`, or `'ready'` → `'stale'` when a new photo is uploaded
- `avatar.generatedAt`
- `avatar.demo` (written but never read anywhere)
- `setupDone` (through `enterMain`)

Side effect: `avatar.portrait.src` doubles as the fallback profile picture (`VT.ui.profilePhoto`, ui.js:93) on 我的, 编辑资料 and the AI造型师 user bubble, and as the thumbnail on the 我的形象 row of 我的 (10-profile.js:45). Keep `data-keep-scroll="av"`. The busy slot is transient UI state.
**`VT.avatarGen` = `{ run(app), readImage(file, max = 900, quality = 0.8) }`.** `run` starts the generation in the `hub` context. Only 我的形象's 「重新生成」 calls it. 首页 uses `readImage` for garment photos (`520`, `0.82`). The other uploaders have their own copies with slightly different JPEG quality (for example 06-wardrobe.js:217, 09-orders.js:283, 10-profile.js:15), so the web build can share one helper.

**States & edge cases.**
- First launch vs 我的形象 vs `new`: only 「跳过」, the lead, the CTA label, the back target, where the photos are kept and the finish buttons differ. Uploads and generation work the same way.
- A deep link without `from` behaves like first launch (its parent is 启动页).
- `'stale'` means the photos changed since the last generation. Until the user regenerates, 我的形象 shows 「示例形象」 / 「尚未用你的照片生成」, and 启动页's 「开始体验」 sends `'stale'` to this screen.
- HEIC files pass the type check, but browsers other than Safari usually can't decode them, so they get 「无法读取这张图片，请换一张试试」.
- Edge case: pressing Esc in the last ~280 ms of progress still completes the generation after the layer has gone (status `'ready'`, and the samples toast if `usingSamples`).

**Components used.** `VT.ui.statusBar`, `VT.ui.backBtn`, `VT.ui.img`, `.scroll`, `.btn--dark.btn--xl` + `.btn-arrow`, `.btn--ghost.btn--lg.btn--block`, `.spinner`, `.sr-only` file input, the local `stepper()` (`.av-steps`), `app.layer`, `app.toast`, `app.refresh`, `app.enterMain`, `app.back`, `app.go`.

**Acceptance checks.** `开始体验 → avatar creation` · `photo upload previews` · `non-image rejected` · `AC1: setup complete → 首页 (virtual fitting room)` · `setupDone stored` · `我的形象 → 上传照片` (asserts there is no 「跳过」) · `generate → back to 我的形象` · `重新生成 stays on 我的形象` (`VT.avatarGen.run`, hub context).


## The five tabs

### 3. 首页 · 虚拟试衣间 · `fitting`

**Route** `/home` · **Type** tab root · **Prototype** `js/screens/03-fitting.js`, `css/screens/03-fitting.css`, `js/camera.js` (video try-on and 拍摄衣服), `js/screens/12-avatar-hub.js` (the 切换角色 sheet), `js/store.js` (digital avatars) · **Design ref** `reference/design/screens/03_fitting_room_v2.webp` (the single-column selector, 拍照 and the header) and `reference/design/fitting-upload-flow.png` (拍照 / 上传 → 临时试穿 → 自主保存). The original `reference/design/screens/03_fitting_room.png` and phone 1 of `reference/design/five-screen-mockup.png` still show the avatar, plate and category menu.

**Purpose.** Dress the active digital avatar by picking garments by category; try on photos of the user's own garments without saving them; switch avatar and backdrop; open a live camera preview ("video try-on").

**Layout (top → bottom).** A fixed composition. Only the garment rail scrolls. Positions below are at 390 × 844 and include the 44 px status bar (HANDOFF §4.2).
- One continuous plate behind everything (`assets/backgrounds/fitting-plate.webp`), tinted by the backdrop chosen with 切换场景 (`s.fitScene`, default 暖灰). Each backdrop is the same texture with a CSS filter; mid-plate results: 暖灰 `brightness(1.14) saturate(.9)` #D0C0B0 · 奶白 `brightness(1.31) saturate(.5)` #E8DED4 · 燕麦 `sepia(.15) brightness(1.22) saturate(.8)` #E5D4C1 · 深咖 `sepia(.2) brightness(.44) saturate(1.7)` #5A4C3D. On 深咖 the title, the unselected menu labels and the rail note turn light (#F7F1EA / #EFE6DC). Fake status bar (light): drop it.
- Header:
  - Top left, stacked 6 px apart from y 48: two ivory pills (34 px, `rgba(250, 246, 241, .92)`), 「切换角色」 (`person` icon, chevron-down; aria 「切换角色，当前：{name}」, `aria-haspopup="dialog"`) and 「切换场景」 (`home` icon, chevron-down).
  - Centre: h1 「虚拟试衣间」, 18 px / 900, centred on the screen and on the pill stack (line box y 71–99).
  - Top right: the coral pill 「开启视频试衣」 (`.fit-cam`, 36 px, #F3D5CD): a 30 px coral circle (#D9897A) with the white `video` outline icon, the 11 px label and a chevron-right; aria 「开启视频试衣（摄像头预览）」.
  - Under 390 px wide the title drops to 17 px and the coral pill loses its chevron, so the title keeps clear of both sides down to 360 px.
  - There is no back button: this is a tab root.
- Avatar: a full-height image of the current render (box top 110, standing on the tab bar), with a soft floor shadow. It is not interactive. Alt 「数字分身当前造型：{render.label}」.
- Left menu (nav, aria 「服装分类」) from y 136: seven pills from `data.fitCats` (46 px, 8 px apart; 40 px and 6 px on screens 800 px tall or less): 「上装」「下装」「连衣裙」「外套」「鞋履」「包包」「配饰」. The active pill is light, with the filled icon variant and a bold label (`aria-pressed`).
- Right: the garment picker, right-aligned 8 px from the edge, from y 114 to 10 px above the tab bar.
  - Source tabs (`role="tablist"`, aria 「单品来源」): 「推荐」 and 「我的上传」 in an ivory pill; the selected tab is a dark brown pill (#5B4B42) with white text (`aria-selected`).
  - Below them the rail (aria 「可试穿单品」, `data-keep-scroll="rail"`), the only scrolling region: a 76 px wide translucent track (`rgba(255, 251, 246, .18)`, radius 18) holding one column of 64 × 64 px tiles, 8 px apart, radius 12, on #ECE4DB. The selected tile has a 1.5 px muted coral ring (#D48B7A) and `aria-pressed`; aria 「试穿{name}」 / 「取消试穿{name}」.
  - **推荐**: every garment in the category's full list (`data.fitCatsAll`), those that at least one render wears first, then the rest, each group in list order (`recItems`). 28 try-on garments in all. 上装 shows 14: black-blazer and basic-cami, then knit-cardigan, striped-shirt, beige-blazer, oxford-shirt, utility-jacket, grey-hoodie, black-sweater, bow-blouse, white-tee, white-shirt, brown-sweater, ribbed-tank. Image-ready garments by category: 上装 black-blazer, basic-cami · 下装 straight-jeans · 连衣裙 satin-slip-dress · 外套 black-blazer · 鞋履 white-sneakers, black-pumps, strappy-heels · 包包 brown-tote, black-handbag · 配饰 gold-hoops.
  - **我的上传**: first a camera tile (aria 「上传{category}照片」, opens the 拍照 menu), then this session's uploads filed under the active category, newest first (aria 「试穿{name}（临时上传）」). With none, the note 「还没有上传的{category}」 sits under the camera tile.
- Bottom left, 14 px above the tab bar:
  - 「拍照」: an ivory pill (38 px, `camera` icon; `aria-haspopup="menu"`, `aria-expanded`).
  - Above it, only while an upload is being tried on, the **临时试穿 card** (116 px): the newest worn upload's thumbnail and 「临时试穿」, the note 「演示版暂无上身图」 **[demo]**, and a dark 「＋ 加入衣橱」 button (aria 「将{name}加入衣橱」). Once the active avatar's wardrobe holds that upload, the button reads 「✓ 已在衣橱」 and is disabled. On screens 700 px tall or less the card is just its button.
- Tab bar, with 首页 active.

**Interactions.**
- Category pill → sets `fit.cat`. The menu, source tabs, rail and card re-render in place, the rail scrolls to the top, and focus stays on the pill.
- 「推荐」 / 「我的上传」 → switches the rail's source; the category stays. The rail scrolls to the top and focus stays on the tab.
- Garment tile (推荐) → toggles the garment in `fit.outfit` (see the slot rules below). The rail re-renders and keeps its scroll position and focus. The avatar then cross-fades to `pickRender(outfit).render`: the new image fades in and the old one is removed after 450 ms. Nothing happens if the render doesn't change. Toasts:
  - Item added and listed in `missing`: 「演示版暂无「{name}」的上身图，已加入当前搭配」 for 2800 ms **[demo]**.
  - Item added and shown: 「已试穿：{name}」.
  - Item removed: no toast. A garment without a render stays on the rail, so focus stays on its tile.
- Upload tile (我的上传) → toggles the upload in the slot of the category it was filed under (上装 → `top`, 下装 → `bottom`, 连衣裙 → `dress`, 外套 → `outer`, 鞋履 → `shoes`, 包包 → `bag`, 配饰 → `acc`), with the same slot rules. The outfit stores `up:{id}`. An upload is never drawn onto the avatar: `pickRender` counts it as missing, so the render changes only when the slot rules take something else off. Added → 「演示版暂无「{name}」的上身图，已加入临时试穿」 for 2800 ms **[demo]**; removed → no toast.
- 「拍照」 or the camera tile → the 拍照 menu (see Overlays).
- 「加入衣橱」 → adds the upload to the front of the **active avatar's** wardrobe as `{ uid, custom: { src, name, cat: slot }, fav: false, source: 'uploaded', addedAt: now, fromUpload: upload.id }` and sets `wardrobeCat = 'all'`. The button becomes 「已在衣橱」. Toast 「已加入个人衣橱」 (check icon), or 「已加入「{avatar name}」的衣橱」 when there is more than one avatar, with the action 「去看看」 (contextual jump to 个人衣橱). A second save is impossible: the button reads the wardrobe for an entry with that `fromUpload`. Removing that entry from the wardrobe brings 「加入衣橱」 back.
- While the 临时试穿 card shows, toasts sit above it (tab bar + 186 px), so 加入衣橱 stays reachable.
- 「开启视频试衣」 → opens the camera layer (see Overlays).
- 「切换场景」 → the scene sheet. 「切换角色」 → the 切换角色 sheet.
- Tapping the 首页 tab while already on 首页 smooth-scrolls the rail to the top. Other tabs switch instantly, and this screen keeps its state.

**Slot rules.**
- There are seven slots: `top`, `bottom`, `dress`, `outer`, `shoes`, `bag`, `acc`. Each slot holds one garment or one upload.
- A product's slot comes from its `cat` (`data.slotOf`), not from the menu. 「上装」's full list includes four outerwear items (knit-cardigan, beige-blazer, black-blazer, utility-jacket), which fill `outer` and also belong to 「外套」; when one is selected it shows the ring in both lists. An upload's slot comes from the category chosen in 确认衣物照片.
- Tapping a selected item removes it. Tapping another item for an occupied slot replaces the current one.
- `dress` and `top`/`bottom` exclude each other: picking a dress clears both top and bottom, and picking a top or bottom clears the dress. `outer`, `shoes`, `bag` and `acc` combine with anything, including a dress.
- `VT.tryOn` (05-product.js:197) applies the same rules when another screen sends garments here, and switches the rail back to 推荐.

**Outfit → render (`pickRender`, exported as `VT.fitting.pickRender`).** Only four on-body images exist (`data.renders`) **[demo]**:

| render | label | wears |
|---|---|---|
| `base` | 数字分身 · 基础造型 | top basic-cami, bottom straight-jeans, shoes white-sneakers |
| `look1` | Look 1 · 休闲时髦 | base + bag brown-tote |
| `look2` | Look 2 · 摩登气质 | basic-cami, straight-jeans, outer black-blazer, bag black-handbag, shoes black-pumps |
| `look3` | Look 3 · 优雅迷人 | dress satin-slip-dress, bag black-handbag, shoes strappy-heels, acc gold-hoops |

How a render is chosen:
- Each render gets a score. For every **selected** slot:
  - +3 if the render wears that exact item;
  - −2 if it wears a different item in that slot;
  - −2 if the slot is `dress` and the render wears a top or bottom, or the slot is `top`/`bottom` and the render wears a dress;
  - −0.5 in every other case.
- For every **unselected** slot among `outer`, `bag`, `acc`, `dress` and `shoes`, the render loses 0.3 if it wears something there that `base` doesn't.
- The highest score wins. On a tie the earlier render wins, in the order base, look1, look2, look3.
- `missing` lists the selected items the winning render doesn't wear, in slot order from top to acc. Uploads are always in it.
- Only the 10 image-ready garments can ever be rendered. The other 18 try-on garments always end up in `missing`. The catalogue's 29th product, maxi-skirt, is in no try-on category at all (HANDOFF §13.2 #35).

Scores for the verified outputs (winner in bold):

| outfit | base | look1 | look2 | look3 | result |
|---|---|---|---|---|---|
| `{}` | **0** | −0.3 | −0.9 | −1.2 | base |
| `{outer: black-blazer}` | −0.5 | −0.8 | **2.4** | −1.7 | look2 |
| `{dress: satin-slip-dress}` | −2 | −2.3 | −2.9 | **2.1** | look3 |
| `{top: grey-hoodie}` | **−2** | −2.3 | −2.9 | −3.2 | base, missing [grey-hoodie] |
| `{top: basic-cami, bottom: straight-jeans, shoes: white-sneakers, bag: brown-tote}` | 8.5 | **12** | 1.7 | −8.6 | look1 |
| `{outer: black-blazer, dress: satin-slip-dress}` | −2.5 | −2.8 | 0.4 | **1.6** | look3, missing [black-blazer] |

Port the rule as it is, because acceptance checks depend on it. One known side effect: a garment that has imagery can still be reported as missing when it is combined with an item from another render. For example, `{shoes: white-sneakers, dress: satin-slip-dress}` gives base with missing [satin-slip-dress], and `{shoes: white-sneakers, outer: black-blazer}` gives base with missing [black-blazer]. The 「演示版暂无…」 toast then names that garment.

**Overlays.**
- **拍照 menu** (`app.layer`, class `ov--pop`, aria 「上传衣物」). A transparent scrim and an ivory card (radius 16, with a tail) anchored 10 px above 「拍照」, holding two menu items: 「拍摄衣服」 (`camera` icon) and 「从相册上传」 (`image` icon), split by a hairline. It scales in from its tail. Focus moves to the first item. Esc, back, a tap outside or choosing an item closes it and returns focus to 「拍照」.
  - 「拍摄衣服」: on touch devices (`pointer: coarse`) it clicks a hidden `<input type="file" accept="image/*" capture="environment">`, which opens the phone's own camera. Elsewhere it opens the 拍摄衣服 layer.
  - 「从相册上传」: clicks a hidden `<input type="file" accept="image/*">`.
  - A picked file goes through `readImage(file, 520, 0.82)`: image type, at most 25 MB, decodable, longest side ≤ 520 px, JPEG 0.82. Errors toast 「请选择图片文件（JPG / PNG 等）」, 「图片超过 25MB，请换一张」 or 「无法读取这张图片，请换一张」. Then the 确认衣物照片 sheet opens.
- **拍摄衣服 layer** (`VT.camera.capture(app, { onShot, onGallery })` in `js/camera.js`; full screen and dark, aria 「拍摄衣服」).
  - It starts the camera at once, with no intro: `getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`.
  - Always shown: ✕ (aria 「关闭拍摄」) and the title pill 「拍摄衣服」.
  - States: wait (spinner, 「正在打开摄像头…」) → live, or error. Live shows the video, mirrored only when the track reports `user`, the tip 「将衣服平铺拍摄，完整放进画面」 and a round shutter (aria 「拍照」, focused; disabled until live). Error shows a title and body from the camera error table below, 「重试」 and 「从相册上传」 (closes the layer and opens the file picker; focused).
  - Shutter → draws the current frame, unmirrored, downscaled to ≤ 520 px, JPEG 0.82; closes the layer; opens 确认衣物照片 with the name 「我的衣物」.
  - Every track stops when the layer closes for any reason. A stream that resolves after closing is stopped at once (a `closed` flag).
- **确认衣物照片 sheet** (class `ov--fitup`).
  - The photo (contained in a 220 px box on `--tile`).
  - 「名称」 (max 16; pre-filled with the file name without its extension, or 「我的衣物」 for camera shots and camera-roll names such as IMG_0042, image, 微信图片).
  - 「分类」 chips with the seven 首页 categories, the active category pre-selected (`aria-pressed`).
  - The note 「照片只在本次试衣中临时保留，加入衣橱即可长期保存」.
  - 「重新选择」 (ghost): picks again from the same source (the gallery picker, the phone camera or the 拍摄衣服 layer). A new photo replaces the one in the sheet and keeps the chosen category.
  - 「确认试穿」 (dark, focused when the sheet opens).
  - ✕, a tap on the scrim, Esc and back cancel: nothing is kept.
  - 确认试穿 (a blank name becomes 「我的衣物」) adds the upload to the front of 我的上传, switches the rail to 我的上传, sets `fit.cat` to the chosen category, puts the upload on (slot rules), focuses its tile and toasts 「演示版暂无「{name}」的上身图，已加入临时试穿」.
- **切换场景 sheet.** Title 「切换场景」. Four options in a row (`role="radiogroup"`, aria 「试衣间背景」): 暖灰, 奶白, 燕麦, 深咖. Each is a 3:4 swatch of that backdrop with the base avatar standing in it, over its name. The current one has an ink ring and a bold name (`aria-checked`). Tapping one stores `fitScene` and changes the backdrop at once, visible behind the sheet; the sheet stays open. Note 「场景只更换试衣间的背景，不影响当前搭配」.
- **切换角色 sheet** (`VT.avatarUI.switcher(app)`, also opened from 个人衣橱).
  - Title 「切换角色」, then a radiogroup (aria 「数字分身」) of `.opt` rows: the avatar's portrait (its 生活照, else 本人's profile photo, else the demo face), its name (本人's is the profile nickname, followed by the tag 「本人」), 「衣橱 {n} 件 · 已生成」 or 「衣橱 {n} 件 · 示例形象」, and a radio.
  - Tapping another avatar switches to it (HANDOFF §9.15), closes the sheet, re-renders the current screen and toasts 「已切换到「{name}」」 (check icon). Tapping the active one just closes the sheet.
  - Below the list: a ghost 「＋ 新建数字分身」 and the note 「每个数字分身都有自己的衣橱和搭配」 / 「演示版的数字分身均使用示例模特形象」 **[demo]**.
- **新建数字分身 sheet.** Lead 「为家人或朋友创建一个数字分身，TA 的衣橱和搭配与你的分开保存。」. 「名称」 field (max 8, placeholder 「例如：家人、朋友」, Enter submits). A dark 「下一步：上传照片」: a blank name toasts 「请填写名称」; otherwise it pushes the upload screen in its `new` context (§2) on the current tab.
- **Video try-on camera layer** (`VT.camera.open(app)` in js/camera.js). It is full screen and dark, with aria 「视频试衣」. **[demo]**: it is a camera preview only, with no AI garment replacement.
  - Always shown:
    - ✕ at the top left (aria 「关闭视频试衣」).
    - A centre pill 「视频试衣 · 预览」 with a dot that is grey, and turns red and blinks while live.
    - A camera-switch button at the top right (aria 「切换前后摄像头」). It stays hidden until the preview is live and `enumerateDevices()` finds at least 2 cameras.
    - The footer 「实时 AI 换装需接入试衣模型服务，当前原型仅提供摄像头预览」.
    - A full-bleed `<video playsinline muted autoplay>` (aria 「摄像头实时画面」), visible only while live.
  - The layer moves through these states:
    1. **intro** (permission explainer): 「开启视频试衣」 and two lines, 「开启摄像头后，你可以在镜头前实时预览自己。」 / 「画面只在本机显示，不会上传或保存。」. Buttons: 「允许使用摄像头」 (focused when the layer opens) and 「暂不开启」 (closes the layer).
    2. **wait**: a spinner with 「正在请求摄像头权限…」.
    3. **live**: the panel hides and the video shows. Or **error**: a title and body from the table below, with 「重试」 (starts again) and 「返回试衣间」 (closes the layer).
  - Start: `getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`. The front-camera preview is mirrored. It is not mirrored when the track reports `environment`, or when the code assumes `environment`.
  - Switch: moves to the next `videoinput` by exact `deviceId`, flips the assumed facing direction and restarts the stream. The toast 「已切换摄像头」 shows immediately, before the new stream starts.
  - Stop conditions: the layer stops every track and clears the video whenever it closes. That covers ✕, 「暂不开启」, 「返回试衣间」, Esc, back, and any navigation, because navigation closes all overlays. Every start, retry and switch stops the previous stream first. A stream that arrives after the layer has been removed is stopped at once. The prototype tests whether the layer is still in the DOM, so a stream that arrives during the 280 ms close animation is never stopped. The web build should track a "closed" flag instead. Nothing stops the camera when the page is hidden: there is no visibility handler.
  - Focus: when the preview goes live, the focused 「允许使用摄像头」 button is hidden and focus falls to the page body. The prototype handles Esc only inside the app, so from then on Esc no longer closes the layer. The web build should move focus to ✕.

Camera error copy (`errorCopy`, shared by both camera layers):

| cause | title | body | 重试 |
|---|---|---|---|
| Permissions Policy blocks the camera, or permission is denied while embedded (**embedded preview only: drop it**) | 当前页面无法使用摄像头 | 在线预览嵌在受限页面中，浏览器不允许调用摄像头。下载项目后用 localhost 或 HTTPS 打开，即可体验视频试衣。 | hidden |
| `NotAllowedError`, `PermissionDeniedError`, `SecurityError` | 没有获得摄像头权限 | 请在浏览器地址栏左侧的「网站设置」中允许使用摄像头，然后点击重试。 | shown |
| `NotFoundError`, `DevicesNotFoundError`, `OverconstrainedError` | 未检测到可用的摄像头 | 请确认设备已连接摄像头，或换一台带摄像头的设备打开原型。 | shown |
| `NotReadableError`, `TrackStartError` | 摄像头正被占用 | 摄像头可能正被其他应用使用，请关闭后重试。 | shown |
| no `mediaDevices.getUserMedia` (insecure context) | 当前环境不支持摄像头 | 摄像头需要在 HTTPS 或 localhost 环境下使用，请用 README 中的本地服务器方式打开原型。 | shown |
| anything else | 无法开启摄像头 | 请稍后重试。 | shown |

**Data.**
- Reads `fit.cat`, `fit.outfit`, `fitScene`, `avatars`, `activeAvatar`, `profile.name`, `wardrobe` (for 已在衣橱) and this session's uploads, plus `data.fitCats`, `data.fitCatsAll`, `data.byId`, `data.slotOf` and `data.renders`.
- Writes `fit.cat`, `fit.outfit` (product ids, or `up:{id}` for uploads), `fitScene`, `wardrobe` and `wardrobeCat` (加入衣橱); the avatars go through `VT.store.avatars` (HANDOFF §9.15).
- `fit.outfit` belongs to the active avatar; `fit.cat` and `fitScene` are shared by all avatars. All of these are persisted. Keep `data-keep-scroll="rail"`.
- **Session uploads (我的上传)**: `sessionStorage['vt-fit-uploads-v1']` = `[{ id, src (JPEG data URL), name, cat (首页 category id), at }]`, newest first. They last for the browser session: a reload keeps them, a new tab or a closed browser doesn't. 「重置演示数据」 clears them. They are shared by all avatars. Outfit entries that point at an upload that no longer exists are dropped when 首页 renders.
- The rail's source (推荐 / 我的上传) lives in memory, default 推荐. `VT.tryOn` sets it back to 推荐 (`VT.fitting.showRecommended()`).

`VT.tryOn` also writes `fit` when another screen sends garments here: 商品详情 试穿上身, 个人衣橱, AI造型师 looks and 我的收藏. It applies the same slot rules, sets `fit.cat` to the first `data.fitCatsAll` entry that lists the first item, skipping 「上装」 unless the item is a top or outer garment (`05-product.js:211`). A garment without a render still opens its own category (utility-jacket opens 「上装」, brown-blazer 「外套」), and a garment in no category (maxi-skirt) leaves `fit.cat` as it was. It forces the active avatar to `'ready'`, then makes a contextual jump to this screen. 420 ms later `VT.tryOn` shows its own toast here: 「已为你的数字分身换上所选单品」, or the 「演示版暂无…」 message for the first of the sent items that is missing (3000 ms).

This screen doesn't read uploaded avatar photos or `avatar.status`; every avatar is shown with the preset renders **[demo]**.

**States & edge cases.**
- Fresh state: 「上装」 is active, 推荐 is selected and the outfit is empty, so the `base` render shows. The rail shows 14 thumbnails, black-blazer and basic-cami first, and none is marked selected, even though the base avatar wears the cami, jeans and sneakers.
- A garment without a render is always on 推荐; tapping it gives the 「演示版暂无…」 toast and tapping it again takes it off. (This replaces the earlier rule that listed only image-ready garments; HANDOFF §13.2 #34 no longer applies.)
- maxi-skirt is in no `data.fitCatsAll` list. Sent here (商品详情 「试穿上身」), it joins the outfit as `bottom` with the 「演示版暂无…」 toast but never shows on the rail, so it can't be tapped off; only another bottom or a dress replaces it (HANDOFF §13.2 #35).
- 我的上传 is empty in a new session: the camera tile and 「还没有上传的{category}」.
- The same upload can be saved once per avatar: 加入衣橱 always writes to the active avatar's wardrobe.
- Once `setupDone` is true, every launch opens this screen. Before setup is finished it is never shown; the path is onboarding → avatar → 首页.
- There are no loading or error states apart from the camera layers and the image checks. All images are local.

**Components used.** `VT.ui.statusBar('light')`, `VT.ui.img`, `VT.ui.tabBar('fitting')`, `.scroll`, `.chip`, `.field` / `.field-row`, `.btn--ghost` / `.btn--dark` `.btn--lg`, `.sheet-actions`, `.sheet-note`, `.opt` / `.radio` (切换角色), `VT.icon` (category icons and their `-filled` variants, `person`, `home`, `chevron-down`, `chevron-right`, `video`, `camera`, `image`, `plus`, `check`), `app.sheet`, `app.layer`, `app.toast`, `app.later`. Camera: `app.layer`, `.btn--light.btn--lg.btn--block`, `.spinner`, `VT.icon` (`close`, `switch-camera`, `info`).

**Acceptance checks.** `AC1: setup complete → 首页 (virtual fitting room)` · `AC3: tab → fitting` · `AC2/4: fitting has one bar with the 5 tabs` · `tab switch to fitting is instant` · `fitting has no back button (primary)` · `outfit change: blazer → look2 render` · `outfit change: dress → look3 render` · `首页 rail lists image-ready garments first` · `honest toast for garments without imagery` (grey-hoodie sent through `VT.tryOn`, as from 商品详情) · `garment without a render can be tapped off` · `camera preview live (getUserMedia)` · `camera stops on close` · `look → 首页 with outfit` · `AC1: relaunch after setup opens 首页` · `mobile: relaunch opens 首页` · `mobile: tabs work` · `首页 header: 切换角色 · 切换场景 · 开启视频试衣` · `拍照 opens 拍摄衣服 / 从相册上传` · `upload → 我的上传, tried on, not in the wardrobe` · `加入衣橱 saves the upload once` · `我的上传 lasts for the browser session` · `拍摄衣服 captures a photo (getUserMedia)` · `切换场景 changes the backdrop` · `新建数字分身: its own empty wardrobe, now active` · `切换角色 back to 本人 restores her wardrobe`. `board phone opens simulator on 首页` exists only for the showcase board.


### 4. 购物广场 · `plaza`

**Route** `/plaza` · **Type** tab root · **Prototype** `js/screens/04-plaza.js`, `css/screens/04-plaza.css`; stores in `js/data.js` (`stores`, `storeOf`, `seedStoreFavs`, `seasonPicks`) · **Design ref** `reference/design/screens/04_shopping_plaza.png`. The mockup predates the stores redesign (514de38): it has a bell, no store bar, banners or store header, and taller cards in the first rows. For those parts the prototype is the only reference.

**Purpose.** Shop across stores: search every store and product, switch between the user's favourite stores, filter by category, and browse a two-column feed with wishlist hearts. It is also the entry point to product details, the store sheets, the one-item checkout (购物袋) and 商家消息.

**Layout (top → bottom).**
- Header (fixed): h1 「购物广场」 on the left. On the right are two icon buttons: 购物袋 (aria 「购物袋」) and 商家消息 (chat-dots icon; aria 「商家消息」, or 「商家消息，{n} 条未读」 when store chats have unread messages). The second carries a red count badge (`.pz-badge`, 16 px, `#C8473D`) with the unread total over all store chats, 「99+」 above 99, hidden at 0. REPORT deviation 5 still applies: the newer mockup drops both icons, the prototype keeps them.
- Search pill (fixed): search icon plus `<input type="search">` with placeholder 「搜索商家、品牌或单品...」 (aria 「搜索商家、品牌或单品」, `enterkeyhint="search"`). A scan button (aria 「拍照找同款」) sits at the right end of the pill. There is no inline clear (×) button: the native WebKit cancel button is hidden.
- Favourite-stores bar (fixed, scrolls sideways with a hidden scrollbar, `data-keep-scroll="pz-stores"`). A tablist (aria 「收藏的商家」) of 60 px items, each a 46 px round logo over a one-line 10 px label (at most 66 px, then ellipsis):
  - 「全部」 first (grid icon on `#F1ECE6`), then one item per favourite store in `s.storeFavs` order, labelled with the store's `name`. A store's logo is its monogram (`mono`) in its `fg` colour on its `bg` colour; a monogram longer than two letters (only 「ZARA」) is set as a serif wordmark (`.st-logo.is-word`: Didot, Bodoni 72, Times New Roman; local fonts only, nothing is downloaded).
  - The chosen item (`aria-selected`) gets a dark ring around its logo (`box-shadow: 0 0 0 2px #FAF6F0, 0 0 0 3.6px #393532`) and a bold dark label.
  - After the tablist, in the same scroller: a button with a + in an outlined circle, labelled 「管理」, or 「收藏商家」 when the user has no favourite stores.
- Category chip row (fixed, scrolls sideways, `role="tablist"` aria 「商品分类」): 「全部」「上衣」「下装」「外套」「连衣裙」「鞋包」「配饰」 (`data.plazaCats`). The active chip is dark (`.chip.is-on`, `aria-selected`).
- Feed (`.scroll.pz-scroll`, the only vertical scroller): a head, then the product grid. While a query is active, search results replace both (see Interactions).
  - **Head for 全部:** the platform banner carousel. Two full-width slides, `assets/plaza/banners/platform-new-season.webp` and `platform-autumn.webp` (aspect ratio 2.95, radius 12; the second loads lazily), in a horizontal scroll-snap track (`data-keep-scroll="pz-ban"`). Two dots at the bottom centre follow the swipe (5 px; the current one 12 px wide and white). No autoplay. Each slide is a button, aria 「NEW SEASON 秋日灵感穿搭，探索本季精选单品」 and 「秋日灵感穿搭，精选单品，定义新季风格」; their visible text is part of the images.
  - **Head for ZARA** (the only store with a `banner`): one full-width banner button (`assets/plaza/banners/zara.webp`, aspect ratio 2.31, radius 12), aria 「ZARA 2024 秋冬系列：简约与质感的日常时装，进入店铺」.
  - **Head for any other store:** a store card (`#F2EDE7`, radius 14): 40 px logo, the store's full name (bold), 「{tagline} · 在售 {n} 件」 and a pill button 「店铺详情 ›」.
  - **Grid:** 2 columns in `data.plazaOrder` order, filtered by the chosen store and the active chip. All matching products render at once (29 for 全部), with no pagination. Rows are top-aligned, not masonry.
  - Each card has: an image in a fixed 1 : 0.95 box (`aspect-ratio: 1 / .95`), a heart at top-right, `cardName` (one line, ellipsis), `tags` (one line), and a row with `¥{price}` plus up to 4 colour dots (`p.dots`) and `+N` (`p.dotsMore`; aria `{n} 种颜色`). The first 6 images load eagerly, the rest use `loading="lazy"`.
  - Card image: `img.plaza` (the plaza asset pack's model photo or cleaned-up shot), else `img.card`, with `object-fit: cover`. Model photos (`assets/plaza/models/`: knit-cardigan, straight-jeans, brown-blazer, maxi-skirt) are anchored at 50% 24%, `cardFocus: 'top'` products (basic-cami, pleated-skirt) at the top, and everything else is centred; `small` products are contained on a `#F2EEE9` plate with 12 px padding. Every card has the same image box: the reference heights the first six cards used to have (`REF_H`) are gone.
- Tab bar (fixed): `VT.ui.tabBar('plaza')`, with 「购物广场」 active.

**Interactions.**
- Store item (「全部」 or a favourite) → writes `s.plaza.store`. Without a query, only the bar's selection and the feed re-render. With a query, it also clears the query and refreshes the whole screen: tapping a store leaves the search. Either way the feed scrolls to the top, the bar scrolls just enough to show the chosen item whole (16 px margin), and the chip is kept.
- 「管理」 / 「收藏商家」 → 「收藏的商家」 sheet.
- Chip → writes `s.plaza.cat`, re-renders the feed and scrolls it to the top. The category applies inside the chosen store, and to search results. 「鞋包」 matches `cat` shoes or bag; the other chips match `p.cat` exactly.
- Banner slide (全部) → 「秋日灵感穿搭」 sheet. The ZARA banner, or 「店铺详情」 on a store card → that store's sheet.
- Card → push `product` `{pid}` → `/plaza/p/:pid`. The whole card is a transparent button `.pz-open` with aria `查看 {name}，¥{price}`. The heart sits above it.
- Heart (`VT.ui.heart`, global `fav` action) → toggles `s.favorites[pid]`. It updates every heart for that pid on screen (`aria-pressed`, aria 「收藏」/「取消收藏」, pop animation) and toasts 「已收藏」 / 「已取消收藏」 (2200 ms).
- Search input → on every `input` event (no submit, no debounce) writes the raw value to `s.plaza.q`. If the trimmed value isn't blank and a store other than 全部 is chosen, `s.plaza.store` becomes `'all'` and the bar re-renders, keeping its scroll position. Then the feed re-renders; its scroll is not reset. Matching rules and verified counts: HANDOFF §9.1.
  - Matching stores (any of the 7, favourite or not, in `data.stores` order) come first, under the heading 「相关商家」. Each row is a card (`#FBF8F3`, radius 14) and the whole row is a transparent button (aria 「查看店铺 {full name}」) that opens the store sheet. It shows a 40 px logo, the full name (bold), 「{tagline} · 在售 {n} 件」, and a pill on top of the row button: 「收藏」 (dark) or 「已收藏」 (light), with `aria-pressed` and the store name as sr-only text. The pill toggles the favourite and refreshes the screen.
  - Matching products follow in the grid, under the heading 「相关商品」 when there are store rows above them, without a heading otherwise. Store rows ignore the chip; products don't.
  - Stores match but no products do: after the rows, the line 「没有找到「{q}」相关的单品」. Nothing matches: the empty state below.
- 「清除搜索」 (empty state) → resets both `s.plaza.q = ''` and `s.plaza.cat = 'all'`, then re-renders the whole screen with `app.refresh()`. The store stays 全部.
- 「查看全部分类」 (empty state) → the 全部 chip.
- 购物袋 → push `checkout` with no params (`data-act="nav" data-to="checkout"`), so the stack becomes plaza › checkout with no product in between. Checkout shows `s.cart`, or the demo fallback cart (蓝色条纹衬衫 · M · ×1) when `s.cart` is null. This button resumes a pending checkout; it is not a cart list.
- 商家消息 → push `messages` → `/plaza/messages` (see 商家消息). Scan → 「拍照找同款」 sheet.
- Tapping the active 购物广场 tab again while at root → smooth-scrolls the feed to the top (instant with reduced motion).

**Overlays.** All sheets close via ×, scrim tap or Esc (generic `app.sheet`). `app.go` and `app.open` also close them instantly.
- **Store sheet** (`VT.plaza.openStore(app, storeId)`, class `ov--shop`; 商品详情's brand row opens the same sheet). Title: the store's full name, e.g. 「ZARA 官方旗舰店」.
  - Head: 54 px logo; the store's `name` (bold); its tagline; 「在售 {n} 件 · 店铺评分 {rating}」 (rating with one decimal).
  - Two buttons side by side: ghost 「联系商家」 (chat icon) and 「收藏店铺」 (dark, outline heart) or 「已收藏」 (ghost, filled heart), with `aria-pressed`.
  - Heading 「店铺商品」, then one `.mini` row per product of the store in feed order (image `img.plaza || img.card`, name, tags, price), then the note 「演示数据」.
  - 「收藏店铺」 / 「已收藏」 → toggles the favourite and swaps the button in place. When the sheet is open over 购物广场, the plaza behind it refreshes.
  - 「联系商家」 → closes this sheet at once and opens the store's chat thread sheet (see 商家消息). It doesn't navigate.
  - A product row → push `product` (`/plaza/p/:pid`; from 商品详情, `…/p/:pid/p/:pid2`).
- **「收藏的商家」 sheet** (「管理」): lead 「收藏的商家会显示在购物广场顶部，左右滑动、点击即可切换。」, then the heading 「已收藏 {n}」 with one row per favourite (40 px logo, `name`, tagline, an 「已收藏」 pill), or 「还没有收藏的商家」 when there are none. Then, when some stores aren't favourites, the heading 「推荐商家」 with their rows and 「收藏」 pills. A pill toggles that store: the sheet body re-renders (the store moves to the other list; a new favourite goes to the top of 已收藏) and focus returns to that store's pill. The plaza behind the sheet refreshes.
- Favouriting anywhere (search row, store sheet, 管理) puts the store first in `s.storeFavs`, so it shows right after 「全部」. Unfavouriting removes it, and if it was the chosen store the feed goes back to 全部. Toasts 「已收藏店铺「{name}」」 / 「已取消收藏「{name}」」, with the store's `name`.
- **「秋日灵感穿搭」 sheet** (either banner slide, class `ov--shop`): lead 「本季精选单品 · 演示数据」, then `.mini` rows for `data.seasonPicks`: taupe-coat, knit-cardigan, maxi-skirt, brown-blazer, brown-sweater, black-cardigan, pleated-skirt. A row → push `product`. **[demo]**
- **「拍照找同款」 sheet:**
  - Content: lead 「上传一张衣服照片，演示版会从本地商品库中推荐风格相近的单品（非真实图像识别）。」 and a dark button 「选择照片」 (a label wrapping a hidden `accept="image/*"` file input).
  - Non-image file → toast 「请选择图片文件」.
  - Image file → shows a preview (object URL) tagged 「已上传」, then heading 「相似单品推荐」 with badge 「演示数据」, then the same three `.mini` rows every time: striped-shirt, oxford-shirt, white-shirt (`img.card`, name, tags, price). **[demo]** No image analysis.
  - Tapping a row → push `product` → `/plaza/p/:pid`. Picking another photo replaces the result.
- The 「消息通知」 sheet, which the bell used to open, now opens from 商家消息's first row.

**Data.**
- Reads `data.plazaOrder`, `data.byId`, `data.plazaCats`, `data.inCat`, `data.stores`, `data.storeById`, `data.storeOf`, `data.seasonPicks`, `s.plaza.{cat,q,store}`, `s.storeFavs`, `s.storeChats` (the badge), `s.favorites`. Writes `s.plaza.{q,cat,store}`, `s.storeFavs` and `s.favorites[pid]`.
- **Stores** (`data.stores`, in this order). Every product belongs to the store whose `name` equals its `brand` (`data.storeOf`; no product falls through to its first-store fallback). Logo colours are in `data.js`.

| id | `name` (bar label) | full name | tagline | mono | rating | products, in feed order |
|---|---|---|---|---|---|---|
| `zara` | ZARA | ZARA 官方旗舰店 | 简约与质感的日常时装 | ZARA | 4.9 | knit-cardigan, straight-jeans, brown-blazer, maxi-skirt |
| `soft-archive` | Soft Archive | Soft Archive 官方店 | 柔软针织 · 基础衣橱 | SA | 4.8 | basic-cami, brown-sweater, black-cardigan, white-tee, black-sweater, ribbed-tank |
| `linea-studio` | Linea Studio | Linea Studio 官方店 | 法式温柔 · 日常优雅 | LS | 4.8 | pleated-skirt, satin-slip-dress, white-shirt, beige-trousers, bow-blouse, oxford-shirt |
| `mono-atelier` | Mono Atelier | Mono Atelier 官方店 | 利落剪裁 · 摩登通勤 | MA | 4.8 | black-blazer, taupe-coat, beige-blazer |
| `forma` | Forma | Forma 官方旗舰店 | 鞋包配饰 · 简约实用 | F | 4.7 | brown-tote, white-sneakers, black-handbag, black-pumps, grey-hoodie, utility-jacket, strappy-heels, gold-hoops |
| `reformation` | Reformation | Reformation 官方旗舰店 | 轻盈面料 · 经典衬衫 | R | 4.8 | striped-shirt |
| `linea-denim` | Linea Denim | Linea Denim 官方店 | 经典丹宁 · 自在随性 | LD | 4.7 | denim-jacket |

- The redesign moved knit-cardigan, straight-jeans and brown-blazer to brand ZARA and added maxi-skirt (ZARA, 下装, ¥359, model photo only), so the catalogue has 29 products. For the three moved products the plaza model photo is also the second gallery image on 商品详情 (`data.js:185-188`). ZARA is a real trademark, used here as a demo store (HANDOFF §13.1 #12).
- Favourite stores: `s.storeFavs` (persisted), seed `['zara', 'soft-archive', 'linea-studio', 'mono-atelier', 'forma']`, so Reformation and Linea Denim start under 推荐商家. `s.plaza.store` (persisted, default `'all'`) counts only while that store is a favourite; otherwise the feed shows 全部.
- Query, category and store live in the persisted store. They survive tab switches, pushes and full reloads. The input value is re-rendered from `s.plaza.q`, raw and untrimmed.
- Kept scroll positions: `.pz-scroll` (`pz`), the chip row (`pz-chips`), the store bar (`pz-stores`) and the banner track (`pz-ban`), restored whenever the plaza root shows again (tab switch, back, contextual jump to `plaza`). They are not kept across reloads.
- The input has `data-focus-key="pz-q"`, so focus comes back after an in-place refresh.

**States & edge cases.**
- Empty, no query: the head stays, then a search icon, 「这家店暂无「{chip label}」商品」 for a store (e.g. ZARA with 上衣) or 「暂无「{chip label}」商品」 for 全部, and a ghost button 「查看全部分类」. With the seed every chip has products under 全部, so only the store variant can appear.
- Empty, with a query: search icon, 「没有找到「{q}」相关的商家或单品」 (the trimmed query) and a ghost button 「清除搜索」.
- Typing moves the bar to 全部, and clearing the query doesn't bring the earlier store back.
- Store rows ignore the chip: 「衬衫」 with 鞋包 shows the Reformation row (its tagline 「轻盈面料 · 经典衬衫」 matches) and 「没有找到「衬衫」相关的单品」.
- Unfavouriting the chosen store sends the feed back to 全部. With no favourites, the bar shows only 「全部」 and 「收藏商家」.
- The filter also runs on unfinished IME composition text (pinyin letters), because there is no `isComposing` guard. The empty state can flash while typing Chinese.
- **[demo]** The banners, the 秋日灵感穿搭 picks, the store data and the scan results are static. The scan object URL is never revoked (`04-plaza.js:200`).
- Same for logged-in and logged-out users.

**Components used.** `VT.ui.iconBtn`, `VT.ui.heart` + global `fav`, global `nav`, `VT.ui.img`, `VT.ui.price`, `VT.ui.dots`, `VT.ui.tabBar` + global `tab`, `.chip`, `.scroll`, `app.sheet`, `.opt-list`, `.mini`, `.badge-demo`, `.sheet-lead`, `.sheet-note`, `.btn--ghost.btn--sm`, `.btn--dark.btn--lg`, `.sr-only`. Local: `logo()` (`.st-logo` and its `--md` 40 px / `--lg` 54 px / `--msg` 44 px sizes), the store bar (`.pz-stores`, `.pz-st`), the banners (`.pz-banners`, `.pz-ban`, `.pz-ban-dots`), the store head (`.pz-shop-ban`, `.pz-shop`), the search results (`.pz-sec`, `.pz-srow`, `.pz-sfav`, `.pz-none`), the store sheet (`.ss-*`) and the 管理 sheet (`.ms-*`). Exports `VT.plaza = { openStore, manageStores, toggleFav, notices, logo, syncBadge }`.

**Acceptance checks.** `AC3: tab → plaza`, `AC2/4: plaza has one bar with the 5 tabs`, `tab switch to plaza is instant`, `plaza has no back button (primary)`, `plaza search`, `plaza scroll kept after switching tabs`, `plaza heart toggles`, `plaza → product details`, `AC6: back from product → plaza`, `plaza tab returns to its own history (product page)`, `finished checkout removed from plaza history`, `mobile: tabs work`. The stores block (mobile context, seed data): `plaza: store bar = 全部 + favourite stores only`, `plaza: 全部 shows every store, with the platform banner`, `plaza: a favourite store shows only its products` (ZARA: 4 products and its banner), `plaza: category narrows the chosen store` (ZARA + 外套 → knit-cardigan, brown-blazer), `plaza: search covers every store and product` (「Reformation」 → one store row, striped-shirt, bar on 全部), `plaza: favouriting a store from search adds it to the bar`, `plaza: 管理 removes a store from the bar`. 商家消息 lists the three checks that continue from here.


### 5. 个人衣橱 · `wardrobe`

**Route** `/wardrobe` · **Type** tab root · **Prototype** `js/screens/06-wardrobe.js`, `css/screens/06-wardrobe.css` · **Design ref** `reference/design/screens/06_my_wardrobe.png`

**Purpose.** Browse, filter and search the active digital avatar's garments (owned, collected, purchased, self-uploaded), heart them, queue several items for 首页 try-on, and add photos of the user's own clothes.

**Layout (top → bottom).**
- Header (fixed): centred h1 「个人衣橱」; on the right a search icon button (aria 「搜索衣橱」, `aria-expanded`) and an add button (＋ in a circle, aria 「添加衣物」). No back button, although the design ref shows one (tab roots have none, REPORT deviation 1). The design's own tab bar (分类/购物车) is replaced by the shared 5-tab bar.
  - With more than one digital avatar (HANDOFF §9.15) a pill sits at the top left: the avatar's portrait (26 px), its name (ellipsis past 108 px) and a chevron-down; aria 「切换角色，当前：{name}」. It opens the 切换角色 sheet (§3); after switching, the screen re-renders with that avatar's wardrobe and try-on queue. With one avatar the header is as before.
- Search bar (fixed, only while open): pill `type=search` input, placeholder 「搜索衣橱里的单品」, aria 「搜索衣橱」.
- Category tabs (fixed row, scrolls sideways, `role=tablist` aria 「衣橱分类」), from `data.wardrobeCats`: 「全部」「上衣」「下装」「鞋包」「配饰」「外套」「连衣裙」. The active tab is bold and underlined.
- Grid (`.wr-scroll`, the only vertical scroller): 3 columns of tiles. Each tile has the garment image (the whole tile is a button), a heart toggle top-right, and a source badge bottom-left: 「已收藏」 collected · 「已购买」 purchased · 「我上传的」 uploaded. Seed `owned` items have no badge. A queued tile gets a dark outline and a check badge top-left.
- Queue bar (only when `tryQueue` is not empty): a floating pill just above the tab bar with 「已选 N 件」, the text button 「清空」 and the dark button 「去试衣间」 plus an arrow.
- Tab bar (个人衣橱 active).

**Interactions.**
- Category tab → sets `s.wardrobeCat`, re-renders the grid in place and scrolls it to the top. Mapping (`data.inCat`): 全部 shows everything; 鞋包 shows product `cat` `shoes` or `bag`; every other tab matches its own `cat` id (`top`/`bottom`/`acc`/`outer`/`dress`). Seed counts: 全部 15 · 上衣 5 · 下装 3 · 鞋包 2 · 配饰 0 · 外套 5 · 连衣裙 0.
- Search icon → toggles the search bar. Opening it focuses the field; closing it clears the query. Filtering is live on every keystroke: a case-insensitive substring match on `name + tags` (uploaded items: name only), combined (AND) with the active category.
- Heart → toggles that wardrobe entry's own `fav` flag, with a pop animation and no toast; aria 「标记喜欢：<name>」/「取消喜欢：<name>」. This flag is **not** 我的收藏 (`s.favorites`) and nothing else reads it.
- Tile → item sheet (below). A tile never opens the product page directly.
- 「去试衣间」 → takes the queued entries in queue order, drops uploaded ones, always empties the queue, then calls `VT.tryOn(pids)`. If nothing is left (only uploaded items were queued), it shows the toast 「所选衣物暂不支持试穿」 and stays on the wardrobe.
- 「清空」 → empties `tryQueue` and hides the bar (no confirm, no toast).
- ＋ in the header, or 「添加衣物」 in the empty state → 添加衣物 sheet.
- Re-tapping the active tab scrolls the grid to the top (global `tab` action).
- Arrives from: the tab bar and 我的 → stats 「我的衣橱」 (both keep the tab's own stack), and 商品详情 → 「加入衣橱」 sheet → 「去衣橱看看」 (contextual jump, which resets the tab to its root).
- **Try-on (`VT.tryOn`, `js/screens/05-product.js:197`)**, used by 「试穿这件」 and 「去试衣间」. For each product in order it sets `s.fit.outfit[slot]`, where the slot is the product `cat`. A dress removes top and bottom; a top or bottom removes the dress. Slots not touched stay in the outfit (merge, not replace). It sets 首页's left-menu category `s.fit.cat` from the first item (the first `data.fitCatsAll` category that lists it, see 首页) and marks the avatar ready (`avatar.demo = true`) if there is none **[demo]**. Then it does a contextual tab jump to 首页 `/home` (fade). 420 ms later it shows the toast 「已为你的数字分身换上所选单品」, or 「演示版暂无「<name>」的上身图，已加入当前搭配」 (3000 ms, naming the first tried item that has no on-body image). The wardrobe stack is left as it was.

**Overlays.**
- **Item sheet** (title = item name). It shows a large image (catalog: `img.hd`, falling back to `img.tile`; uploaded: the photo) and a meta line `[source label or 「我的衣物」, colour name, size]` joined by 「 · 」. Colour and size exist only for collected or purchased items, or items re-added from 商品详情. Buttons:
  - 「试穿这件」 (dark, dress icon) → catalog item: closes the sheet and calls `VT.tryOn([pid])`. Uploaded item: shows the toast 「演示版暂不支持上传衣物的上身效果」 and the sheet stays open.
  - 「加入试衣搭配」 / 「移出搭配」 → toggles the entry `uid` in `tryQueue`, closes the sheet, toast 「已加入试衣搭配」 / 「已移出试衣搭配」. This is the only way to queue items, and uploaded items can be queued.
  - 「查看商品详情」 (catalog items only) → pushes `product` `{pid}` onto the wardrobe stack → `/wardrobe/p/:pid`; the sheet closes.
  - 「移出衣橱」 (trash icon, red tint). It is hidden for `source: 'owned'`, so seed items can never be removed. Tapping it opens a dialog: title 「移出衣橱？」, text 「「<name>」将从你的衣橱中移除。」, buttons 「取消」/「移出」. Confirm removes the entry and its queue slot, closes the sheet and shows the toast 「已移出衣橱」. Cancel keeps the sheet open.
  - Uploaded items also show the note 「自己上传的衣物暂不支持上身试穿（演示版）」 **[demo]**.
- **添加衣物 sheet**. Contents, top to bottom:
  - The lead 「拍下或选择一张衣物照片，保存到你的个人衣橱。」.
  - A drop zone (a label wrapping a hidden `<input type=file accept="image/*">`) with 「选择照片」 and 「支持 JPG / PNG，建议纯色背景平铺拍摄」.
  - The divider 「或」, then the ghost button 「从购物广场挑选」 (bag icon) → contextual tab jump to 购物广场 `/plaza`, which resets plaza to its root.
  - Choosing a file: a non-`image/*` file gives the toast 「请选择图片文件」. There is **no file-size limit**. The image is downscaled so its longest side is at most **520 px** (never upscaled) and re-encoded as **JPEG, quality 0.82**, as a data URL. If decoding fails, the toast is 「无法读取这张图片，请换一张」.
  - After a file is chosen, the drop zone shows a preview with the badge 「已选择：<file name, first 18 chars>」; tapping it picks another photo and re-fills the name. The form appears:
    - 「名称」 input: maxlength 16, placeholder 「例如：米白针织开衫」, prefilled with the file name without its extension (cut to 16 chars, fallback 「我的衣物」).
    - 「分类」 chips 「上衣」「下装」「外套」「连衣裙」「鞋子」「包包」「配饰」 → `top/bottom/outer/dress/shoes/bag/acc`; the default is 上衣.
    - The dark button 「保存到衣橱」.
  - Save → adds `{uid, custom:{src, name, cat}, fav:false, source:'uploaded', addedAt}` at the top, resets the filter to 全部, closes the sheet, scrolls the grid to the top and shows the toast 「已添加到衣橱」 with a check icon. Uploaded 鞋子/包包 items appear under 鞋包. Closing the sheet without saving discards the photo.
- Sheets close with ✕ (aria 「关闭」), a scrim tap, Esc, or any navigation. The dialog closes only with its buttons or Esc.

**Data.**
- Reads: `s.wardrobe`, `s.wardrobeCat`, `s.tryQueue`, `data.wardrobeCats`, `data.inCat`, `data.byId`; for the pill, `s.avatars` and `s.activeAvatar`. `wardrobe` and `tryQueue` are the **active avatar's** (each avatar has its own); `wardrobeCat` is shared.
- Writes: `s.wardrobe` (fav, remove, upload), `s.wardrobeCat`, `s.tryQueue`; try-on also writes `s.fit` and `s.avatar`.
- Entry shapes: catalog `{uid, p, fav, source:'owned'|'collected'|'purchased', color?, size?, addedAt}`; uploaded `{uid, custom:{src,name,cat}, fav, source:'uploaded', addedAt}`, plus `fromUpload` (the 我的上传 id) when 首页's 「加入衣橱」 saved it.
- Seed: `data.seedWardrobe`, 15 `owned` items with uids `w1…w15`, 4 of them hearted.
- Order is the array order; there is no sort control. New entries are `unshift`ed: uploads here, 商品详情 「加入衣橱」 (`collected`), and checkout (`purchased`). Re-adding a product already in the wardrobe only updates its colour/size. Buying a collected item relabels it `purchased` (owned stays owned) without moving it. `addedAt` is stored but never used.
- Persisted: the wardrobe, `wardrobeCat` and `tryQueue` (the queue survives a reload).
- In memory only (kept across tab switches, lost on reload): whether search is open, and the query.
- Kept when returning to the tab: grid scroll (`data-keep-scroll="wr"`) and category-row scroll (`wr-tabs`).

**States & edge cases.**
- Empty grid: a hanger icon, the text 「没有找到匹配的单品」 (when a query is typed) or 「这个分类还没有衣服」, and the ghost button 「添加衣物」. With seed data, 配饰 and 连衣裙 are empty.
- A name of only spaces is saved as an empty string (bug, `06-wardrobe.js:197`; the intent is 「我的衣物」).
- Saving does not clear an open search query, so the new item can be hidden by the search.
- Toasts appear on top of the queue bar (both sit at about the same height: `components.css:246`, `06-wardrobe.css:40`). Keep them apart in the rebuild.
- The prototype keeps uploaded photos as data URLs in local state **[demo]**.
- No difference between first launch and later, or logged in and not.

**Components used.** `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.tabBar`, `.heart-btn` (+`.pop`), `.btn` (`--dark/--ghost/--sm/--lg/--block`), `.chip`, `.field`/`.field-label`/`.field-row`, `.sheet-lead`, `.sheet-note`, `.sr-only`, `app.sheet`, `app.dialog`, `app.toast`, `VT.tryOn`. (`VT.ui.statusBar` is prototype-only.)

**Acceptance checks.** `AC3: tab → wardrobe` · `AC2/4: wardrobe has one bar with the 5 tabs` · `tab switch to wardrobe is instant` · `wardrobe has no back button (primary)` · `加入衣橱 → 个人衣橱 tab` · `collected item at top of wardrobe` · `wardrobe filter 下装` · `wardrobe queue bar` · `uploaded garment saved`


### 6. AI 造型师 · `stylist`

**Route** `/stylist` · **Type** tab root · **Prototype** `js/screens/07-stylist.js`, `css/screens/07-stylist.css` · **Design ref** `reference/design/screens/07_ai_stylist.png`

**Purpose.** A scripted chat stylist. The user asks for outfit advice (typed, a suggestion chip, an occasion or a photo) and gets keyword-matched replies with look cards or a set from their wardrobe, which they can save, open, shop or try on.

**Layout (top → bottom).**
- Header (fixed): centred h1 「AI 造型师」; on the right, 历史造型 (clock icon, aria 「历史造型」) and share (aria 「分享对话」). No back button, although the design ref shows one (REPORT deviation 1).
- Chat thread (`.st-scroll`, the vertical scroller, `aria-live="polite"`), rendered from `s.chat`:
  - User text: a bubble on the right plus the user's round photo (`VT.ui.profilePhoto`: profile photo → avatar portrait → `assets/people/chat-user.webp`). User photo: an image bubble (alt 「我上传的穿搭照片」).
  - AI text: a sparkle avatar on the left plus a bubble; `\n` in the script becomes a line break.
  - Looks row: look cards side by side in 3 columns. A single look renders as one larger centred card (`.is-single`).
  - Wardrobe set: a card with a 2×2 grid of product tiles and a footer 「<name> + <name> + …」 with the dark button 「去试衣间试穿」.
- Suggestion chips (inside the scroller, right after the last message, scrolling sideways, aria 「快捷提问」), from `data.chatSuggestions`: 「我想要更正式一些」「换成裙装搭配」「根据我已有的衣服来搭配」. They stay after use.
- Input bar (fixed above the tab bar): a round ＋ (aria 「更多：上传照片或选择场合」), a text field (placeholder 「告诉我你的穿搭需求...」, maxlength 120, `enterkeyhint=send`) and a round dark ↑ send button (aria 「发送」).
- Tab bar (AI造型师 active).
- **Look card** (data from `data.looks` / `lookById`): a model image (button, aria 「查看 Look N 详情」) with a column of item-thumbnail buttons over its right edge (aria 「查看单品：<name>」; positions per look are hard-coded in `ITEM_BOX`, `07-stylist.js:7`). Below the image: 「Look N」 with a heart save button, the sub line (e.g. 「休闲时髦 · 轻松有范」) and 3 tag pills.

**Interactions.**
- Send (button, or Enter except during IME composition) → trims the text. If it is empty, the field gets focus and the toast 「先输入你的穿搭需求吧」 shows. Otherwise the field is cleared and the text is asked.
- Suggestion chip → asks the chip text.
- **Reply engine [demo].** Asking appends the user message, then picks a reply: the first `data.chatReplies` entry, in array order, with any keyword that is a plain substring of the message (`String.includes`, no normalisation). Reply texts are in `data.js`.
  1. 正式 通勤 上班 会议 面试 → text + look `look2`
  2. 裙 连衣裙 约会 优雅 女人味 → text + `look3`
  3. 已有 衣橱 我的衣服 现有 → text + wardrobe set `knit-cardigan, white-shirt, pleated-skirt, brown-tote`
  4. 休闲 舒适 轻松 日常 周末 → text + `look1`
  5. 冷 降温 保暖 秋 冬 → text + wardrobe set `taupe-coat, brown-sweater, straight-jeans, white-sneakers`
  - No match → `data.chatFallback` (text only).
  - The three chips hit rules 1, 2 and 3. Because order decides, 「我想穿裙子去上班」 hits rule 1.
- **Reply timing.** A typing bubble (3 bouncing dots, sr-only 「AI 造型师正在输入」) appears at once. After **1100 ms** (200 ms with reduced motion) it is replaced by the AI text, then the looks row, then the wardrobe set; each new message smooth-scrolls the thread to the bottom. Sending is never blocked, and parallel replies each get their own typing bubble. If the user has left the screen (another tab, or a pushed product page) when the timer fires, the messages are only written to the store; they appear on return, with no typing bubble and the scroll position as the user left it.
- Look card heart → toggles `s.savedLooks[id]` (sets a timestamp, or deletes the key). Every heart for that look in the thread updates. Toast 「已保存到「历史造型」」 / 「已取消保存」.
- Look card image → look sheet.
- Item thumbnail or wardrobe-set tile → pushes `product` `{pid}` onto the stylist stack → `/stylist/p/:pid`.
- Wardrobe-set 「去试衣间试穿」 → `VT.tryOn(pids)`, a contextual jump to 首页 (see 个人衣橱 for what try-on does).
- 历史造型 → 历史造型 sheet. This is not the 浏览记录 screen.
- 分享对话 → the native share sheet (`navigator.share`, title 「AI 造型师」) with the fixed text 「AI 造型师为我推荐了 3 套朋友聚会造型：休闲时髦 / 摩登气质 / 优雅迷人」 (the same whatever the conversation); cancelling it is silent. Without native share, the text is copied and the toast 「对话摘要已复制」 shows; if the clipboard fails, the toast is 「分享面板在此浏览器不可用」. The prototype skips native share when embedded (`VT.framed`); the web build should drop that check.
- ＋ → 更多 sheet. Re-tapping the active tab scrolls the thread to the top.
- Arrives from: the tab bar (keeps the tab's own stack); 我的收藏 → 造型 empty state 「去问问 AI 造型师」 and the 「AI 造型师」 item in the 「消息通知」 sheet on 商家消息 (both contextual jumps, which reset the tab to its root).

**Overlays.**
- **Look sheet** (full height). Title 「Look N · <sub>」, e.g. 「Look 1 · 休闲时髦 · 轻松有范」. Contents:
  - The hero image, then item rows (`.mini`: image, name, price). The row subtitle is 「衣橱已有」 if the product is in the wardrobe, otherwise its tags. A row pushes `product` and closes the sheet.
  - 「整套参考价 ¥X」, the sum of the item prices formatted with `VT.ui.yuan` (Look 1 = ¥1,316).
  - 「保存搭配」, which reads 「已保存」 once saved. It sets `savedLooks[id]` if missing and never unsaves. It shows the toast 「已保存到「历史造型」」 on every tap, even when already saved, and fills the hearts in the thread.
  - The dark 「去试衣间试穿」 → `VT.tryOn(all look items)` → 首页, which normally shows that look's render.
- **历史造型 sheet**:
  - 「已保存的造型」: saved looks, newest first, as 3-column tiles (image, name, sub). A tile closes this sheet and opens that look's sheet. Empty: 「点击造型卡片上的 ♡ 即可保存」.
  - 「最近的对话」: static, non-tappable rows 「朋友聚会穿搭」 今天 · 「一周通勤穿搭」 10月12日 · 「周末出游怎么穿」 10月6日, plus the note 「演示数据」 **[demo]**.
- **更多 sheet**:
  - 「上传一张穿搭照片」: a button-styled label with a hidden `image/*` file input.
  - 「按场合推荐」 chips 「周末出游」「上班通勤」「晚餐约会」「降温保暖」 → close the sheet and ask 「<chip>穿什么好？」, which hits rules 4, 1, 2 and 5.
  - Photo: a non-image file gives the toast 「请选择图片文件」; there is no size limit. The image is downscaled so its longest side is at most **420 px** and saved as **JPEG, quality 0.8**; if decoding fails, the original data URL is kept. The sheet closes, the photo is posted as a user message, and after the same delay the fixed reply at `07-stylist.js:141` (not in `data.js`) arrives with `look2` **[demo]**.

**Data.**
- Reads: `s.chat`, `s.savedLooks`, `s.wardrobe` (for 衣橱已有), `s.profile.photo` / `s.avatar.portrait`, and from `data.js`: `chatSeed`, `chatSuggestions`, `chatReplies`, `chatFallback`, `looks`/`lookById`, `byId`. `chatSeed` holds 4 seed messages: user, AI, looks 1–3, AI.
- Writes: `s.chat` and `s.savedLooks` (`{lookId: timestamp}`); try-on also writes `s.fit` and `s.avatar`. `s.chat` entries are `{role:'user', text|img}`, `{role:'ai', text}`, `{role:'looks', looks:[ids]}` and `{role:'wardrobe', pids:[]}`. The chat is capped at 60 entries: the first 4 are kept, then the newest 56.
- Persisted: chat (including photos as data URLs) and saved looks.
- UI state: the input draft is kept across tab switches but not reloads (`data-keep-value="st-in"`); scroll is kept for the thread (`st`) and the chips row (`st-sg`). On a fresh load with more than the seed messages, the thread opens scrolled to the bottom; with only the seed messages it opens at the top.

**States & edge cases.**
- The first visit shows `chatSeed` (looks for a 朋友聚会). There is no empty or error state, and no loading state other than the typing bubble.
- All replies are scripted and photos are not analysed **[demo]**. The 隐私与安全 toggle 「允许 AI 造型师读取衣橱」 does not change replies.
- The typing bubble exists only in the DOM and is never stored.
- Saved looks also appear in 我的收藏 → 造型 and count towards 我的 → 我的收藏.

**Components used.** `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.nl2br`, `VT.ui.profilePhoto`, `VT.ui.price`, `VT.ui.yuan`, `VT.ui.tabBar`, `.chip`, `.btn`, `.mini`, `.sheet-actions`, `.sheet-note`, `.sr-only`, `app.sheet` (incl. `full: true`), `app.toast`, `app.later`, `VT.tryOn`, `VT.reducedMotion`.

**Acceptance checks.** `AC3: tab → stylist` · `AC2/4: stylist has one bar with the 5 tabs` · `tab switch to stylist is instant` · `stylist has no back button (primary)` · `stylist draft kept across tabs` · `AI stylist reply with looks` · `look → 首页 with outfit`


### 7. 我的 · `profile`

**Route** `/me` · **Type** tab root · **Prototype** `js/screens/10-profile.js`, `css/screens/10-profile.css` · **Design ref** `reference/design/five-screen-mockup.png` (phone 5)

**Purpose.** Account hub: profile header, three live counts, order-status shortcuts and the entry rows to every account and settings screen.

**Layout (top → bottom).**
- Prototype status bar (`VT.ui.statusBar('dark')`): drop in the web app (safe-area inset instead).
- One scroll container `.me-scroll` (`data-keep-scroll="me"`) holds everything above the tab bar. A decorative beige band `.me-band` sits behind the header and scrolls with it.
- Header: round profile photo with a small dark camera badge (`VT.ui.profilePhoto(s)`: `profile.photo` → `avatar.portrait.src` → `assets/people/chat-user.webp`), wrapped in a `<label title="更换头像">` with a hidden `<input type="file" accept="image/*">` (aria 「更换头像」). Next to it one button holding the name `<h1>` and the bio line (empty bio → placeholder 「编辑个性签名」); both are single-line with ellipsis. Gear icon button (aria 「设置」) top right.
- Stats card (aria 「我的数据」), three columns, number over label:
  - 「我的衣橱」 = `s.wardrobe.length` (every wardrobe entry: owned seeds, collected, purchased, uploaded).
  - 「我的收藏」 = `VT.store.h.favCount(s)` = products with `favorites[pid] === true` + saved AI-stylist looks (keys of `savedLooks`). Wardrobe hearts (`w.fav`, 「标记喜欢」) are not counted.
  - 「浏览记录」 = `s.history.length` (product-page views, one per product, newest first, max 30).
  - Values at reset: 15 / 8 / 6. The mockup's 12 / 28 / 6 are placeholders (REPORT deviation 6).
- 我的订单 card: 「我的订单」 + 「查看全部 ›」; five icon shortcuts = `data.orderFilters` without 全部, in order 「待付款」 wallet · 「待发货」 box · 「运输中」 truck · 「待收货」 box-check · 「售后」 aftersale. The count per filter (`VT.store.h.inFilter`) is only in the aria-label (「待付款，1 个订单」; zero → just the label). No visible badge, same as the mockup.
- Account list card (aria 「账户与设置」): seven `VT.ui.row` rows (icon, label, chevron): 「我的资料」 person · 「我的形象」 figure, with a round thumbnail on the right (`avatar.portrait.src`, else `chat-user.webp`) · 「收货地址」 pin · 「支付方式」 card · 「消息通知」 bell · 「帮助与客服」 question · 「设置」 settings. There is no separate 数字形象 card: this row is the avatar entry.
- Tab bar `VT.ui.tabBar('profile')`, fixed at the bottom.

**Interactions.**
- Photo → native file picker → `squarePhoto(file)`: centre-crops the largest square, scales it to 320×320, JPEG quality 0.82, data URL → saved straight to `profile.photo` (no draft, no confirm) → re-render → toast 「头像已更新」 (check icon). Non-image → toast 「请选择图片文件（JPG / PNG 等）」; decode failure → 「无法读取这张图片，请换一张」. No file-size limit.
- Name/bio button (aria 「编辑个人资料：{name}」) → push `editprofile` (`/me/profile`). There is no separate edit icon.
- Gear and the 「设置」 row (duplicates) → push `settings` (`/me/settings`).
- 「我的衣橱」 → switch to the `wardrobe` tab exactly like the tab bar (instant; that tab keeps its own stack). 「我的收藏」 → push `favorites`. 「浏览记录」 → push `history`.
- 「查看全部」 → push `orderlist` with status `all`; each shortcut → push `orderlist` with its filter id (`unpaid`, `toship`, `shipping`, `toreceive`, `aftersale`).
- Rows → push: `editprofile` (`/me/profile`), `avatarhub` (`/me/avatar`), `addresses`, `payments`, `notifications`, `help`, `settings`.
- Tab bar: tapping 「我的」 while on this root smooth-scrolls `.me-scroll` to the top (instant jump with reduced motion); other tabs switch instantly and keep their stacks.

**Overlays.** None (the photo uses the native file picker).

**Data.** Reads `profile.{name,bio,photo}`, `avatar.portrait` and `wardrobe` (both the active avatar's: 我的衣橱 counts the active avatar's wardrobe, and the 我的形象 row shows its portrait), `favorites`, `savedLooks`, `history`, `orders`, `returns`, `data.orderFilters`. Writes `profile.photo`. All counts are recomputed on every render, so they are live when coming back from any screen or tab. Keep scroll `me`. The 我的 tab keeps its own stack: leaving from 我的订单 and returning by the tab bar lands on 我的订单 again.

**States & edge cases.** No logged-in / logged-out difference: 我的 always shows the local profile (defaults 「小橙子」 / 「开启更美的每一天」); `loggedIn` only switches the bottom button of 设置 (「登录 / 注册」 ↔ 「退出登录」). Until a photo is uploaded, the header photo and the 我的形象 thumbnail show the demo portrait `chat-user.webp` **[demo]**. The header prefers `profile.photo`; the 我的形象 thumbnail never uses it (always the avatar 生活照). 设置 → 隐私与安全 → 清除已上传的照片 resets both to the sample. Only reachable after first-launch setup.

**Components used.** `VT.ui.profilePhoto`, `VT.ui.img`, `VT.ui.iconBtn`, `VT.ui.row` (`.set-row.me-row`), `VT.ui.tabBar`, global actions `nav` and `tab`, `.sr-only` file input, `VT.profile.squarePhoto` (also used by 编辑资料).

**Acceptance checks.** `AC3: tab → profile` · `AC2/4: profile has one bar with the 5 tabs` · `tab switch to profile is instant` · `profile has no back button (primary)` · `我的订单 → back → 我的` · `我的 → 待收货 filter` · `我的 tab remembers its own history` · `我的 → 我的形象` · `我的形象 → back → 我的` · `我的 → 设置` · `设置 → back → 我的` · `我的 → 我的资料` · `我的资料 → back → 我的` · `我的 → 收货地址` · `收货地址 → back → 我的` · `我的 → 支付方式` · `支付方式 → back → 我的` · `我的 → 消息通知` · `消息通知 → back → 我的` · `我的 → 帮助与客服` · `帮助与客服 → back → 我的` · `edit profile saved` · `change profile picture` · `我的收藏 lists favourites` · `浏览记录 includes viewed products` · `mobile: tabs work` · `mobile: no horizontal overflow`


## Shopping flow

### 8. 商品详情 · `product`

**Route** `/plaza/p/:pid` (canonical parent `plaza`; other paths below) · **Type** secondary · **Prototype** `js/screens/05-product.js`, `css/screens/05-product.css` · **Design ref** `reference/design/screens/05_product_details.png`

**Other paths.** The screen is pushed onto whichever stack opened it: `/wardrobe/p/:pid`, `/stylist/p/:pid`, `/me/favorites/p/:pid`, `/me/history/p/:pid`, `/me/orders/p/:pid` (「再次购买」), `/me/orders/o/:oid/p/:pid`, `…/checkout/p/:pid` (checkout item card), `/plaza/messages/p/:pid` (the 「心愿单降价提醒」 notice on 商家消息) and `…/p/:pid/p/:pid2` (the store sheet's product rows).

**Purpose.** Show one catalogue item (gallery, rating, brand, price, description), let the user choose colour and size, and send it to the wardrobe, to try-on on 首页, or to checkout.

**Layout (top → bottom).**
- Floating top bar, fixed over the hero (it does not scroll and has no background): back (aria 「返回」) on the left; heart (`VT.ui.heart`) and share (aria 「分享」) on the right.
- Scroll container `.pd-scroll`; everything below scrolls:
  - Hero image `gallery[i]` with alt `{name}（第 {i} 张，共 {n} 张）`. It uses `contain` when the path contains `model` or `items/` and `cover` otherwise; `small` products get padding. A transparent button (aria 「下一张图片」) covers the hero below the top bar.
  - Thumbnail strip (`role="tablist"` aria 「商品图片」, scrolls sideways), built from `galleryThumbs || gallery`. Each tab has aria `第 {i} 张图片`. The active thumb is wider and outlined.
  - Title row: h1 `name`, plus a rating button (★, `rating.toFixed(1)`, `({reviews})`; aria `评分 {rating}，{reviews} 条评价`).
  - Brand button `{brand} ›` (the brand is the store's `name`, e.g. 「ZARA」), then the large price `¥{price}`, then `desc` (`\n` becomes a line break).
  - 「颜色」 heading with a link on the right that shows the current colour name and a ›. Below it, a swatch row (`role="radiogroup"` aria 「颜色」); each swatch is `role="radio"` with the colour name as aria-label. `stripe` swatches draw as stripes.
  - 「尺码」 heading with a link 「尺码指南」 › on the right. Below it, size pills (`role="radiogroup"` aria 「尺码」) from `p.sizes`: XS/S/M/L, shoes 35–39, bags and hoops 「均码」.
- Fixed bottom CTA with two equal pills: light 「试穿上身」 (dress icon, aria 「立即试穿：试穿上身」) and dark 「加入衣橱」 (bag icon). There is no tab bar, no quantity selector and no 立即购买 on the page itself; buying goes through the 加入衣橱 sheet.

**Interactions.**
- Back → `app.back()` (pops to the opener; a deep link pops to 购物广场).
- Gallery:
  - Tapping the hero shows the next image and wraps to the first. Tapping a thumb shows that image.
  - While the next image preloads, the hero dims to 40 % opacity. Then src, alt and fit update together with the thumb's `is-on` / `aria-selected`.
  - The image index is kept in module memory per product id for the session: reopening the same product shows the last image. It resets on reload and is not in the URL or the store.
- Swatch or 「选择颜色」 pick → `s.selections[pid].color = id` (persisted). The ring moves and the colour-name link updates.
  - Changing colour **does not** change the hero, the thumbnails, the price or any photo. Only the default colour is photographed (REPORT, known limitations).
  - It **does** change what gets saved or bought: the wardrobe entry's colour, the cart colour, and from there the checkout title prefix (`color.short + cardName`, e.g. 「黑色条纹衬衫」), the 颜色 chip, and the order's `title` / `colorLabel`.
  - Try-on ignores colour.
- Size pill → `s.selections[pid].size` (persisted). The default is `p.defaultSize`: M when the product has it, otherwise its first size.
- 「尺码指南」 opens the size guide sheet and the rating opens the reviews sheet. The brand opens the store sheet of the product's store (`data.storeOf(p)`, `05-product.js:133-137`): the same sheet as on 购物广场.
- Heart → global `fav` on `s.favorites[pid]`, with toast 「已收藏」 / 「已取消收藏」.
- Share. The text is `{name} ¥{price} — 来自「全新的购物体验」原型`.
  1. If `navigator.share` exists (and the page is not framed), call `navigator.share({title: name, text})`. On success or `AbortError`, stop silently. Any other error falls through to step 2.
  2. Call `navigator.clipboard.writeText(text)` and toast 「商品信息已复制，可粘贴分享」.
  3. If the clipboard call fails, toast 「分享面板在此浏览器不可用」.
- 「试穿上身」 → `VT.tryOn(app, [pid])`:
  1. Sets `s.fit.outfit[slot] = pid`, with the slot from `data.slotOf` (top/bottom/outer/dress/shoes/bag/acc). A dress clears top and bottom; a top or bottom clears the dress; other slots stay.
  2. Sets `s.fit.cat` to the first `data.fitCatsAll` entry whose `items` contains the pid (skipping 「上装」 unless the product is a top or outer garment), so the 首页 side menu shows that category. These are the full lists, so a garment without a render still opens its category and stays on the rail while selected. maxi-skirt is in no list: `fit.cat` stays as it was, and the skirt never shows on the rail (HANDOFF §13.2 #35).
  3. If `s.avatar.status !== 'ready'` (none or stale), sets `status: 'ready'` and `demo: true`. 首页 draws the demo renders whatever the status; the flag only affects places like the size-guide tip and 我的形象.
  4. Contextual tab jump `app.go('fitting')` → 首页 root with fade, at `/home`. The product page stays on the opener's stack.
  5. After 420 ms it toasts. If `VT.fitting.pickRender(outfit).missing` includes the pid: `演示版暂无「{name}」的上身图，已加入当前搭配` (3000 ms). Otherwise: 「已为你的数字分身换上所选单品」.
- 「加入衣橱」 → writes the wardrobe immediately (no undo), then opens the result sheet.
  - If an entry with `p === pid` already exists, only its `color` and `size` change; its position and `source` stay the same.
  - Otherwise it runs `s.wardrobe.unshift({uid: VT.store.uid('w'), p, fav: false, source: 'collected', color, size, addedAt: Date.now()})`. The item appears first in 个人衣橱 with the tag 「已收藏」.

**Overlays.** Every sheet closes via ×, scrim tap or Esc.
- 「选择颜色」: one option per colour (swatch, name, radio). The sub-line is 「实拍图展示颜色」 for the first colour and 「有货 · 演示原型仅展示主色实拍图」 for the others. Picking applies the colour (same as the swatch) and closes the sheet.
- 「尺码指南」 **[demo]**: the same table and fixed recommendation for every product.
  - Tip when the avatar is `ready`: sparkle icon + `根据你的数字分身（身高 165cm · 胸围 84cm），推荐 M 码，宽松版型。` with 「M 码」 in bold. Otherwise: info icon + 「创建数字分身后，可根据你的身材自动推荐尺码。」.
  - Table headers 「尺码」「胸围」「衣长」「肩宽」「袖长」. Rows: XS 88/64/38/54, S 92/66/39/55, M 96/68/40/56, L 100/70/41/57. The row matching the selected size is highlighted.
  - Note 「单位：cm，平铺测量，误差 ±1–2cm。」.
- `商品评价 ({reviews})` **[demo]**: summary with `rating`, 「★★★★★」 and `98% 买家认为「尺码合适」`. Then three hard-coded reviews from the `reviews` array in 05-product.js (masked name, stars, text, `size · colour`). Note 「演示数据」.
- Store sheet, from the brand button: `VT.plaza.openStore(app, data.storeOf(p).id)`, described under 购物广场. It is titled with the store's full name (「ZARA 官方旗舰店」) and lists every product of that store, this one included. A product row closes the sheet instantly and pushes another `product` (`…/p/:pid/p/:pid2`). 「联系商家」 opens that store's chat thread sheet over this page (see 商家消息); 「收藏店铺」 toggles the favourite store, which 购物广场's bar shows when the user returns there. The earlier brand sheet (lead 「品牌店铺 · 演示数据。以下为同品类在售单品：」, three products of the same category from any brand) is gone.
- 加入衣橱 result sheet:
  - Title 「已加入衣橱」 (new entry) or 「已在你的衣橱中」 (existing entry).
  - A `.mini` row: image, name, `{colour name} / {size}`, price.
  - Lead `已保存到「个人衣橱」，可随时在试衣间搭配试穿。` (new) or 「已更新为当前选择的颜色和尺码。」 (existing).
  - 「去衣橱看看」 → contextual tab jump `app.go('wardrobe')` → 个人衣橱 root at `/wardrobe` (fade; pop when already in that tab). The plaza stack keeps the product page.
  - 「立即购买」 → sets `s.cart = {p, color, size, qty: 1}` (replacing any earlier cart), then pushes `checkout` → `/plaza/p/:pid/checkout`.
  - Closing the sheet keeps the wardrobe change.

**Data.**
- Reads: `data.byId[pid]` (name, brand, rating, reviews, price, desc, colors, sizes, defaultSize, gallery, galleryThumbs, small, img.card, cat), `data.storeOf` and the store data behind the store sheet (`data.stores`, `s.storeFavs`), `data.fitCatsAll`, `data.slotOf`, `data.renders` (through `pickRender`), `s.selections`, `s.favorites`, `s.avatar.status`, `s.wardrobe`.
- For knit-cardigan, straight-jeans and brown-blazer the gallery's second image is the plaza model photo (`assets/plaza/models/…`), shown with `contain` like the other model shots. maxi-skirt has one image, its model photo.
- Writes: `s.history`, `s.selections[pid]`, `s.favorites[pid]`, `s.wardrobe`, `s.cart`, `s.fit.outfit`, `s.fit.cat`, `s.avatar.status/demo`.
- Kept UI state: `.pd-scroll` (`data-keep-scroll="pd"`). A missing `pid` defaults to 'striped-shirt'.

**States & edge cases.**
- Browsing history (`mount` calls `VT.store.h.viewed`).
  - It records every time the screen mounts: first push, `open`, popping back from checkout, and returning to its tab. It skips in-place `app.refresh()`, but no product action refreshes, so in practice it records on every display.
  - It drops older entries for the same pid, prepends `{p, t: '今天 HH:MM'}` and keeps 30 entries.
  - **[demo]** The label is stored as text, so it still says 「今天」 on later days.
- An unknown `pid` renders the striped shirt (05-product.js:22), but the actions look up `data.byId[pid]` and throw (verified by tapping a size). `mount` still writes the unknown id into history, and 我的 counts it (10-profile.js:73).
- A product with one image: tapping the hero just re-shows the same image, and there is one thumb.
- The store sheet lists the product on screen too: tapping its own row pushes a second copy of this page (`…/p/:pid/p/:pid`). Reformation and Linea Denim sell one product each, so their sheet lists only the current product.
- The size table never matches shoe sizes or 均码. The tip ignores `s.body` and `s.avatarPrefs.sizeTips`.
- Every product shows the same reviews (they mention 「蓝色条纹」), and the summary is always five stars.
- 去衣橱看看 resets neither `s.wardrobeCat` nor the wardrobe scroll. If 个人衣橱 is filtered to another category, the new item is hidden (verified).
- Prototype-only behaviour: the share text says 「原型」, and `VT.framed` (embedded preview) forces the clipboard path. Drop both in the web build.

**Components used.** `VT.ui.backBtn`, `VT.ui.heart` + global `fav`, `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.price`, `VT.ui.nl2br`, `VT.ui.swatchStyle`, `.btn`, `app.sheet`, `.opt-list`/`.opt`/`.opt-sw`/`.radio`, `.guide-tip`, `.guide-table`, `.rv-sum`/`.rv-list`, `.mini`, `.sheet-actions`, `.sheet-lead`, `.sheet-note`, `app.toast`, `app.later`, `VT.store.h.selection/isFav/viewed`, `VT.fitting.pickRender`, `VT.plaza.openStore` (the store sheet). Exports `VT.tryOn`, which is also used by 个人衣橱 (「试穿这件」, queue 「去试衣间」), AI造型师 (「去试衣间试穿」) and 我的收藏 (「去试衣间试穿」).

**Acceptance checks.** `plaza → product details`, `secondary screen hides tab bar`, `AC6: back from product → plaza`, `加入衣橱 → 个人衣橱 tab`, `collected item at top of wardrobe`, `plaza tab returns to its own history (product page)`, `立即购买 → checkout`, `浏览记录 includes viewed products`, `look → 首页 with outfit` (via `VT.tryOn`), `honest toast for garments without imagery` (via `VT.tryOn`), `product brand opens its store sheet` (the first 购物广场 card, knit-cardigan → 「ZARA 官方旗舰店」).


### 9. 结算下单 · `checkout`

**Route** `/plaza/p/:pid/checkout` (canonical parent `product`; other paths below) · **Type** secondary · **Prototype** `js/screens/08-checkout.js`, `css/screens/08-checkout.css` · **Design ref** `reference/design/screens/08_checkout.png`

**Other paths.** Under any stack that opened the product: `/wardrobe/p/:pid/checkout`, `/stylist/p/:pid/checkout`, `/me/…/p/:pid/checkout`. The plaza 购物袋 pushes checkout straight onto the plaza root (stack plaza › checkout): `/plaza/checkout`, with no product segment. It shows the saved checkout draft, or the demo cart when there is none (HANDOFF §4.3).

**Purpose.** Confirm a one-item order (spec, address, shipping, payment, totals) and pay through a simulated cashier, which creates the order.

**Layout (top → bottom).**
- Header (fixed): back (aria 「返回」) and centred h1 「结算下单」.
- Scroll container `.co-scroll`, holding cards:
  1. Item card.
     - Image button (`img.checkout || img.card`, aria 「查看商品详情」).
     - Text button: title `{colour.short}{cardName}` (e.g. 「蓝色条纹衬衫」), tags (`coTags`, else `tags` with ` · ` replaced by two spaces, e.g. 「通勤百搭  质感纯棉」), unit price `¥{price}`, chevron.
     - Three chips: `颜色：{colour.short}` · `尺码：{size}` · `数量：{qty}`.
  2. Address row (button): pin icon, 「收货地址」, `{name}` + spacer + `{phone}`, then `{addr}` on one line with ellipsis, chevron.
  3. Shipping row (button): truck icon, 「配送方式」, the option name on the left and on the right 「免费配送」 (price 0) or `+¥12`, then the line `预计 {M}月{D}日 ({周X}) 送达`, chevron.
  4. Payment card: card icon, 「支付方式」, and a radiogroup of four rows (logo or card icon, name, radio): 「支付宝」「微信支付」「银联支付」「使用新银行卡支付」 (`data.payments`).
  5. Amount card: doc icon, 「订单金额」, and a list 「商品金额」 / 「运费」 / 「优惠券」 (`- ¥20`) / 「实付款」 (large).
- Footer (fixed, outside the scroll):
  - A round checkbox (`role="checkbox"`, aria 「我已阅读并同意用户协议和隐私政策」) with the text 「我已阅读并同意 《用户协议》和 《隐私政策》」. Both titles are underlined link buttons.
  - A full-width dark 「立即下单」 button.

**Interactions.**
- Back → pops to the previous screen (product, or 购物广场 on the 购物袋 path).
- Item image or title → push `product` `{pid}` → `…/checkout/p/:pid`. A later 立即购买 from there stacks a second checkout; `drop` removes both.
- Any of the three chips → 「修改规格」 sheet. Address row → 「选择收货地址」 sheet. Shipping row → 「配送方式」 sheet.
- Payment row → sets `s.checkout.payment = id` in place. This is the same field as the default in 我的 → 支付方式.
- Checkbox → toggles `s.checkout.agree` (default true, persisted) and refreshes in place.
- 《用户协议》 or 《隐私政策》 → document sheet.
- 立即下单:
  - Not agreed: the agreement row shakes (400 ms) and toasts 「请先阅读并同意《用户协议》和《隐私政策》」. Nothing else happens.
  - Agreed: opens `VT.pay` (below). There is no other validation, because the address and payment method always resolve.

**Totals** (`totals(s)`, recomputed on every render)
- 商品金额: `goods = price × qty`.
- 运费: `ship = 0` (标准快递) or `12` (顺丰次日达).
- 优惠券: `coupon = 20`, the constant `COUPON`. It is always applied and cannot be changed.
- 实付款: `total = max(0, goods + ship − 20)`.
- Defaults: 259 × 1 + 0 − 20 = **¥239**, matching the design. With express it is 251. With qty 9 it is 2,331 − 20 = 2311, or 2323 with express.
- Number formats differ. The three list rows use `VT.ui.yuan`, which adds thousands separators (「¥2,331」, 「¥0」, 「- ¥20」). 实付款 uses `VT.ui.price`, which does not (「¥2311」).

**createOrder.** Runs in `onPaid`, so an order exists only after a successful simulated payment.
- `id`: `VT` + local `YYYYMMDDhhmmss` (e.g. `VT20261017090335`).
- `shop`: the full name of the product's store, `data.storeOf(p).full` (`08-checkout.js:240`), e.g. 「ZARA 官方旗舰店」 or 「Soft Archive 官方店」. Item fields: `p`; `title` (same as the checkout title); `color` (id); `colorLabel` (`colour.short`); `size`; `qty`; `price` (unit price).
- Money and choices: `paid` = total; `coupon` 20; `shipping` 0 or 12; `payment` (method id); `address` = `s.checkout.address` (the stored id, which may be stale or null).
- Initial status: `status: 0` (待发货), `progress: 1`, `eta: 'M月D日'` (today + 3 days, or + 1 for express).
- `steps`: 已下单 (`M月D日 hh:mm`) · 已发货 (「待发货」) · 运输中 (「—」) · 预计送达 (`M月D日`).
- `logistics`: one entry `{t: 'M月D日 hh:mm', s: '订单已提交并完成支付（演示），等待商家发货'}`.
- `created`: `YYYY-MM-DD hh:mm:ss`. `carrier`: 「待分配」. `isNew: true` is set but never read.
- Store side effects:
  - `orders.unshift(order)`, `currentOrder = id`, `cart = null`.
  - Wardrobe: if the product is not there, unshift a new entry with `source: 'purchased'`, colour and size. If it is there, its `source` becomes 'purchased' unless it is 'owned'; colour and size are not updated.

**Overlays.** Sheets close via ×, scrim tap or Esc.
- 「修改规格」 (from any chip):
  - A `.mini` row: image, name, a live summary `{colour name} / {size} × {qty}`, price.
  - 「颜色」 chips (full colour names) and 「尺码」 chips.
  - 「数量」 stepper (aria 「减少」 / 「增加」). The minimum is 1, and 「−」 is disabled at 1. The maximum is 9, but 「+」 is never disabled; it just stops.
  - 「确定」 → sets `s.cart` to the edited copy and `s.selections[pid] = {color, size}` (so the product page reflects it), closes the sheet and refreshes. Closing without 确定 discards the edits.
- 「选择收货地址」:
  - One `.opt` per address from `VT.store.h.addresses`: `{name}　{phone}`, a tag badge (`tag`, or 「地址」), the address line and a radio. The current option is the resolved address.
  - Picking an address → sets `s.checkout.address`, closes and refreshes.
  - Ghost button 「管理收货地址」 (pin icon) → closes the sheet and pushes `addresses` → `…/checkout/addresses`. Changes made there write `s.checkout.address` too (set default, add with 设为默认, delete the selected address), so checkout shows the new choice on return.
- 「配送方式」:
  - Options from `data.shippingOptions`: 「标准快递」 with `免费配送 · 预计 {date} 送达` (+3 days), and 「顺丰次日达」 with `运费 ¥12 · 预计 {date} 送达` (+1 day).
  - Picking → sets `s.checkout.shipping`, closes and refreshes.
  - The date is today + `eta` days, formatted `{M}月{D}日 ({周X})`. It is computed live and not stored.
- 「用户协议」 / 「隐私政策」 **[demo]**: static demo text starting 「本页面为交互原型的演示文本。」. The privacy text points to the prototype menu's 「重置演示数据」.
- **Pay layer `VT.pay`** (`payLayer(app, opts)`, 08-checkout.js:176). It is a full-screen `app.layer` (`role="dialog"`, aria 「支付」): a bottom box slides up over a scrim.
  - Options:
    - `payment`: method id, which picks the name and logo; an unknown id falls back to 支付宝.
    - `amount`: the number to charge.
    - `onPaid()`: runs once when the payment succeeds.
    - `onView()`: handler for 「查看订单」.
    - `onShop()`: optional; by default the layer just closes.
    - `cancelMsg`: default 「已取消支付」.
    - `shopLabel`: default 「继续逛逛」; no caller sets it.
    - The function returns the overlay element.
  - Sequence (`data-state` on `.co-paybox`):
    1. `open`: spinner and `正在调起{name}…` for 900 ms (150 ms with reduced motion). No buttons.
    2. `confirm`: logo (or card icon) with `{name} · 模拟收银台`, the amount `¥{amount}`, 「演示原型不会产生真实扣款」, a dark 「确认支付」 (focused) and a ghost 「取消」.
    3. 确认支付 → `busy`: spinner and 「支付处理中…」 for 900 ms (200 ms with reduced motion). Then `onPaid()` runs and the box moves to the next state.
    4. `ok`: check badge, 「支付成功」, `实付 ¥{amount} · 演示订单，未产生真实扣款`, a dark 「查看订单」 (focused) and a ghost 「继续逛逛」.
  - 取消 → closes the layer and toasts `cancelMsg` (from checkout: 「已取消支付，订单未提交」). No order is created, and the cart and checkout stay as they were.
  - Tapping the scrim does nothing. Esc, when focus is inside the layer, closes it with no toast.
  - Checkout wiring: `payment: s.checkout.payment`, `amount: total`, `onPaid → createOrder`.
    - 「查看订单」:
      1. `app.drop('checkout')` removes the first `checkout` entry and everything above it from every tab stack. The plaza stack becomes 购物广场 › 商品详情.
      2. `app.open('orders', {oid}, {anim:'fade'})` closes overlays instantly, switches to 我的 and replaces its stack with 我的 › 我的订单 (`filter:'all'`) › 订单详情, at `/me/orders/o/:oid`.
      3. Back then goes to 我的订单, then 我的. The 购物广场 tab reopens on the product page.
    - 「继续逛逛」: `app.drop('checkout')`, then a contextual jump `app.go('plaza')` to the plaza root at `/plaza`. If checkout was on the plaza stack, the product page is cleared too and the animation is pop. If it came from another tab, the animation is fade and that tab keeps its product page.
  - Also used by 我的订单 `orderlist` (「去支付」 on 待付款 cards) and 订单详情 `orders` (the 「立即支付」 pay bar), both through `orderActions().paynow` (09-orders.js:65–80). There it is called with `payment: o.payment`, `amount: o.paid` and cancelMsg `已取消支付，订单仍在「待付款」`.
    - `onPaid` sets status 0, progress 1 and eta 「3 天内」, and adds a logistics line.
    - `onView` closes the layer and refreshes in place. `onShop` calls `app.go('plaza')`.

**Data.**
- Reads:
  - `s.cart`, with fallback `{p:'striped-shirt', color:'blue', size:'M', qty:1}`.
  - `s.checkout.{address, shipping, payment, agree}` (defaults `a1` / `standard` / `alipay` / `true`).
  - Addresses through `VT.store.h.addresses/address`: falls back to `data.addresses`, and resolves the stored id, then the default, then the first address.
  - `data.byId`, `data.shippingOptions`, `data.payments`.
- Writes: `s.cart`, `s.selections[pid]`, `s.checkout.*`, `s.orders`, `s.currentOrder`, `s.wardrobe`.
- All choices are persisted, so they survive tab switches and reloads. Kept UI state: `.co-scroll` (`data-keep-scroll="co"`).

**States & edge cases.**
- There is no empty-cart state. When `s.cart` is null (via 购物袋, or after an order), checkout shows the demo fallback cart (蓝色条纹衬衫 · M · ×1) **[demo]**, and paying for it creates a real order.
- There is no "no address" state. `VT.store.h.addresses` returns the seed list after the user deletes every address.
- No login gate: `s.loggedIn` is not read.
- The board preview pins the ETA to 「7月18日 (周五)」 (`app.preview`). This is board-only; drop it.
- **[demo]** Payment, cashier and order are all simulated. Demo strings: 「演示原型不会产生真实扣款」, `…演示订单，未产生真实扣款`, and 「（演示）」 in the logistics line.
- With 「使用新银行卡支付」 selected, the cashier reads 「正在调起使用新银行卡支付…」 and 「使用新银行卡支付 · 模拟收银台」.
- Closing the layer during `busy` does not cancel the timer (08-checkout.js:202). `onPaid` still runs: the order is created, the cart is cleared, and the user stays on an outdated checkout (verified with `app.back()`). Touch cannot trigger this in the prototype: the scrim is inert, and focus drops to `<body>`, so Esc misses the app's key handler. The web build should block Back/Esc while `busy`, or cancel the timer.
- The address row inserts the user-entered name, phone and address without HTML escaping (08-checkout.js:55). React escapes by default, so this only affects the prototype.

**Components used.** `VT.ui.backBtn` (in a custom `.co-head` that matches `VT.ui.subHead`), `VT.ui.img`, `VT.ui.price`, `VT.ui.yuan`, `VT.icon`, global `nav`, `app.sheet`, `app.layer`, `app.toast`, `app.later`, `app.drop`, `app.open`, `.co-card`, `.opt-list`/`.opt`/`.radio`, `.badge-demo`, `.chip`, `.qty`, `.mini`, `.spinner.spinner--dark`, `.co-link`, `VT.store.h.address/addresses`. Exports `VT.pay`.

**Acceptance checks.** `立即购买 → checkout`, `checkout address sheet lists address book`, `pay → 订单详情 (in 我的 → 我的订单)`, `new order 待发货`, `order details → back → 我的订单`, `我的订单 → back → 我的`, `finished checkout removed from plaza history`, `去支付 moves order out of 待付款` (reuses `VT.pay`).


### 10. 商家消息 · `messages`

**Route** `/plaza/messages` (proposed: HANDOFF §8, §13.1 #11) · **Type** secondary, parent 购物广场 · **Prototype** `js/screens/14-messages.js`, `css/screens/12-messages.css`; the 「消息通知」 sheet is `notices()` in `js/screens/04-plaza.js`; chats seed `storeChatSeed` in `js/data.js` · **Design ref** none: the screen was added after the mockups (514de38), so the prototype is the only reference.

**Purpose.** The user's conversations with stores, newest first, under a row that opens the platform notices. Every store answer is scripted **[demo]**.

**Layout (top → bottom).**
- Sub-header (`VT.ui.subHead('商家消息')`): back button (aria 「返回」) and the centred title 「商家消息」. No tab bar.
- Scroll (`.sub-scroll.msg-scroll`, `data-keep-scroll="msg"`):
  - System row (a button, card background, radius 16, padding 12): a 44 px round bell icon; 「消息通知」 (bold) with the time 「10 分钟前」 on the right; below, 「心愿单降价提醒、订单物流与 AI 造型师推荐」 on one line.
  - Heading 「商家」.
  - One row per store chat that has at least one message, newest activity first (gap 8). Each row is a button with the same card look: the store's 44 px logo with, when it has unread messages, a red count badge at its top-right (`.msg-dot`, 18 px, `#C8473D`); the store's full name (bold, ellipsis) with the last message's time on the right; the last message on one line (ellipsis), prefixed 「我：」 when the user sent it. Unread rows end with sr-only 「，{n} 条未读」.
  - Empty state, when no chat has a message: a chat icon, 「还没有和商家的聊天」 and a ghost button 「去购物广场逛逛」.
  - Note 「演示对话，回复为预设内容」.

**Interactions.**
- Back → pop to 购物广场 `/plaza`. A deep link to `/plaza/messages` gets the same parent.
- 「消息通知」 row → 「消息通知」 sheet.
- A store row → that store's chat thread sheet. Opening it marks the chat read at once: its badge and the 购物广场 badge drop.
- 「去购物广场逛逛」 → back.

**Overlays.** Both sheets close via ×, scrim tap, Esc or back.
- **「消息通知」 sheet** (`VT.plaza.notices(app)`; the bell on 购物广场 used to open it). Three static notices, each a button with an icon, bold title, line and time:
  - 「心愿单降价提醒」 · `你关注的「条纹亚麻衬衫」本周可用 ¥20 优惠券` · 「10 分钟前」 → push `product` `{pid:'striped-shirt'}` on top of this screen → `/plaza/messages/p/striped-shirt`.
  - 「订单运输中」 · 「你的订单预计 7月18日 送达，点击查看物流」 · 「今天 08:32」 → `app.open('orders', {oid: data.seedOrder.id}, {anim:'fade'})`. This switches to 我的 and replaces its stack with 我的 › 我的订单 (`filter:'all'`) › 订单详情, at `/me/orders/o/VT20260715092418`. The copy says 物流, but it opens 订单详情, not 物流跟踪 (HANDOFF §13.2 #17).
  - 「AI 造型师」 · 「为你准备了 3 套朋友聚会穿搭，快去看看」 · 「昨天」 → contextual tab jump to `stylist` (its root, fade) → `/stylist`.
- **Chat thread sheet** (`VT.storeChat.open(app, storeId)`, a full-height sheet). Also opened by 「联系商家」 on the store sheet, over 购物广场 or 商品详情, without navigating.
  - Title: the store's full name.
  - Thread (`.mchat`): the stored messages as bubbles, the store's on the left and the user's on the right. A store with no messages shows one greeting bubble, 「您好，欢迎光临 {full name}，请问有什么可以帮您？」, which is stored only once the user writes.
  - Quick-question chips 「什么时候发货？」「尺码怎么选？」「有优惠券吗？」; an input (placeholder 「输入消息…」, aria 「输入消息」; Enter sends, not while composing) with a dark 「发送」 button; the note 「演示对话，回复为预设内容」.
  - Opening sets the chat's `unread` to 0 and updates 商家消息 (when it is the screen underneath) or the 购物广场 badge.
  - Sending (a chip, or the trimmed input; blank does nothing): the user's bubble appears at once and the message is stored with the time `HH:mm`. If the chat was empty, the greeting is stored first. 900 ms later the store's reply (HANDOFF §9.14) is stored and appended. If the sheet was closed in the meantime, the reply raises the chat's `unread` by 1 and the badges show it. Each message moves the chat to the top of the list. The thread scrolls to the bottom on open and after each bubble.

**Data.** Reads `s.storeChats` and `data.storeById`. Writes `s.storeChats[storeId]` = `{ unread, at, msgs: [{ me, text, t }] }`: `unread` (opening, replies), `msgs` (sent and received messages, with `t` the display time) and `at` (last activity: `Date.now()` for new messages, small numbers in the seed; only used to order the list). Persisted. Keep scroll `msg`.

Seed (`data.storeChatSeed`); the list shows ZARA, Mono Atelier, Forma and the 购物广场 badge reads 1:

| Store | `unread` | `at` | Messages (`t`) |
|---|---|---|---|
| ZARA | 1 | 3 | store 「10:24」: 「您收藏的店铺上新啦！2024 秋冬系列已上线，收藏店铺的顾客可领取 ¥30 新品券～」 |
| Mono Atelier | 0 | 2 | user 「昨天」: 「黑色西装外套还有 S 码吗？」 · store 「昨天」: 「亲，黑色 S 码有现货，下单后 48 小时内发货哦～」 |
| Forma | 0 | 1 | store 「7月13日」: 「您的小白板鞋已送达，穿着还合适吗？有任何问题随时联系我们～」 |

**States & edge cases.**
- The empty state can't appear with the seed: three chats exist and nothing deletes one.
- Times are stored as display text. A message sent today keeps saying `HH:mm` on later days, and the seed's 「10:24」 / 「昨天」 / 「7月13日」 never move (HANDOFF §13.2 #38).
- Every store answers from the same keyword table **[demo]**. The ¥30 新品券 in the ZARA message and the coupon reply isn't applied anywhere; checkout keeps its flat ¥20 coupon.
- A reply that lands after the user left this screen is still stored, and counts as unread when the thread sheet was closed.
- The 「消息通知」 row has no unread state, and its time is fixed.
- 订单详情's 「联系商家」 is a different, unstored chat with other scripted answers. It never shows up here (HANDOFF §13.2 #36).

**Components used.** `VT.ui.subHead`, `VT.plaza.logo` (`.st-logo--msg`, 44 px), `VT.icon` (`bell`, `chat-dots`), `.msg-row`/`.msg-sys`/`.msg-face`/`.msg-dot`/`.msg-main`/`.msg-top`, `.msg-h`, `.ol-empty`, `.sheet-note`, `app.sheet` with `full: true`, `.mchat` with `.b.me`/`.b.them`, `.or-quick` chips, `.mchat-input`, `app.later`, `app.refresh`. Exports `VT.storeChat = { open, unread }`.

**Acceptance checks.** `plaza: chat icon opens 商家消息` (the rows are ZARA, Mono Atelier, Forma, with one unread badge) · `plaza: store chat replies and clears unread` (ZARA, chip 「什么时候发货？」) · `plaza: back from 商家消息 → 购物广场`.


## Orders (我的 → 我的订单)

### 11. 我的订单 · `orderlist`

**Route** `/me/orders?status=all|unpaid|toship|shipping|toreceive|aftersale` (prototype param `filter`, same values; missing → `all`) · **Type** secondary · **Prototype** `js/screens/09-orders.js` (`VT.screens.orderlist`, `listCard`, shared `orderActions`), `css/screens/09-orders.css` (`.ol-*`) · **Design ref** none

**Purpose.** All orders, filtered by status, each card offering the next action for that order.

**Layout (top → bottom).**
- `VT.ui.subHead('我的订单')`: back button + centred title. Fixed.
- Filter pills `.ol-tabs` (role tablist, aria 「订单状态」), fixed, horizontally scrollable (`data-keep-scroll="ol-tabs"`): 「全部」「待付款」「待发货」「运输中」「待收货」「售后」. Every pill except 全部 shows an inline count `<i>` (aria 「{n} 个」) when n > 0. Selected pill is dark (`aria-selected`).
- Scrolling list `.ol-scroll` (`data-keep-scroll="ol"`), cards in `s.orders` array order (no sorting; checkout adds new orders at the top).
- Card `.ol-card` (aria 「{title}，{status}」):
  - header: store icon + `o.shop` (fallback product brand) | status label (`orderStatus`; 待付款 in a warning colour) + 「 · 售后中」 when a return exists.
  - body (one button): product image (`img.order || img.card`), `o.title`, 「{colorLabel} / {size}」, 「下单时间 MM/DD HH:mm」 (from `created`); right column unit price + 「×{qty}」.
  - footer: 「需付款」 (unpaid) or 「实付款」 + `¥{paid}`; two small buttons, left outlined, right dark.
- Note 「订单为演示数据」 **[demo]** under the list (also under the empty state).

**Interactions.**
- Pill → sets the filter on the current stack entry (no new history entry; web: replace the `status` query), re-renders, scrolls the list to the top. Back from a child returns to the same filter.
- Card body (aria 「查看订单详情：{title}」) → push `orders` (`/me/orders/o/:oid`).
- Card buttons by status (left · right):
  - −1 待付款: 「取消订单」 → cancel dialog · 「去支付」 → pay layer.
  - 0 待发货: 「提醒发货」 → toast 「已提醒商家尽快发货」 (check icon, no state change) **[demo]** · 「查看详情」 → push `orders`.
  - 1, 2, 3: 「查看物流」 → push `tracking` for that order straight on top of the list (`/me/orders/tracking/:oid`; back returns to the list) · 「确认收货」 → receive dialog.
  - 4 已完成: 「申请售后」 (「售后进度」 when a return exists) → push `returns` straight on top of the list (`/me/orders/returns/:oid`) · 「再次购买」 → push `product` (`/me/orders/p/:pid`).
- Empty-state 「去购物广场逛逛」 → contextual tab jump to `plaza` (root, fade).
- Shared order actions (same code on 订单详情, 物流跟踪, 申请退换货; times are the current clock as 「M月D日 HH:mm」):
  - cancel, after confirming: the order is deleted from `s.orders` (there is no 已取消 status); `currentOrder` moves to the first order if it pointed at it; toast 「订单已取消」; on 订单详情 it then goes back, elsewhere it re-renders.
  - paynow: `VT.pay(app, { payment: o.payment, amount: o.paid, cancelMsg: '已取消支付，订单仍在「待付款」' })`. On success: `status 0`, `progress 1`, `eta '3 天内'`, `steps[1] = {label:'已发货', time:'待发货'}`, logistics entry 「订单已支付（演示），等待商家发货」 **[demo]** prepended. 「查看订单」 closes the layer and re-renders the current screen (on the 待付款 filter the card disappears); 「继续逛逛」 → contextual jump to `plaza`.
  - receive, after confirming: `status 4`, `progress 4`, `steps[3] = {label:'已签收', time: now}`, logistics 「你已确认收货，交易完成」 prepended; re-render; toast 「已确认收货」 (check icon).

**Overlays.**
- Cancel dialog: 「取消这个订单？」 / 「未付款订单取消后不可恢复。」 / 「再想想」 · 「取消订单」.
- Receive dialog: 「确认收货？」 / 「请确认已收到商品且无质量问题。」 line break 「确认后订单将完成（演示）。」 / 「取消」 · 「确认收货」.
- Both are `app.dialog`: centred card over a scrim; tapping the scrim does nothing; Esc = cancel; confirm button focused.
- Pay layer `VT.pay` (`payLayer` in `js/screens/08-checkout.js`, shared with checkout), bottom panel over a scrim, four states: 「正在调起{支付宝|微信支付|…}…」 spinner 900 ms (150 ms with reduced motion) → confirm: 「{name} · 模拟收银台」, amount, 「演示原型不会产生真实扣款」, 「确认支付」 / 「取消」 → 「支付处理中…」 900 ms (200 ms) → 「支付成功」, 「实付 ¥{amount} · 演示订单，未产生真实扣款」, 「查看订单」 / 「继续逛逛」. 「取消」 closes it and toasts the cancelMsg. Scrim tap does nothing; Esc closes it silently. All **[demo]**.

**Data.** Reads `orders`, `returns`, `data.orderFilters`, `data.orderStatus`, `data.byId` (image, brand). Writes `orders` (pay, receive, cancel) and `currentOrder` (cancel). Filter rule `VT.store.h.inFilter`: unpaid = status −1 · toship = 0 · shipping = 1 or 2 · toreceive = 3 · aftersale = has `returns[oid]` (any status) · all = every order. A 已完成 order without a return only appears under 全部; an order with a return appears under its status filter and under 售后. Keep: filter (stack params), scrolls `ol-tabs` and `ol`.

**States & edge cases.** Empty filter: receipt icon, 「暂无「{label}」的订单」 (e.g. 「暂无「待发货」的订单」 at reset), button 「去购物广场逛逛」. Counts at reset: 待付款 1, 运输中 1, 待收货 1, 售后 1, 待发货 none. Opened without a filter (deep link, back chain) → 全部. List and counts update in place after pay, cancel and receive.

**Components used.** `VT.ui.subHead`, `VT.ui.img`, `VT.ui.price`, `VT.ui.yuan`, `.btn.btn--sm` (`.ol-btn` outline / `.btn--dark`), `.ol-empty` (shared empty state, also used by 收货地址, 我的收藏, 浏览记录), `.sheet-note`, `app.dialog`, `VT.pay` (`.co-paylayer`, styled in `08-checkout.css`).

**Acceptance checks.** `我的 → 待收货 filter` · `待收货 shows the delivered order` · `全部 shows all orders` · `去支付 moves order out of 待付款` · `order details → back → 我的订单` · `我的订单 → back → 我的` · `我的 tab remembers its own history`


### 12. 订单详情 · `orders`

**Route** `/me/orders/o/:oid` · **Type** secondary · **Prototype** `js/screens/09-orders.js` (`VT.screens.orders`, `progress`, `etaLine`, `openChat`), `css/screens/09-orders.css` (`.or-*`) · **Design ref** `reference/design/screens/09_orders_support.png`

**Purpose.** One order: status and tracker, the item, and every order action (pay, logistics, merchant chat, return, order info, help, confirm receipt).

**Layout (top → bottom).**
- Own header `.or-head` (not `subHead`; larger title): back · 「订单详情」 (the design reads 「订单与售后」; keep the prototype's title) · headset icon button (aria 「在线客服」). Fixed. Everything below scrolls in `.or-scroll` (`data-keep-scroll="or"`), including the last button; nothing is sticky.
- Status card: big status label + `etaLine(o)`: −1 → 「请在 {payBy} 前完成支付」 (a static deadline string, no countdown, no expiry; fallback 「24 小时内」) · 3 → 「包裹已送达，请及时确认收货」 · 4 → 「已签收，感谢你的购买」 · otherwise 「预计 {eta} 送达」.
  - Unpaid: plain text block, no tracker; below a divider the pay bar 「需付款 ¥{paid}」 + dark 「立即支付」.
  - Other statuses: the text block is a button with a chevron (aria 「{label}，查看物流详情」), then the 4-step tracker.
- Tracker `progress(o)` (`<ol>`, aria 「物流进度：{label of the last done step}」): four steps from `o.steps` (label over time). done = clamp(1…4, `o.progress`, or `status + 1` when progress is missing); steps 1…done get a dark dot and bold label. A grey rail links the dots; a dark fill runs from dot 1 to the last done dot (dots at 10.3 / 37.58 / 63.76 / 89.33 % of the card width; fill width = difference, passed as CSS var `--done`). Status alone does not move it: the seed 运输中 order has `progress 2`, so only 已下单 and 已发货 are filled, as in the design. The 4th label comes from data (预计送达 / 已送达 / 已签收).
- Item card: one button with large image (`img.order || img.card`), `o.title`, 「{colorLabel} / {size}」 (+ 「 × {qty}」 if qty > 1), unit price `o.price`, chevron. Below, up to 4 thumbnails (aria 「查看商品图 {n}」): `product.orderThumbs`, else the card/tile/thumb images.
- Action cards (`.or-row`: icon, bold title, grey subtitle, chevron):
  - unpaid: one card 「取消订单」 / 「未付款订单可直接取消」.
  - paid: 「查看物流」 / 「实时跟踪包裹物流信息」 (status 0: 「商家备货中，发货后可查看」) + 「联系商家」 / 「咨询商品、发货或售后问题」; then a card 「申请退换货」 / 「支持 7 天无理由退换」, or with a return 「已提交{退货|换货} · 等待商家处理」 (「商家已同意」 when stage ≥ 2).
  - always: 「订单信息」 / 「查看订单编号、收货地址等」 + 「帮助与客服」 / 「常见问题解答，获取更多帮助」.
- Status 2 or 3 only: full-width dark 「确认收货」 after the cards.
- No price breakdown and no address on the page: both are in the 订单信息 sheet.

**Interactions.**
- Back → pop. Headset → service chat sheet. 「联系商家」 → merchant chat sheet.
- Status block or 「查看物流」 → push `tracking` (`/me/orders/o/:oid/tracking`), also for status 0.
- 「立即支付」 → pay layer (see 我的订单); 「查看订单」 re-renders this screen as 待发货 with 「预计 3 天内 送达」.
- Item card → push `product` (`/me/orders/o/:oid/p/:pid`). Thumbnail n → image viewer sheet opened at n.
- 「取消订单」 → cancel dialog → order deleted, back to the previous screen, toast 「订单已取消」.
- 「申请退换货」 → push `returns` (`/me/orders/o/:oid/returns`), for every paid status.
- 「订单信息」 → info sheet. 「帮助与客服」 → push `help` (`/me/orders/o/:oid/help`: FAQ accordion from `data.faqs`, 「联系在线客服」, 「意见反馈」).
- 「确认收货」 → receive dialog → re-render as 已完成 (button gone, tracker full, 4th step 已签收 + now), toast 「已确认收货」.

**Overlays.**
- 订单信息 sheet, key/value list: 「订单编号」 id + underlined 「复制」 · 「下单时间」 `created` · 「店铺」 · 「支付方式」 「{name}（演示）」 **[demo]** · 「商品金额」 price × qty · 「运费」 · 「优惠券」 「- ¥{coupon}」 · 「需付款」/「实付款」 bold · 「收货信息」 name, ideographic space, phone, line break, address. 复制 → clipboard + toast 「订单编号已复制」; clipboard failure → toast 「订单编号：{id}」.
- 商品图片 sheet: the image (contained) and 「上一张」 · 「{n} / {total}」 · 「下一张」, wrapping around.
- Chat sheet `VT.openChat(app, 'merchant' | 'service', oid)`, full height:
  - title `o.shop` (fallback 「店铺客服」) or 「在线客服 · 小衣」; first bubble 「您好，我是{店铺客服|小衣}，请问有什么可以帮您？」.
  - three quick chips: merchant 「什么时候能到？」「可以换尺码吗？」「面料会起球吗？」; service 「怎么修改收货地址？」「数字分身怎么重新生成？」「如何开发票？」. Input 「输入消息…」 + 「发送」 (Enter sends, empty ignored); note 「演示对话，回复为预设内容」.
  - a chip or typed text adds a user bubble and scrolls to the bottom; 800 ms later the scripted answer for that exact text appears (any of the six works in either chat), else 「收到～已为您记录，稍后会有专人跟进处理（演示回复）。」. Answer to 「什么时候能到？」 depends on status: ≤ 0 「亲，订单{付款后|已支付，}商家会在 48 小时内发货～」, ≥ 3 「亲，包裹已经送达啦，请及时查收～」, else 「亲，您的包裹正在运输中，预计 {eta} 送达，可在「查看物流」实时跟踪哦～」. Other answers: `openChat` `answers` map.
  - chips stay after use; the thread is not kept between openings; no reply if the sheet closed before 800 ms. All **[demo]**.
- Sheets close with ✕ (aria 「关闭」), scrim tap or Esc. Pay layer, cancel and receive dialogs: see 我的订单.

**Data.** Reads the order by `oid` (fallback `currentOrder`, then the first order; there is no not-found state), `data.byId[o.p]`, `returns[oid]`, `VT.store.h.address(s, o.address)` (live address-book lookup; falls back to the default address), `data.payments`. Writes through the shared actions. Keep scroll `or`. Also opened by checkout 「查看订单」 (`app.drop('checkout')`, then open chain 我的 › 我的订单 (全部) › 订单详情 with a fade; replaces the 我的 stack) and by the 「订单运输中」 item of the 「消息通知」 sheet on 商家消息 (same open chain to the seed order).

**States & edge cases.** −1: pay bar, 取消订单 row, info/help only. 0: tracker at step 1, 查看物流 still navigates. 2 and 3: 确认收货 button. 4: no button. The service chat gets no `oid`, so it answers about `currentOrder`, not this order. Deadline and logistics are **[demo]** data.

**Components used.** `VT.ui.backBtn`, `VT.ui.iconBtn`, `.or-card`, `actionRow()` (`.or-row`), `progress()` (`.or-track`, `.or-step`, `.or-dot`; shared with 物流跟踪, exported as `VT.orders.progress`), `VT.ui.price`, `VT.ui.yuan`, `app.sheet` + `.kv`, `.co-link` (from `08-checkout.css`), `.or-viewer`, `VT.openChat` (`.mchat`, `.or-quick` + `.chip`, `.mchat-input`, `.sheet--full`), `app.dialog`, `VT.pay`.

**Acceptance checks.** `pay → 订单详情 (in 我的 → 我的订单)` · `new order 待发货` · `order details → back → 我的订单` · `order details 运输中` · `订单详情 → 物流跟踪` · `物流跟踪 → back → 订单详情` · `订单详情 → 申请退换货` · `return submitted → back on details` · `merchant chat replies` · `order info sheet`


### 13. 物流跟踪 · `tracking`

**Route** `/me/orders/o/:oid/tracking` (from 订单详情) · `/me/orders/tracking/:oid` (from a 我的订单 card; back returns to the list) · **Type** secondary · **Prototype** `js/screens/09-orders.js` (`VT.screens.tracking`, `carrierParts`), `css/screens/09-orders.css` (`.tr-*`) · **Design ref** none

**Purpose.** Carrier, waybill number and the full logistics timeline of one order.

**Layout (top → bottom).**
- `VT.ui.subHead('物流跟踪')`, fixed. Everything else scrolls in `.tr-scroll` (`data-keep-scroll="tr"`), including the buttons.
- Summary card: product image, big status label, `etaLine(o)` (same copy as 订单详情).
- Carrier card (aria 「快递信息」): 「承运快递」 name; 「运单号」 number + 「复制」, or 「发货后生成」 without 复制. `o.carrier` is split at the first space: 「顺丰速运 SF1428 6630 9921」 → 顺丰速运 / SF1428 6630 9921; 「待分配」 → name only.
- Tracker card: the same `progress(o)` as 订单详情; omitted for unpaid orders.
- Timeline card: 「物流详情」, then `o.logistics` in data order (newest first; the first entry has a dark, ringed dot), each with time `t` and text `s`; note 「物流信息为演示数据」 **[demo]**.
- Button row: ghost 「联系商家」 (chat icon) + dark 「确认收货」 for status 2 or 3 only.

**Interactions.**
- 「复制」 → copies the number with spaces removed (e.g. SF142866309921), toast 「运单号已复制」; clipboard failure → toast 「运单号：{no}」.
- 「联系商家」 → merchant chat sheet (see 订单详情).
- 「确认收货」 → receive dialog → re-render: 已完成, 「已签收，感谢你的购买」, 4th step 已签收 + current time, new top entry 「你已确认收货，交易完成」, button gone; toast 「已确认收货」.
- Back → pop (to 订单详情 or 我的订单, whichever pushed it).

**Overlays.** Merchant chat sheet and receive dialog (see 订单详情 and 我的订单).

**Data.** Reads the order (same fallback as 订单详情): `carrier`, `steps`, `progress`, `logistics`, `eta` / `payBy`, `data.byId[o.p].img`. Pay and receive prepend timeline entries. ETA text = `etaLine` (exported as `VT.orders.etaLine`). Keep scroll `tr`.

**States & edge cases.** Not shipped (carrier 「待分配」): 「发货后生成」, no 复制, one timeline entry. Unpaid: no tracker card, ETA 「请在 {payBy} 前完成支付」; the UI never links an unpaid order here (deep link only). Seed timelines have 4 / 1 / 5 / 4 entries. All logistics are **[demo]** data.

**Components used.** `VT.ui.subHead`, `.or-card`, `progress()`, `.timeline` (`components.css`), `.co-link`, `.sheet-note`, `.btn--ghost` / `.btn--dark` `.btn--lg`, `VT.openChat`, `app.dialog`.

**Acceptance checks.** `订单详情 → 物流跟踪` · `tracking timeline` · `物流跟踪 → back → 订单详情`


### 14. 申请退换货 · `returns`

**Route** `/me/orders/o/:oid/returns` (from 订单详情) · `/me/orders/returns/:oid` (from the 我的订单 「申请售后」 / 「售后进度」 button; back returns to the list) · **Type** secondary · **Prototype** `js/screens/09-orders.js` (`VT.screens.returns`, `shrinkPhoto`, `drafts`, `RET_STAGES`), `css/screens/09-orders.css` (`.rt-*`) · **Design ref** none

**Purpose.** File a return or exchange for one order, or follow and withdraw the one already filed.

**Layout (top → bottom).** Two modes on the same route, chosen by `s.returns[oid]`. Header fixed; everything else, including the buttons, scrolls in `.rt-scroll` (`data-keep-scroll="rt"`).
- Form (no return yet): `VT.ui.subHead('申请退换货')`.
  - Mini product row: image, title, 「{colorLabel} / {size} · 实付 ¥{paid}」.
  - 「服务类型」: two-segment radio (aria 「服务类型」): 「退货退款」 (value 退货, default) | 「换货」.
  - 「申请原因」: radio list, nothing preselected: 「尺码不合适」「颜色 / 款式与预期不符」「质量问题」「不想要了（7 天无理由）」.
  - 「补充说明（选填）」: textarea, max 120 characters, placeholder 「描述一下遇到的问题」.
  - 「上传凭证（选填，最多 3 张）」: thumbnails, each with a ✕ (aria 「删除第 {n} 张」), plus a dashed add tile with a camera icon (aria 「添加凭证照片」) while fewer than 3.
  - Dark full-width 「提交申请」; note 「演示原型：提交后商家不会真的收到申请」 **[demo]**.
- Progress (return exists): header title becomes 「售后进度」.
  - Mini product row (as above).
  - Status card: 「{退货|换货}申请处理中」 + 「商家会在 1–2 个工作日内审核」 (stage ≥ 2: 「商家已同意，请按提示寄回商品」); 4-step stepper 「提交申请」「商家审核」「寄回商品」「退款完成」 (换货: 「换货完成」), steps with index < stage are done.
  - Details card: 「服务类型」 (「退货退款」 or 「换货」) · 「申请原因」 · 「补充说明」 (only if a note) · 「提交时间」 · 「退款金额」 「¥{paid}（原路退回）」 (退货 only); evidence photos below.
  - Buttons ghost 「撤销申请」 + dark 「联系商家」; note 「售后进度为演示数据」 **[demo]**.

**Interactions.**
- Type or reason → update the draft, re-render. Note → saved to the draft on every input.
- Add tile → native picker (`accept="image/*"`). Non-image → toast 「请选择图片文件」; decode failure → 「无法读取这张图片，请换一张」; otherwise `shrinkPhoto`: scaled so the longest side is at most 360 px (never upscaled), JPEG quality 0.78, data URL appended. Max 3 (the tile disappears at 3); no file-size limit. ✕ removes that photo.
- 「提交申请」: no reason → toast 「请选择申请原因」 (the only validation). Otherwise saves `returns[oid] = { type, reason, note (trimmed), photos, time: 'M月D日 HH:mm', stage: 1 }`, discards the draft, goes back one screen, toast 「{退货|换货}申请已提交（演示）」 (check icon). 订单详情 then shows 「已提交{type} · 等待商家处理」; the list shows 「 · 售后中」 and 「售后进度」.
- 「撤销申请」 → dialog → deletes the return, re-renders as an empty form (title back to 申请退换货), toast 「售后申请已撤销」.
- 「联系商家」 → merchant chat sheet (see 订单详情).

**Overlays.** Withdraw dialog: 「撤销售后申请？」 / 「撤销后可在有效期内重新申请。」 / 「再想想」 · 「撤销申请」. Merchant chat sheet (see 订单详情).

**Data.** Reads the order (same fallback), `data.byId[o.p]`, `returns[oid]`. Writes `returns[oid]` on submit; deletes it on withdraw. The draft per order id `{ type, reason, note, photos }` lives in memory (module `drafts`): it survives leaving and re-opening the form and tab switches, is lost on reload and is never persisted; the textarea also has `data-keep-value="rt-note"`. Evidence photos are persisted with the return (cleared by 隐私与安全 → 清除已上传的照片). Keep scroll `rt`.

**States & edge cases.** The stage is set to 1 and never advances, so only 「提交申请」 is ever done and the stage ≥ 2 copy is unreachable **[demo]**. Seed: the 已完成 skirt order already has an exchange, so it opens in progress mode. 订单详情 offers this form for any paid order (also 待发货 and 运输中); the list only offers it for 已完成.

**Components used.** `VT.ui.subHead`, `.mini` (`.rt-mini`), `.co-sh-h` headings (from `08-checkout.css`), `.or-seg`, `.opt-list` / `.opt` / `.radio`, `textarea.field-area`, `.rt-photos` / `.rt-add` / `.rt-del`, `.rt-steps`, `.kv`, `.tr-acts`, `.sheet-note`, `app.dialog`, `VT.openChat`.

**Acceptance checks.** `订单详情 → 申请退换货` · `return evidence photo added` · `return submitted → back on details`


### Order data reference (`js/data.js`, `js/store.js`)


**Status codes** (`orderStatus`; unknown codes show 「处理中」 via `statusLabel`)

| code | label | filter | 我的订单 card buttons | 订单详情 extras |
|---|---|---|---|---|
| −1 | 待付款 | `unpaid` | 取消订单 · 去支付 | pay bar 立即支付, 取消订单 row, no tracker |
| 0 | 待发货 | `toship` | 提醒发货 · 查看详情 | 查看物流 sub 「商家备货中，发货后可查看」 |
| 1 | 已发货 | `shipping` | 查看物流 · 确认收货 | no 确认收货 (no data uses status 1) |
| 2 | 运输中 | `shipping` | 查看物流 · 确认收货 | 确认收货 button |
| 3 | 待收货 | `toreceive` | 查看物流 · 确认收货 | 确认收货 button |
| 4 | 已完成 | 全部 only | 申请售后 / 售后进度 · 再次购买 | none |
| any, with `returns[oid]` | label + 「 · 售后中」 | also `aftersale` | as its status | 申请退换货 sub 「已提交… · 等待商家处理」 |

Filters (`orderFilters`, order and icon): `all` 全部 · `unpaid` 待付款 wallet · `toship` 待发货 box · `shipping` 运输中 truck · `toreceive` 待收货 box-check · `aftersale` 售后 aftersale.

**Seed orders** (`seedOrders`; all qty 1, coupon ¥20, shipping ¥0; `currentOrder` defaults to the first)

| id | shop | `p` · title | colour / size | price → paid | pay · addr | status · progress | eta / payBy | carrier | created | log |
|---|---|---|---|---|---|---|---|---|---|---|
| VT20260715092418 | Reformation 官方旗舰店 | striped-shirt · 宽松棉麻衬衫 | 蓝色 / M | 259 → 239 | alipay · a1 | 2 运输中 · 2 | 7月18日 | 顺丰速运 SF1428 6630 9921 | 2026-07-15 09:24:18 | 4 |
| VT20260717203305 | ZARA 官方旗舰店 | brown-blazer · 灰褐气质西装外套 | 灰褐 / S | 399 → 379 | wechat · a1 | −1 待付款 · 1 | 付款后 3 天内 / 7月18日 20:33 | 待分配 | 2026-07-17 20:33:05 | 1 |
| VT20260710151207 | Forma 官方旗舰店 | white-sneakers · 米白小白板鞋 | 米白 / 37 | 329 → 309 | alipay · a2 | 3 待收货 · 4 | 7月13日 | 中通快递 7311 2048 5566 | 2026-07-10 15:12:07 | 5 |
| VT20260702110846 | Linea Studio 官方店 | pleated-skirt · 咖啡百褶半身裙 | 咖啡 / S | 259 → 239 | alipay · a1 | 4 已完成 · 4 | 7月5日 | 顺丰速运 SF1427 0951 3307 | 2026-07-02 11:08:46 | 4 |

Steps are 已下单 / 已发货 / 运输中 + a 4th label: 预计送达 (shirt, blazer), 已送达 (sneakers), 已签收 (skirt). The unpaid blazer's later step times are 待付款 / — / —.

**Seed return** (`seedReturns`): `VT20260702110846` → `{ type: '换货', reason: '尺码不合适', note: '想换大一码（M）', time: '7月8日 19:42', stage: 1 }`, no photos.

**Orders created at checkout** (`createOrder` in `08-checkout.js`): id `VT` + `YYYYMMDDHHmmss`, added at the top, `shop` = the product's store full name (`data.storeOf(p).full`), status 0, progress 1, eta = delivery date, 4th step 预计送达 + that date, carrier 待分配, one entry 「订单已提交并完成支付（演示），等待商家发货」.



## Avatar, account and settings (from 我的)

Shared by every screen in this group:
- All are **secondary** screens. Each has a fixed header `VT.ui.subHead(title)` (back button 「返回」 + centred `h1`), one scrolling body `.scroll.sub-scroll`, and no tab bar. Back pops the stack of the tab that opened the screen.
- Switch rows (`VT.ui.toggleRow`, `role="switch"`, `data-key="group.key"`) flip `s[group][key]` at once and update the switch in place. They show no toast and do not re-render.
- Any navigation (`app.go` / `app.open` / `app.launch`) closes open sheets and dialogs instantly. Sheets close with ✕ 「关闭」, a scrim tap or Esc. Dialogs close with their buttons or Esc (Esc counts as cancel). Tapping a dialog's scrim does nothing.
- Toasts marked (✓) show the check icon. Every toast here lasts 2200 ms.
- A screen re-renders from the store each time it is shown again. Only `data-keep-scroll` scroll positions and `data-keep-value` inputs are restored.
- **Design ref.** None of these screens has a reference design (REPORT "Known limitations"). The prototype screenshot `reference/prototype/docs/screenshots/secondary-screens.jpg` shows most of them.

---

### 15. 我的形象 · `avatarhub`

**Route** `/me/avatar` · **Type** secondary · **Prototype** `js/screens/12-avatar-hub.js`, `css/screens/11-account.css` (`.ah-*`). Generation comes from `js/screens/02-avatar.js` (`VT.avatarGen`) and `css/screens/02-avatar.css` (`.av-gen*`). · **Design ref** none

**Purpose.** Shows the active digital avatar and lets the user replace its photos, regenerate it, and edit body data and avatar preferences; an avatar other than 本人 can also be renamed or deleted here (HANDOFF §9.15).

**Layout (top → bottom).**
- Header 「我的形象」 (fixed).
- Scroll (`data-keep-scroll="ah"`):
  - **Hero.**
    - Left: a taupe plate (`assets/backgrounds/fitting-plate.webp`) holding the full-body figure `assets/people/avatar-base.webp`. It is **always the preset figure**, whatever the state.
    - Right, top to bottom: the status chip, title 「我的数字分身」 (an avatar other than 本人 shows its name), the status line, the note 「2D 形象预览 · 演示版」 **[demo]**, and a small dark button 「去试衣间」 (dress icon) pinned to the bottom.
  - **「生成照片」.** A card with two tiles, 「全身照」 and 「生活照」.
    - Each tile shows the uploaded photo (`avatar.fullbody.src` / `avatar.portrait.src`) or a sample (`assets/people/upload-fullbody.webp` / `upload-portrait.webp`). A caption pill shows the label plus 「已上传」 or 「示例」. The tiles cannot be tapped.
    - Under the card: a ghost button 「更换照片」 (upload icon) and a dark button 「重新生成」 (refresh icon).
  - **「身材数据」.**
    - Row 「身高 / 体重」, value 「{height} cm · {weight} kg」.
    - Row 「常穿尺码」, value 「{size} · 鞋码 {shoe}」.
    - Note 「用于合身度参考和尺码推荐」.
  - **「形象偏好」.**
    - Switch 「试穿时显示尺码建议」, sub 「根据身材数据提示偏大或偏小」 (`avatarPrefs.sizeTips`).
    - Switch 「AI 造型师使用我的形象」, sub 「推荐造型时用数字分身预览上身效果」 (`avatarPrefs.stylistUse`).
    - Note 「照片只保存在本机，可在「设置 → 隐私与安全」中清除」 **[demo]**.
  - **「角色管理」** (only for an avatar other than 本人): row 「名称」 (`edit` icon, value: the name) → the 修改名称 sheet (field max 8, Enter or 「保存」; blank → 「请填写名称」; saved → back, toast 「名称已保存」); row 「删除这个数字分身」 (`trash` icon, sub 「TA 的照片、衣橱和搭配会一并删除」) → dialog 「删除「{name}」？」 / 「TA 的照片、衣橱和搭配会一并删除，无法恢复。」 / 「取消」 · 「删除」. Deleting removes the avatar and its data, switches back to 本人, re-renders this screen for 本人 and toasts 「已删除「{name}」，已切换回本人」.

**Interactions.**
- 「去试衣间」 (`data-act="tab"`) → **switches tab** to 首页 exactly like the tab bar (`{tab:true}`). 首页 keeps its own stack, there is no animation, and 我的 stays on 我的形象.
- 「更换照片」 → **push** the avatar upload screen `avatar` with `{from:'profile'}`, at `/me/avatar/upload` (see the note at the end of this section). The task brief and acceptance check call this button 上传照片.
- 「重新生成」 → runs the generation layer in place (`VT.avatarGen.run(app)`, context `hub`). Missing photos are replaced by samples.
- Either 身材数据 row → the 身材数据 sheet.
- The two switches flip `avatarPrefs.*`.

**Overlays.**
- **Sheet 「身材数据」.**
  - Two columns: 「身高（cm）」 (number, min 130, max 210) and 「体重（kg）」 (number, min 30, max 150).
  - 「常穿尺码」 chips 「XS」「S」「M」「L」「XL」, single choice.
  - 「鞋码」 (number, min 33, max 46), then 「保存」.
  - On save, checks run in this order and only the first failure shows a toast; the sheet stays open. Ranges are inclusive, decimals are accepted, and an empty field counts as 0.
    1. Height → 「身高请填写 130–210 cm」.
    2. Weight → 「体重请填写 30–150 kg」.
    3. Shoe size → 「鞋码请填写 33–46」.
  - Success → `body = { height, weight, size, shoe: String(shoe) }` (height and weight stay numbers). The sheet closes, the screen refreshes, and the toast 「身材数据已更新」 (✓) shows.
- **Full-screen generation layer** (`.av-gen`, the same layer as first launch):
  - Stepper at step 2: 「上传照片」 ✓, 「生成建模」 current, 「完成」.
  - A scanning card showing the uploaded full-body photo, or the sample.
  - A percentage from 0 to 100 and a progress bar. They run for **4200 ms** (900 ms with reduced motion) on an ease-out curve.
  - Four stage lines, 「解析身材比例与体型特征」「识别面部特征与发型」「构建数字分身模型」「匹配肤色与光影细节」, each lighting up per 24 % step.
  - If a photo is missing: 「未上传全部照片，演示将使用示例照片」.
  - 「取消」 → the layer closes, toast 「已取消生成」, nothing is stored (unless pressed after progress reaches 100 %, HANDOFF §13.2 #2). Esc also closes it, but with no toast.
  - **350 ms** after 100 %:
    - The store gets `avatar.status = 'ready'`, `generatedAt = Date.now()` and `demo = true`.
    - The stepper moves to step 3, and a result card shows the preset avatar with 「数字分身已生成」 and 「演示原型使用预设的数字分身（2D 形象预览）。」 + line break + 「真实产品将基于你上传的照片进行三维重建。」 **[demo]**.
    - If samples were used, the toast 「已使用示例照片生成演示分身」 shows.
  - Result buttons:
    - 「完成」 → the layer closes, 我的形象 re-renders, toast 「数字分身已更新」 (✓).
    - 「去首页试穿」 → **contextual tab jump** to 首页 (`app.go('fitting')`: the tab's root, with a fade). 我的 stays on 我的形象 and there is no toast.
  - The whole generation is simulated **[demo]**.

**Data.**
- Reads `avatar.{status,fullbody,portrait,generatedAt}`, `body` (default `{ height: 165, weight: 48, size: 'M', shoe: '37' }`) and `avatarPrefs` (both default true). `avatar` and `body` are the **active avatar's** (a new avatar starts from the default body data); `avatarPrefs` are shared by all avatars.
- Writes `body`, `avatarPrefs.*`, and through generation `avatar.status`, `avatar.generatedAt` and `avatar.demo`.
- **No other screen reads `body` or `avatarPrefs`.** 商品详情's 尺码指南 hard-codes 「身高 165cm · 胸围 84cm」 → M.

**States & edge cases.**
- `status === 'ready'`: the chip shows ✓ 「已生成」 in green. The status line is 「更新于 {M}月{D}日 {HH}:{mm}」 when `generatedAt` is set (local time; month and day not zero-padded, time zero-padded, e.g. 「更新于 10月9日 08:53」). Without it the line is 「使用示例照片生成」; this happens when the avatar became ready via 跳过, 启动页 登录, or 商品详情 试穿上身.
- Any other status (`none`, or `stale` after replacing a photo): the chip shows a neutral 「示例形象」 and the line is 「尚未用你的照片生成」. In normal use, `none` can only be reached by a deep link, because setup always ends with `ready`.
- After 重新生成, only the chip and the status line change. The hero figure and the photo tiles stay the same.
- The photo tiles follow uploads, not status. For example, after 清除已上传的照片 the status is still `ready` but both tiles show 「示例」.

**Components used.** `VT.ui.subHead`, `.ah-hero` / `.ah-plate` / `.ah-chip` / `.ah-shots` / `.ah-acts` / `.ah-fields`, `VT.ui.row`, `VT.ui.toggleRow`, `.btn--dark.btn--sm`, `.btn--ghost` / `.btn--dark .btn--lg`, `app.sheet` + `.field` + `.chip` in `.ad-tags`, `VT.avatarGen.run`, `app.layer`.

**Acceptance checks.** `我的 → 我的形象`, `我的形象 → back → 我的`, `我的形象 → 上传照片`, `generate → back to 我的形象`, `重新生成 stays on 我的形象`, `avatar preference toggle`.

**See also: the upload screen at `/me/avatar/upload`.** This is `avatar` with `from: 'profile'`. Its full spec is in the launch flow's 上传照片 section (`/welcome/avatar`). Seen from 我的形象, it differs from first launch in five ways:
1. There is no 「跳过」.
2. The CTA reads 「重新生成数字分身」.
3. 「完成」 pops back to `/me/avatar` and shows 「数字分身已更新」.
4. 「去首页试穿」 leaves the upload screen on 我的's stack.
5. A picked photo is stored at once. Going back without regenerating leaves the avatar `stale`, so 我的形象 then shows 「示例形象」 / 「尚未用你的照片生成」.


### 16. 我的资料 · `editprofile`

**Route** `/me/profile` (also `/me/settings/profile` via 设置 → 个人资料) · **Type** secondary · **Prototype** `js/screens/11-account.js` (L24–70), `css/screens/11-account.css`; crop helper `VT.profile.squarePhoto` in `js/screens/10-profile.js` · **Design ref** none

**Purpose.** Edit nickname, signature, gender, birthday and profile picture. Nothing is stored until 「保存」.

**Layout (top → bottom).**
- Header 「我的资料」 (fixed). The same screen has other names elsewhere: the 我的 row says 「我的资料」, the 设置 row says 「个人资料」, the 我的 header button's aria-label is 「编辑个人资料：{昵称}」, and the simulator list says 「编辑资料」.
- Scroll (`data-keep-scroll="ep"`):
  - Round profile picture with a dark camera badge. The whole circle is a `<label>` (title 「更换头像」) around a hidden `input[type=file][accept="image/*"]` (aria 「更换头像」). Hint below: 「点击更换头像」. The picture is chosen in this order: draft photo → `profile.photo` → `avatar.portrait.src` → `assets/people/chat-user.webp`.
  - Card of right-aligned field rows:
    - 「昵称」: text, maxlength 12.
    - 「个性签名」: text, maxlength 20, placeholder 「写一句介绍自己」.
    - 「性别」: segmented radiogroup 「女」「男」「保密」.
    - 「生日」: native `input[type=date]`, value `YYYY-MM-DD`.
    - 「手机号」: read-only, no chevron. Shows the masked phone plus the tag 「已绑定」.
  - 「保存」: dark, full width. It sits inside the scroll (not sticky).

**Interactions.**
- Typing in 昵称 / 个性签名 / 生日 updates the draft on every `input` event. The store is not touched.
- Gender segment → sets `draft.gender` and re-renders (typed text is kept).
- Picture → the picked file is centre-cropped to a **320×320 JPEG (quality 0.82)** and the preview updates. It is stored only on 保存. Any failure, including a non-image file, shows the toast 「无法读取这张图片，请换一张」. There is no file-size limit.
- 「保存」 → the name is trimmed. If it is empty: toast 「昵称不能为空」 and stay. Otherwise `profile` gets the draft (name and bio trimmed, gender, birthday, photo), the draft is dropped, the screen goes **back** to its opener (我的 or 设置), and the toast 「资料已保存」 (✓) shows.
- Back button → discards the draft without asking.

**Overlays.** None (only the native file picker).

**Data.**
- Reads `profile.{name,bio,gender,birthday,phone,photo}` and `avatar.portrait` (photo fallback).
- 保存 writes `profile.name|bio|gender|birthday|photo`. `profile.phone` can never be edited.
- The draft is one module-level copy of `profile`. It is created at first render and cleared on back or save. If the screen is left any other way (e.g. a tab switch) the draft survives and is shown again on return. `data-keep-value`: `ep-name`, `ep-bio`.
- 我的 shows the new name, signature and photo after saving. An empty signature shows as 「编辑个性签名」 there.

**States & edge cases.**
- Defaults (`store.js`): 「小橙子」 / 「开启更美的每一天」 / 女 / 1998-06-18 / 「138****8888」.
- The phone number and the 「已绑定」 tag are static **[demo]**.
- Birthday has no range check and can be cleared. Signature may be empty.
- The 我的 header photo picker handles the same mistake differently: for a non-image it shows 「请选择图片文件（JPG / PNG 等）」 (10-profile.js:40). Pick one message for both.

**Components used.** `VT.ui.subHead`, `.set-group` / `.set-card`, `.set-row--field`, `.seg`, `VT.ui.row`, `.set-tag`, `.btn--dark.btn--lg.btn--block.sub-save`, `VT.ui.profilePhoto`, `VT.profile.squarePhoto`.

**Acceptance checks.** `我的 → 我的资料`, `我的资料 → back → 我的`, `edit profile saved`.


### 17. 收货地址 · `addresses`

**Route** `/me/addresses`. Also reached at `/me/settings/addresses`, and at `<product path>/checkout/addresses` from checkout's 「管理收货地址」 (e.g. `/plaza/p/:pid/checkout/addresses`). · **Type** secondary · **Prototype** `js/screens/11-account.js` (L72–157), `css/screens/11-account.css` (+ `.co-link` from `08-checkout.css`, `.ol-empty` from `09-orders.css`) · **Design ref** none

**Purpose.** Address book: list, add, edit and delete addresses, and pick the default that checkout uses.

**Layout (top → bottom).**
- Header 「收货地址」 (fixed).
- Scroll (`data-keep-scroll="ad"`): address cards in stored order (new ones are appended). Each card has:
  - A top line: bold name, masked phone, tag chip (「家」 / 「公司」 / 「学校」) and a dark 「默认」 tag on the default address.
  - The full address line.
  - A footer row: on the left, a radio button reading 「默认地址」 (on) or 「设为默认」; on the right, the text links 「编辑」 and 「删除」.
- Empty state in code: pin icon + 「还没有收货地址」. It can never be reached (see edge cases).
- Fixed footer `.sub-foot`: dark full-width button 「新增收货地址」 with a plus icon.

**Interactions.**
- 「新增收货地址」 → empty form sheet. 「编辑」 → the form sheet pre-filled.
- Radio 「设为默认」 / 「默认地址」 → that address becomes the only default **and** `checkout.address` is set to it. The screen refreshes and shows the toast 「已设为默认地址」. This also fires when the address is already the default.
- 「删除」 → dialog. On confirm, the address is removed. If no default remains, the first address becomes the default. If it was the checkout selection, `checkout.address` becomes the first remaining id (or `null`). Toast: 「地址已删除」.
- Cards are not tappable. There is **no pick-and-return mode**, even when the screen was opened from checkout.
- Back → pops to the opener (我的, 设置 or 结算下单). Checkout re-renders with the current selection.

**Overlays.**
- **Address form sheet.** Title 「新增收货地址」 or 「编辑收货地址」.
  - 「收货人」: maxlength 12, placeholder 「姓名」.
  - 「手机号」: `tel`, numeric keypad, maxlength 11. It **always starts empty**. Placeholder for a new address: 「11 位手机号」. Placeholder when editing: 「{masked phone}（不修改可留空）」.
  - 「详细地址」: maxlength 48, placeholder 「省市区 + 街道门牌」. This is one free-text field; there is no region picker.
  - 「标签」: chips 「家」「公司」「学校」, single choice, default 「家」.
  - Switch 「设为默认地址」: starts with the address's current default flag.
  - Button 「保存地址」, then the note 「演示原型：地址只保存在本机浏览器」 **[demo]**.
- **Save validation.** Checks run in this order. The first failure shows a toast and the sheet stays open.
  1. Empty name → 「请填写收货人」.
  2. Phone does not match `^1\d{10}$` → 「请输入 11 位手机号」. This applies to a new address, or to an edit where a phone was typed.
  3. Trimmed address shorter than 6 characters → 「请填写完整的详细地址」.
- **Save effect.**
  - The phone is stored masked (`139****5678`) and the raw number is thrown away. Leaving the phone blank on an edit keeps the old one.
  - A new record gets id `VT.store.uid('a')` and is appended at the end.
  - If the switch is on, or this is the only address, it becomes the only default and `checkout.address` is set to its id. Otherwise it is stored as non-default; if no default then exists, the first address becomes the default.
  - The sheet closes, the list refreshes, and the toast 「地址已添加」 or 「地址已更新」 (✓) shows.
- **Delete dialog.** 「删除这个地址？」 with no body text. Buttons 「取消」 / 「删除」.

**Data.**
- Reads `addresses` through `VT.store.h.addresses(s)`. When the stored list is empty, this falls back to the `data.js` `addresses` seed.
- Writes `addresses[]` items `{ id, name, phone (masked), addr, tag, isDefault }`, and writes `checkout.address`.
- Seed: a1 「公司」 (default) and a2 「家」, both 「李女士」.
- **How checkout uses it:**
  - The 收货地址 row shows `h.address(s, checkout.address)`: the selected address, else the default, else the first.
  - The 「选择收货地址」 sheet lists the same book, with each tag as a badge (or 「地址」 if there is none). Picking an address sets only `checkout.address`; it is persisted but the default does not change.
  - 「管理收货地址」 closes that sheet and **pushes** this screen onto the checkout's tab stack.
- Orders store only the address id (`08-checkout.js:241`). Editing or deleting an address later changes what old orders show in 订单信息; a deleted address falls back to the default.

**States & edge cases.**
- **The empty state can never be shown.** Deleting the last address empties the store, but the screen then shows the two seed addresses again. They are not stored, so 设为默认 on them only sets `checkout.address` and 删除 only shows its toast. The next 保存 re-inserts both seeds plus the new address (`11-account.js:100`).
- Turning 设为默认地址 off on the current default does nothing if that address is first in the list, because the first address is made default again (L104–106).
- Only masked phone numbers exist **[demo]**.

**Components used.** `VT.ui.subHead`, `.set-card.ad-card`, `.set-tag` / `.set-tag--dark`, `.radio`, `.co-link`, `.ol-empty`, `.sub-foot`, `app.sheet`, `.field` / `.field-row` / `.field-label`, `.chip` in `.ad-tags`, an inline `.switch` (not `toggleRow`), `.sheet-note`, `app.dialog`, `VT.store.uid`.

**Acceptance checks.** `我的 → 收货地址`, `收货地址 → back → 我的`, `address added`. Related: `checkout address sheet lists address book`.


### 18. 支付方式 · `payments`

**Route** `/me/payments` · **Type** secondary · **Prototype** `js/screens/11-account.js` (L159–186), `css/screens/11-account.css` · **Design ref** none

**Purpose.** Choose the default payment method and set password-free small payments.

**Layout (top → bottom).**
- Header 「支付方式」 (fixed).
- Scroll (`data-keep-scroll="pm"`):
  - Section title 「默认支付方式」.
  - A card that is a radiogroup with 3 rows: the `data.js` `payments` that have a logo, which are 「支付宝」, 「微信支付」 and 「银联支付」. Each row shows the logo, the name, a sub-line and a radio. Sub-lines **[demo]**: 「已绑定 · 138****8888」 for 支付宝 and 微信; 「招商银行储蓄卡（尾号 6688）」 for 银联.
  - Note 「结算时默认选中，可在下单时临时更换」.
  - Card with the switch 「小额免密支付」, sub 「单笔 ¥300 以内无需输入密码（演示）」 (`prefs.quickPay`).
  - Ghost full-width 「添加银行卡」 with a card icon (inside the scroll).

**Interactions.**
- Row → `checkout.payment = id`, refresh, toast 「已设为默认支付方式」. This also fires when the row is already selected.
- Switch → flips `prefs.quickPay`.
- 「添加银行卡」 → toast 「演示版不绑定真实银行卡」 **[demo]**.

**Overlays.** None.

**Data.**
- Reads `data.js` `payments` filtered by `logo`, `checkout.payment` (default `alipay`) and `prefs.quickPay` (default false).
- Writes `checkout.payment` and `prefs.quickPay`.
- `checkout.payment` is the **same field** that checkout's payment radio writes. Nothing reads `prefs.quickPay`; the mock cashier always asks for confirmation.

**States & edge cases.**
- If checkout chose 「使用新银行卡支付」 (`card`), no row is selected here.
- Changing the method at checkout also changes this "default", which contradicts the note.

**Components used.** `VT.ui.subHead`, `.set-group` / `.set-h` / `.set-card`, `.set-row.pm-row`, `.pm-logo`, `.radio`, `.set-note`, `VT.ui.toggleRow`, `.btn--ghost.btn--lg.btn--block`.

**Acceptance checks.** `我的 → 支付方式`, `支付方式 → back → 我的`.


### 19. 消息通知 · `notifications`

**Route** `/me/notifications` (also `/me/settings/notifications`) · **Type** secondary · **Prototype** `js/screens/11-account.js` (L188–207) · **Design ref** none

**Purpose.** Notification preferences. They are only stored. Not to be confused with the 「消息通知」 row on 商家消息, which opens the notices sheet.

**Layout (top → bottom).**
- Header 「消息通知」 (fixed).
- Scroll (`data-keep-scroll="nt"`). Group 「推送通知」, five switches (label · sub · store key · default):
  - 「订单与物流」 · 「发货、派送、签收与售后进度」 · `notify.order` · on
  - 「降价与到货提醒」 · 「收藏的单品降价或补货时提醒我」 · `notify.price` · on
  - 「上新推荐」 · 「关注品牌的新品与穿搭灵感」 · `notify.newin` · off
  - 「AI 造型师建议」 · 「根据天气与日程推荐每日穿搭」 · `notify.stylist` · on
  - 「系统通知」 · 「账户安全与版本更新」 · `notify.system` · on
- Untitled group: 「夜间免打扰」, sub 「22:00 – 08:00 不推送通知」, `notify.quiet`, default off. Note below: 「演示原型不会发送真实推送」 **[demo]**.

**Interactions.**
- Each switch flips its key (see shared notes). The switches are independent: 免打扰 does not disable the others.

**Overlays.** None.

**Data.** Reads and writes `notify.*`. No other screen reads them.

**States & edge cases.** None beyond the defaults.

**Components used.** `VT.ui.toggleRow`, the `group()` helper (`.set-group` / `.set-h` / `.set-card` / `.set-note`).

**Acceptance checks.** `我的 → 消息通知`, `消息通知 → back → 我的`.


### 20. 设置 · `settings`

**Route** `/me/settings` (from the gear icon 「设置」 in 我的's header, or from the 「设置」 row) · **Type** secondary · **Prototype** `js/screens/11-account.js` (L250–327); login sheet `VT.login` in `js/screens/01-onboarding.js` · **Design ref** none

**Purpose.** Links to account screens, general preferences, demo tools, the about sheet, and login / logout.

**Layout (top → bottom).**
- Header 「设置」 (fixed).
- Scroll (`data-keep-scroll="st"`):
  - 「账号」: 「个人资料」, 「隐私与安全」, 「消息通知」, 「收货地址」 (icons person / shield / bell / pin).
  - 「通用」:
    - 「语言」, value 「简体中文」.
    - 「尺码标准」, value = `prefs.sizeStd`.
    - 「清除缓存」, value = cache size.
  - 「原型演示」 **[demo]**:
    - 「重新体验首次启动」, sub 「回到启动页和数字分身创建」.
    - 「重置演示数据」, sub 「衣橱、收藏、订单与照片恢复初始状态」.
  - 「关于」: 「关于全新的购物体验」, value 「原型 v2.0」 **[demo]**.
  - A full-width text button: 「登录 / 注册」 when `loggedIn` is false, 「退出登录」 when it is true. Its class `.set-logout` has no CSS rule, so it renders transparent with ink text.

**Interactions.**
- 账号 rows → **push** `editprofile` / `privacy` / `notifications` / `addresses`, giving `/me/settings/profile|privacy|notifications|addresses`.
- 「语言」 → toast 「演示版仅支持简体中文」 **[demo]**.
- 「尺码标准」 → sheet. Picking an option closes the sheet and updates the row value. No toast.
- 「清除缓存」 → dialog. On confirm: toast 「缓存已清除」 (✓). Nothing is actually cleared and the value stays the same **[demo]**. The value is computed as `(localStorage['vt-prototype-state-v1'].length / 1024 / 1024 * 2).toFixed(1) + ' MB'`, or 「0.0 MB」 if storage cannot be read.
- 「重新体验首次启动」 → dialog. On confirm: switch back to 本人 if another avatar is active, `setupDone = false`, then `app.launch()`. That closes overlays, **wipes every tab's history** and shows 启动页 `/welcome` with no animation. Wardrobe, orders, favourites and the avatar are kept.
- 「重置演示数据」 → dialog. On confirm: `VT.store.reset()`. Every field returns to its default and the localStorage key is removed; this includes `setupDone`, `loggedIn`, profile, addresses and all switches. Then `app.launch()` shows 启动页 and the toast 「演示数据已重置」.
- 「关于全新的购物体验」 → 关于 sheet.
- 「登录 / 注册」 → login sheet. After a successful login, settings re-renders **500 ms** later and the button now reads 「退出登录」. There is no navigation, and the avatar status is not changed (unlike 登录 on 启动页).
- 「退出登录」 → dialog. On confirm: `loggedIn = false`, refresh, toast 「已退出登录」.

**Overlays.**
- **Sheet 「尺码标准」.** Radio list 「中国码」「国际码（S / M / L）」「欧码（EU）」 with the current one highlighted. Note: 「商品详情与尺码指南会优先显示所选标准（演示）」.
- **Dialog 「清除缓存？」.** Text 「清除图片与页面缓存，不会影响你的衣橱、订单和收藏。」. Buttons 「取消」 / 「清除」.
- **Dialog 「重新体验首次启动？」.** Text 「将回到启动页，你的衣橱、订单和收藏会保留。」. Buttons 「取消」 / 「开始」.
- **Dialog 「重置演示数据？」.** Text 「衣橱新增、收藏、订单、聊天与上传的照片」 + line break + 「将恢复为初始演示状态。」. Buttons 「取消」 / 「重置」.
- **Sheet 「关于」.** Lead 「全新的购物体验 · 虚拟试衣 · 个人衣橱 · 智能购物」. Key-value list: 「版本」 → 「交互原型 v2.0」; 「说明」 → 「数字分身生成、AI 造型师、支付与物流为演示模拟；照片上传与摄像头预览使用真实浏览器能力。」 **[demo]**. No buttons.
- **Sheet 「登录」** (shared with 启动页):
  - Lead 「登录后可同步你的数字分身、衣橱与订单。」.
  - 「手机号」 field with prefix 「+86」, placeholder 「请输入手机号」, prefilled 「13800138888」.
  - 「验证码」 field, placeholder 「6 位验证码」, maxlength 6, with a 「获取验证码」 button. Tapping it fills 「246810」, shows the toast 「演示验证码已自动填入」, and disables the button while it counts down once per second from 「59s 后重发」. At 0 it is enabled again and reads 「重新获取」.
  - 「登录」 → **no validation**, `loggedIn = true`, the sheet closes, toast 「登录成功（演示账号）」 (✓).
  - Note 「演示原型：不会发送短信，也不会创建真实账号。」 **[demo]**.
- **Dialog 「退出登录？」.** Text 「演示数据会保留在本机。」. Buttons 「取消」 / 「退出」.

**Data.**
- Reads `prefs.sizeStd` (default 「中国码」), `loggedIn` (default false) and the size of localStorage.
- Writes `prefs.sizeStd`, `setupDone` and `loggedIn`, or resets everything.
- No screen reads `prefs.sizeStd`, so the sheet note's promise is not implemented.

**States & edge cases.**
- By default the user is logged out, yet 我的资料 shows 「已绑定」 and 隐私与安全 shows 「登录密码 已设置」.
- After 重新体验首次启动 with an avatar that is already `ready`, 启动页 「开始体验」 goes straight to 首页. Avatar creation is skipped, despite the sub-label.
- The reset dialog does not mention that the app returns to 启动页.

**Components used.** `VT.ui.row` (`act: 'nav'` + `data-to`; `act: 'toast'` + `data-msg`), `group()`, `app.sheet` + `.opt-list` / `.opt` / `.radio`, `.sheet-note`, `.sheet-lead`, `.kv`, `app.dialog`, `VT.login`, `VT.store.reset`, `app.launch`.

**Acceptance checks.** `我的 → 设置`, `设置 → back → 我的`.


### 21. 隐私与安全 · `privacy`

**Route** `/me/settings/privacy`. The only entry is 设置 → 隐私与安全 (REPORT deviation 7). · **Type** secondary · **Prototype** `js/screens/11-account.js` (L209–248) · **Design ref** none

**Purpose.** Shows account security info, holds the privacy switches, and offers local data actions.

**Layout (top → bottom).**
- Header 「隐私与安全」 (fixed).
- Scroll (`data-keep-scroll="pv"`):
  - 「账号安全」:
    - 「登录手机号」 (phone icon): value is the masked phone; static row with no chevron.
    - 「登录密码」 (lock icon): value 「已设置」.
  - 「隐私」:
    - Switch 「个性化推荐」, sub 「根据浏览与试穿记录推荐单品」 (`privacy.personalized`, on).
    - Switch 「允许 AI 造型师读取衣橱」, sub 「用你已有的衣服生成搭配建议」 (`privacy.wardrobeAI`, on).
    - Static row 「照片仅保存在本机」 (shield icon), sub 「演示原型不会上传任何照片」, value 「已开启」 **[demo]**.
  - 「我的数据」:
    - 「清除已上传的照片」 (image icon), sub 「数字分身照片、头像与凭证照片」.
    - 「导出我的数据」 (download icon).
    - 「注销账号」 (logout icon).

**Interactions.**
- 「登录密码」 → toast 「演示版暂不支持修改密码」 **[demo]**.
- The two switches flip `privacy.*`.
- 「清除已上传的照片」 → dialog. On confirm, it sets `avatar.fullbody`, `avatar.portrait` (of every digital avatar) and `profile.photo` to `null` and empties every `returns[oid].photos`. Toast 「已清除本机照片」 (✓). `avatar.status` does not change. Wardrobe garment uploads are not touched. This screen does not re-render (nothing on it changes).
- 「导出我的数据」 → toast 「演示版暂不支持导出数据」 **[demo]**.
- 「注销账号」 → info dialog only; nothing changes **[demo]**.

**Overlays.**
- Dialog 「清除已上传的照片？」. Text: 「将删除本机保存的全身照、生活照、头像和售后凭证照片。」 + line break + 「数字分身会使用示例形象。」. Buttons 「取消」 / 「清除」.
- Dialog 「注销账号」. Text: 「演示原型不会注销真实账号。」 + line break + 「如需清空演示数据，请使用「设置 → 重置演示数据」。」. One button 「知道了」 **[demo]**.

**Data.**
- Reads `profile.phone`, `privacy.personalized` and `privacy.wardrobeAI`.
- Writes those switches and the cleared photo fields. Nothing else reads `privacy.*`.

**States & edge cases.**
- After clearing photos: 我的形象 tiles show 「示例」, and 我的 / 我的资料 fall back to the demo portrait.

**Components used.** `VT.ui.row` (including `act: 'toast'` + `data-msg`), `VT.ui.toggleRow`, `group()`, `app.dialog`.

**Acceptance checks.** None.


### 22. 帮助与客服 · `help`

**Route** `/me/help` (also `/me/orders/o/:oid/help` via 订单详情 → 帮助与客服) · **Type** secondary · **Prototype** `js/screens/11-account.js` (L329–370); chat in `js/screens/09-orders.js` `openChat` (L390–426); `.faq*` styles in `css/screens/09-orders.css` · **Design ref** none

**Purpose.** FAQ, a scripted support chat, and a feedback form.

**Layout (top → bottom).**
- Header 「帮助与客服」 (fixed).
- Scroll (`data-keep-scroll="hp"`):
  - 「常见问题」: a card of 5 collapsible items from `data.js` `faqs`. Each item is a question button with a chevron; its answer starts hidden.
  - Untitled group:
    - 「联系在线客服」 (headset icon), sub 「9:00 – 22:00 · 平均 1 分钟回复」.
    - 「意见反馈」 (edit icon), sub 「告诉我们你的建议」.

**Interactions.**
- Question → toggles its answer (`hidden`, `aria-expanded`; the chevron rotates). Items are independent, so several can be open at once. Open state is not remembered: any re-render collapses all.
- 「联系在线客服」 → support chat sheet.
- 「意见反馈」 → feedback sheet.

**Overlays.**
- **Full-height sheet 「在线客服 · 小衣」.**
  - First bubble: 「您好，我是小衣，请问有什么可以帮您？」.
  - Quick chips: 「怎么修改收货地址？」「数字分身怎么重新生成？」「如何开发票？」.
  - Input with placeholder 「输入消息…」 (Enter sends) and a 「发送」 button.
  - Note 「演示对话，回复为预设内容」 **[demo]**.
  - Each message adds a user bubble, and a reply arrives **800 ms** later. Replies are the scripted answers in `openChat`'s `answers` map; any other text gets the generic line (09-orders.js:421) **[demo]**.
  - Empty input is ignored. The thread auto-scrolls to the bottom. Nothing is kept: each opening starts fresh.
- **Sheet 「意见反馈」.**
  - Textarea, maxlength 200, placeholder 「请描述你的问题或建议」.
  - 「提交」 button, then the note 「演示原型：反馈不会被发送」 **[demo]**.
  - Empty or blank text → toast 「请先写下你的反馈」. Otherwise the sheet closes and the toast 「感谢反馈！」 (✓) shows. Nothing is stored.

**Data.** Reads `data.js` `faqs` (5 `[question, answer]` pairs). Writes nothing.

**States & edge cases.** The chat and feedback are scripted or no-ops **[demo]**.

**Components used.** `.faq` / `.faq-i` / `.faq-q` / `.faq-a`, `VT.ui.row`, `group()`, `VT.openChat` (`app.sheet({ full: true })`, `.mchat`, `.or-quick` chips, `.mchat-input`), `textarea.field-area`.

**Acceptance checks.** `我的 → 帮助与客服`, `帮助与客服 → back → 我的`.


### 23. 我的收藏 · `favorites`

**Route** `/me/favorites` · **Type** secondary · **Prototype** `js/screens/13-collections.js`, `css/screens/11-account.css` (「我的收藏」 block; `.ol-empty` comes from `css/screens/09-orders.css`) · **Design ref** none

**Purpose.** Lists the products the user hearted (单品) and the AI-stylist looks they saved (造型).

**Layout (top → bottom).**
- Sub-header (fixed): back button and title 「我的收藏」.
- Segmented control (fixed, full width, `role=tablist` aria 「收藏分类」): 「单品 N」 · 「造型 N」, with live counts.
- Scroll area (`.sub-scroll`):
  - 单品: cards in 2 columns, each with the image (`img.card`; small products are contained with padding), a filled heart top-right, the `cardName` and the price. The whole card is a button (aria 「查看 <name>，¥<price>」).
  - 造型: a list of cards, each with the look image, 「Look N」, the sub line and a small dark 「去试衣间试穿」 button.
- No tab bar.

**Interactions.**
- Segment → switches the list. The choice lives in a module variable (default 单品): it is remembered while the app runs, even after leaving and reopening the screen, but not persisted.
- Product card → pushes `product` `{pid}` onto the 我的 stack → `/me/favorites/p/:pid`.
- Heart → this screen's own `fav` action, which overrides the global one. It flips `s.favorites[pid]` and re-renders, so the card disappears at once, with the toast 「已取消收藏」. There is no undo.
- 「去试衣间试穿」 → `VT.tryOn(look items)`, a contextual jump to 首页; the 我的 stack stays on 我的收藏.
- Look cards have no other action: they cannot be opened or unsaved here (unsave in AI 造型师).
- Back → 我的. Arrives from: 我的 → stats 「我的收藏」 (push).

**Overlays.** None.

**Data.**
- Reads: `s.favorites` (`{pid: bool}`), `s.savedLooks`, `data.byId`, `data.lookById`. Writes: `s.favorites`.
- 单品 order is first-favourited first: the seed `data.seedFavorites` comes first, then new favourites. Unfavouriting sets `false` instead of deleting the key, so a re-favourited product goes back to its old place.
- 造型 order: newest saved first.
- Seed: 8 products and 0 looks. Scroll kept: `fv`.

**States & edge cases.**
- 单品 empty: a heart icon, 「还没有收藏的单品」 and the ghost button 「去购物广场逛逛」 → contextual jump to 购物广场 `/plaza` (the 我的 stack keeps 我的收藏).
- 造型 empty: a sparkle icon, 「在 AI 造型师里点 ♡ 保存造型」 and the ghost button 「去问问 AI 造型师」 → contextual jump to `/stylist`.
- Hearts on 购物广场 and 商品详情 feed this list; hearts in 个人衣橱 do not.
- The 我的 count is `favCount` = hearted products + saved looks.

**Components used.** `VT.ui.subHead`, `.seg`, `VT.ui.heart`, `VT.ui.price`, `VT.ui.img`, `.btn--dark .btn--sm`, `.btn--ghost`, `.ol-empty`, `.sub-scroll`, global `nav` action, `VT.tryOn`, `app.toast`.

**Acceptance checks.** `我的收藏 lists favourites`


### 24. 浏览记录 · `history`

**Route** `/me/history` · **Type** secondary · **Prototype** `js/screens/13-collections.js`, `css/screens/11-account.css` (「浏览记录」 block; `.ol-empty` comes from `css/screens/09-orders.css`) · **Design ref** none

**Purpose.** Shows recently viewed products, grouped by day, and lets the user clear them.

**Layout (top → bottom).**
- Sub-header (fixed): back button and 「浏览记录」, with the text button 「清空」 on the right when there are records.
- Scroll area: one group per day label, with a heading such as 「今天」「昨天」「7月14日」 and a card of rows. Each row shows a thumbnail (`img.card`), the name, the tags and the price.
- No tab bar.

**Interactions.**
- Row → pushes `product` `{pid}` → `/me/history/p/:pid`. Opening a product records a view, so after going back that product is at the top under 「今天」.
- 「清空」 → dialog 「清空浏览记录？」 (no body text) with 「取消」/「清空」. Confirm empties `s.history` and shows the toast 「浏览记录已清空」.
- Back → 我的. Arrives from: 我的 → stats 「浏览记录」 (push).

**Overlays.** The clear dialog above. It closes with its buttons or Esc; tapping the scrim does nothing.

**Data.**
- Reads: `s.history` (`[{p, t}]`, newest first) and `data.byId`; unknown products are skipped. Writes: `s.history = []` on clear.
- 商品详情 writes a record every time it opens (`VT.store.h.viewed`, `store.js:128`): it adds `{p, t:'今天 HH:MM'}` at the front, removes older entries for the same product and keeps 30.
- Groups use the first word of `t`, in list order. The time part is never shown.
- Seed `data.seedHistory`: 6 entries (今天 ×2, 昨天 ×2, 7月14日 ×2). Scroll kept: `hs`. 我的 shows `history.length`.

**States & edge cases.**
- Empty: a history icon, 「暂无浏览记录」 and the ghost button 「去购物广场逛逛」 → contextual jump to `/plaza`. 「清空」 is hidden.
- Day labels are stored text, not dates, so a view saved as 「今天」 still reads 「今天」 on later days (`store.js:130`). Suggested fix: the web build stores a timestamp and formats 今天 / 昨天 / M月D日 when rendering (to confirm).

**Components used.** `VT.ui.subHead` with its right action `.sub-act`, `.set-group`, `.set-h`, `.set-card`, `.set-main`/`.set-label`/`.set-sub`, `VT.ui.price`, `VT.ui.img`, `.ol-empty`, global `nav` action, `app.dialog`, `app.toast`.

**Acceptance checks.** `浏览记录 includes viewed products`

