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
| 2 | 上传照片 / 视频 · 创建数字分身 | `avatar` | `/welcome/avatar` |
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
| 25 | 搭配集详情 | `outfit` | `/wardrobe/sets/:id` (proposed, HANDOFF §13.1 #20) |
| 26 | 穿搭瞬间 | `moment` | `/wardrobe/moments/:id` (proposed, HANDOFF §13.1 #20) |
| 27 | 商家店铺 | `store` | `/plaza/s/:sid` (proposed, HANDOFF §13.1 #20) |

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
- `app.enterMain()` (app.js:114-121): sets `setupDone = true`, closes all overlays, **clears every stack, including the launch flow**, and shows 首页 `/home` with a fade. Use a replace navigation so browser back can't return to `/welcome`.

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
- At app start, `app.launch()` (app.js:105-111) opens 首页 if `setupDone`, otherwise 启动页. This screen therefore appears only on first launch, after 设置 → 「重新体验首次启动」 (sets `setupDone = false` and keeps all data), or after 「重置演示数据」.
- After 「重新体验首次启动」 the avatar is usually still `'ready'`, so 「开始体验」 skips avatar creation and goes straight to 首页. `'none'` and `'stale'` go to the upload screen.
- Being logged in changes nothing on this screen: 「登录」 always opens the sheet. Only 设置 reads `loggedIn` (to show 登录 / 注册 or 退出登录).

**Components used.** `VT.ui.img`, `VT.icon`, `.btn--dark.btn--xl` + `.btn-arrow`, `.btn--outline`. Sheet: `app.sheet`, `.sheet-lead`, `.field` / `.field-row` / `.field-prefix` / `.field-btn`, `.btn--lg.btn--block`, `.sheet-note`. Also `app.toast`, `app.later`, `app.enterMain`.

**Acceptance checks.** `启动页 reachable as a flow screen` (simulator entry) · `开始体验 → avatar creation` · `first launch (no setup) opens 启动页` · `mobile: full-screen app, first launch`.


### 2. 上传照片 / 视频 · 创建数字分身 · `avatar`

**Route** `/welcome/avatar` (first launch, `params.from = 'launch'`) · `/me/avatar/upload` (from 我的形象, `params.from = 'profile'`) · `/home/avatars/new?name=…` (切换角色 → 新建数字分身, `params.ctx = 'new'`; proposed, HANDOFF §13.1 #13; pushed on 个人衣橱's stack when started there) · **Type** launch (first launch) | secondary (from 我的形象 or 切换角色) · **Prototype** `js/screens/02-avatar.js`, `css/screens/02-avatar.css`, `js/media.js` · **Design ref** `reference/design/screens/02_avatar_onboarding_v2.webp` (the five-screen mockup; the brief's rules win where they differ, see the end of this section)

**Purpose.** A guided flow that turns photos or a short video into a digital avatar: for the user's own avatar (本人), or, in the `new` context, for another person's (HANDOFF §9.15). The user picks a method, uploads five photos or a video of about 10 s, reviews the materials and the checks, then runs the generation, which is simulated in the demo. One route with six steps: **选择上传方式 → 照片上传 | 视频上传 → 智能检测与确认 → 生成建模 → 创建完成**. The steps change in place (no push), and each step's heading takes focus.

**Honesty rules (from the brief, built into the prototype).**
- A check shows 通过 or 需要重新上传 only if the browser really measured it (format, size, resolution, orientation, brightness, sharpness, duplicates, video length). Body, face, background, angle and stability recognition need an AI service and show 「无法检测」 with the reason.
- With job status only (the demo), generation shows stages and an indeterminate ring, never a percentage or a time estimate.
- The result is labelled a 2D preview, never a 3D model.
- Photos and video frames stay on the device (IndexedDB), never in `localStorage`. Nothing is uploaded before consent, and the third-party AI provider is disclosed. Every demo shortcut says 「演示」.

**Layout, common to every step.**
- Fake status bar (dark). Drop it in the web build.
- Header (`.av-bar`, 82 px): a back button (aria 「返回」), except on 创建完成. A centred title: 「照片上传」 · 「视频上传」 · 「智能检测与确认」 · 「生成建模」 · 「创建完成」 (none on 选择上传方式, which has its own h1). A 「跳过」 pill **on first launch only**, hidden on 生成建模 and 创建完成.
- Four-step progress (aria 「创建进度」): 「上传素材」 → 「智能检测」 → 「生成建模」 → 「完成」. Finished steps show ✓, and the current one has `aria-current="step"`. 选择上传方式, 照片上传 and 视频上传 are step 1.
- Scroll area (`data-keep-scroll="av-{step}"`), then the bottom action area. It has a solid background with an 18 px fade above it, an optional hint line (`aria-live="polite"`) and the step's buttons.

**Step 选择上传方式.**
- h1 on two lines, 「上传照片 / 视频，」 / 「创建数字分身」. Lead: 「上传清晰的照片或视频，生成专属于你的数字分身，」 / 「体验全新的虚拟试衣方式。」. In the `new` context: 「上传「{name}」清晰的照片或视频，」 / 「为 TA 生成专属的数字分身，体验全新的虚拟试衣。」.
- Two method cards (buttons) with an icon tile, a title, a line and a caption, a preview on the right and a chevron:
  - 「照片上传」 · 「上传 4 张全身照 + 1 张清晰面部生活照」 · 「展示你的身材、体型和面部特征，生成更精准的数字分身」. Preview `avatar-onboarding/method/photo.webp`.
  - 「视频上传」 · 「上传或拍摄 10 秒全身展示视频」 · 「按照示范动作拍摄，全方位展示你的身材与气质，效果更真实自然」. Preview: three turn frames with a play glyph.
- Note (shield icon): 「照片和视频只保存在本机，仅用于生成数字分身」.
- Action: 「开始上传」 (→ icon), which works like the 照片上传 card.
- A card or 开始上传 → the consent sheet if consent isn't stored yet, then 照片上传 or 视频上传.

**Consent sheet** (`withConsent`; once, before the first photo or video). Title 「上传前请确认」. Lead: 「人脸和身材照片属于敏感个人信息。上传前，请了解我们如何使用它们：」. Three items:
- 「用途」 「照片和视频仅用于生成你的数字分身和虚拟试衣效果」
- 「存储」 「演示版只保存在本设备，不会上传到任何服务器；可随时在「我的形象」或「隐私与安全」中删除」
- 「第三方处理」 「正式版将由第三方 AI 建模服务处理（服务商以正式协议为准），传输前会再次征得你的同意」

Then a checkbox, 「我已阅读并同意《敏感个人信息处理规则》」, and the buttons 「不同意」 and 「同意并继续」. 同意并继续 stays disabled until the box is ticked.
- 同意并继续 stores `mediaConsent = { v: 1, at }` and continues to the chosen method.
- Closing without agreeing (不同意, ✕, scrim, Esc) shows the toast 「需要你的同意才能上传照片或视频」, and the step stays 选择上传方式.

**Step 照片上传.**
- Lead: 「请上传 5 张照片，确保展示完整的身材和面部特征」 / 「建议在光线充足、背景简洁的环境下拍摄。」.
- 「拍摄建议」 card, one line each with an icon: 「保持自然站立，展示完整身体」 · 「身体与面部清晰，避免过度修图」 · 「使用均匀光线，避免逆光」 · 「穿着相对合身、能看清身体轮廓的普通服装」 · 「保持背景简洁」 · 「确保照片中只有目标人物」.
- Five slots on a 6-column grid: ①「正面全身」 ②「背面全身」 ③「左侧全身」 (a third each, 164 px frames), then ④「右侧全身」 ⑤「面部生活照」 (a half each, 196 px frames). Each slot has a numbered label and a frame:
  - **Empty:** the example photo (`avatar-onboarding/ref/<slot>.webp`, faded), the tag 「示例」 and a round ＋. The ＋ is a `<label>` around `<input type="file" accept="image/*">`, aria 「上传{label}」. On phones the native picker offers the camera.
  - **Checking:** a dark overlay with a spinner and 「检测中…」.
  - **Uploaded:** the photo, with a pill: 「通过」 (green) or 「需重拍」 (red). A failed slot also gets a red outline and its first problem under the frame. Two round buttons: ↻, a `<label>` with the file input (aria 「重新选择{label}」), and 🗑 (aria 「删除{label}」), which deletes the photo and toasts 「已删除{label}」.
  - **Demo sample:** the example photo with the tag 「示例照片」.
- Count row: 「已上传 {n}/5」, plus 「 · {k} 张需要重新上传」 (red) when photos fail, and the pill 「演示：使用示例照片」 **[demo]**. The pill fills all five slots with samples and toasts 「已填入示例素材（演示），不会用到你的照片」.
- 「正确示范」 (green; 「符合以下要求，建模效果更好」): six examples, scrolling sideways: 头脚完整 · 自然站立 · 面部清晰 · 光线充足 · 背景简洁 · 单人入镜.
- 「错误示范」 (red; 「请避免以下常见问题」): seven examples: 身体被裁剪 · 画面模糊 · 面部遮挡 · 滤镜过重 · 多人入镜 · 过暗或过曝 · 背景杂乱. Images `avatar-onboarding/wrong/*.webp`; `heavy_filter.webp` was made from the kit's face portrait.
- Bottom: a hint, 「正在检测照片…」, 「请重新上传标记「需重拍」的照片」 or 「还差 {n} 张照片」, then 「下一步」 (→). 下一步 stays disabled until all five slots show 通过.
- **A chosen photo** (`takePhoto`, HANDOFF §9.16):
  1. If its type doesn't start with `image/` → toast 「请选择图片文件（JPG / PNG / HEIC 等）」.
  2. Over 25 MB → toast 「图片超过 25MB，请换一张」.
  3. The browser decodes it, so HEIC works only where the browser can decode it. If decoding fails → toast 「无法读取这张图片，请换一张试试」, and the slot keeps its previous photo.
  4. The photo is measured, downscaled (longest side ≤ 900 px, JPEG 0.82) and stored as a Blob in IndexedDB. A replaced photo's blob is deleted.
  5. The checks run in this order, and the slot shows the first problem:
     - 「分辨率太低，请上传更清晰的原图」
     - 「全身照请竖拍，让头到脚都在画面中」 (full-body slots only)
     - 「光线过暗，请在明亮、均匀的光线下拍摄」 or 「画面过曝，请避开强光直射」
     - 「画面模糊，请对焦后重新拍摄」
     - 「与「{label}」是同一张照片，请换一张」 (always the later slot)

**Step 视频上传.**
- Lead: 「上传或拍摄一段 10 秒的全身展示视频，」 / 「帮助系统获取多角度身体信息。」.
- Upload box: a video icon, 「上传视频 / 开始拍摄」 and 「支持 MP4、MOV，时长约 10 秒，不超过 200MB」. Two buttons:
  - 「上传视频」: a `<label>` with `<input type="file" accept="video/*">`.
  - 「开始拍摄」: opens the recorder. Where `MediaRecorder` or `getUserMedia` is missing: on a touch device it opens the system camera (`<input accept="video/*" capture="user">`); elsewhere the button is disabled, with the note 「当前浏览器不支持直接录制，请使用「上传视频」」 (the toast says the same).
- While a video is being checked: 「正在检测视频…」 「读取时长并截取画面」.
- Video card:
  - The first frame with a play button (aria 「播放已上传的视频」), which opens the sheet 「视频预览」 (a `<video controls>`, 「视频只保存在本机内存中，用于本次创建」).
  - The file name, 「时长 {s} 秒 · {w}×{h}」, the chip 「通过」 or 「需要重新上传」, and the first problem.
  - Links: 「重新拍摄」, 「更换视频」 and 「删除」.
- Demo sample **[demo]** (「演示：使用示例素材」): 「示例素材（无实际视频）」, 「演示：4 张示范截帧」, chip 「示例素材」.
- 「请按以下顺序完成动作，保持全身在画面中」: four frames, each lit in turn (4.8 s loop; static with reduced motion):
  - ①「正面站立」「面向镜头自然站立」
  - ②「缓慢转身」「展示左右两侧」
  - ③「展示背面」「背对镜头稍作停留」
  - ④「完成一圈」「转回正面结束」
- 「视频拍摄要求」: eight icons: 时长约 10 秒 · 全身入镜 · 镜头稳定 · 单人入镜 · 光线明亮均匀 · 背景简洁 · 姿态自然 · 衣物不宜过松.
- 「错误示范」: 身体被裁剪 · 画面模糊 · 多人入镜 · 过暗或过曝.
- Bottom: a hint, 「请上传或拍摄一段视频」, 「正在检测视频…」 or 「请重新上传或拍摄视频」, then 「下一步」. 下一步 stays disabled until the video shows 通过.
- **A chosen video** (`takeVideo`, HANDOFF §9.16):
  - Errors and their toasts:
    - type isn't `video/*` → 「请选择视频文件（MP4 / MOV 等）」
    - over 200 MB → 「视频超过 200MB，请缩短或压缩后再上传」
    - can't be decoded → 「无法读取这段视频，请上传 MP4 或 MOV 格式」
    - anything else → 「视频检测失败，请重试」
  - The length comes from the file. WebM recordings report an infinite duration, so their length is read by seeking to the end, with the recorder's clock as the fallback.
  - Four frames at 10 / 36 / 62 / 88 % are kept: ≤ 480 px, JPEG 0.82, in IndexedDB.
  - The video itself stays in memory (an object URL) for this visit only.
  - Problems:
    - 「无法读取视频时长，请换一段视频」
    - 「视频只有 {s} 秒，请拍摄约 10 秒」 (< 6 s)
    - 「视频有 {n} 秒，请控制在 10 秒左右」 (> 20 s)
    - 「视频分辨率太低，请用更高清晰度拍摄」 (short side < 360)
    - 「画面过暗，请在明亮、均匀的光线下拍摄」
    - 「画面模糊，请保持镜头稳定并对焦」

**Recorder layer** (开始拍摄; `app.layer`, cls `cam av-rec`, aria 「拍摄展示视频」).
- Layout:
  - The camera preview (the front camera is mirrored) with a dashed body frame.
  - Top: ✕ (aria 「关闭拍摄」), a timer 「00:00 / 00:10」 with a red dot, and a camera flip (aria 「切换前后摄像头」).
  - Panel states: 「正在打开摄像头…」, or an error with the camera texts (HANDOFF §9.10) and the buttons 「重试」 and 「返回上传视频」.
  - Bottom: the four steps as pills, the tip 「站到能拍到全身的位置，点击开始后有 3 秒准备」, and a record button (aria 「开始录制」, then 「停止录制」).
- Recording:
  - A tap starts a 3-2-1 countdown (1 with reduced motion), then records MP4 if supported, otherwise WebM.
  - The lit step moves every 2.5 s and the tip follows it.
  - Recording stops at 10 s or on a tap. The layer closes, and the video is checked like an upload (named 「录制视频.mp4」 or 「录制视频.webm」).
  - Closing during a recording discards it and releases the camera.

**Step 智能检测与确认.**
- 「已上传的素材」 / 「请确认以下素材是否正确，或重新上传。」.
- Materials card:
  - Photos: 「照片（5/5）」, five thumbnails with their labels and ✎ (aria 「更换{label}」). ✎ goes back to 照片上传 and scrolls to that slot, which flashes and takes focus.
  - Video: 「视频（1/1）」, the four frames, a play button (aria 「播放视频」) that opens 视频预览, and ✎ 「更换视频」.
- 「素材检测结果」, with the note 「已在本机完成基础检测；人体、面部与背景识别需接入 AI 服务」. Each row has an icon, a title, a line saying how it was checked, and a status. Rows first show 「检测中」 (spinner), then their result one by one: 300 ms, then every 260 ms, all at once with reduced motion.

| Row | Photos | Video |
|---|---|---|
| 基础检测 | 「格式、分辨率、竖拍、锐度、重复照片」 → 通过 / 需要重新上传 | 「格式、时长 {s} 秒、分辨率、画面锐度」 → 通过 / 需要重新上传 |
| 身体完整度 | 无法检测 · 「需接入 AI 识别，演示版未检测」 | same |
| 面部清晰度 | 「按面部照片的锐度检测，未做人脸识别」 → 通过 / 需要重新上传 | 无法检测 · 「需接入 AI 识别人脸，演示版未检测」 |
| 背景简洁度 | 无法检测 | 无法检测 |
| 光线质量 | 「5 张照片的亮度均在正常范围」 or 「{labels} 亮度异常」 | 「按截取画面的亮度检测」 |
| 角度完整性 | 无法检测 · 「5 个角度均已上传，实际角度需 AI 识别」 | 无法检测 · 「需 AI 确认是否转身一圈」 |
| 视频稳定性 | — | 无法检测 |

- With demo samples, every row shows 无法检测. The measured rows say 「示例照片，未检测」 or 「示例素材，未检测」.
- 「需要处理」 box, only when something failed. One line per fix, e.g. 「「左侧全身」光线过暗，请在明亮、均匀的光线下拍摄」, each with 「去重新上传」, which goes to that slot.
  - **[demo]** With `?mockFail=avatar.check`, 身体完整度 shows 需要重新上传 (「演示：模拟识别结果」). The fix is tagged 「演示」 and reads 「正面全身照缺少脚部，请重新上传一张包含头部到脚部的完整照片。」 (video: 「视频中有画面缺少脚部，请重新拍摄，让头部到脚部始终在画面中。」). It clears once 正面全身 or the video is replaced.
- 「拍摄要点」 box:
  1. 「在光线充足的环境下拍摄，避免逆光或昏暗」
  2. 「穿着相对合身的普通服装，能看清身体轮廓」
  3. 「确保背景简洁、无杂物，画面中只有一人」
- Bottom: 「重新上传」 (back to the upload step) and 「开始生成建模」 (→). 开始生成建模 is disabled while 需要处理 lists anything.

**Step 生成建模** **[demo: simulated]**.
- Heading: 「正在生成数字分身」, with the line 「我们正在根据你上传的素材，创建专属于你的数字分身。」.
- Progress ring: `role="progressbar"`, aria 「生成进度」.
  - With job status only (the demo), an arc keeps turning. The centre shows 「{n}/5」 and the stage name, and `aria-valuetext` reads 「第 n 步，共 5 步：{stage}」.
  - A percentage (`aria-valuenow`) appears only when the service reports real progress.
  - At 创建完成 the ring is full.
  - Beside the ring: the preset model (`assets/people/avatar-base.webp`) with a light that moves down it.
- 「模拟进度 · 演示版未接入建模服务」.
- Stages:
  1. 「素材解析中」 「分析上传的照片与视频」
  2. 「身体模型生成中」 「构建身体结构与比例」
  3. 「面部特征生成中」 「提取面部关键特征」
  4. 「细节优化中」 「优化肤质与服装贴合」
  5. 「创建完成」 「生成你的专属数字分身」

  Done stages show a green ✓; the current one shows ●.
- Card: 「建模完成后」 「即可进入虚拟试衣间，体验专属穿搭」.
- Bottom: 「生成中…」 (disabled).
- **Timing [demo]:** 6400 ms (1200 ms with reduced motion). Stage = ⌊elapsed / total × 4⌋ until the end, then 创建完成. The result follows 450 ms later.
- **One job at a time.** A tap while a job is running is ignored, and the step's re-render replaces the button.
- **Back while running** opens the dialog 「停止生成？」 「已上传的素材会保留，之后可以重新开始生成。」, with 「停止」 and 「继续生成」. 停止 returns to 智能检测 and toasts 「已取消生成」. Nothing is created.
- **Failure [demo]**: `?mockFail=avatar.generate`, or `localStorage['vto-mock-fail']` (comma-separated; `*` = all). The job fails at 55 %, and the step shows:
  - 「生成没有完成」 and 「你的素材已保留，可以直接重试」
  - the ring with ⚠ 「生成失败」
  - 「演示：模拟生成失败（?mockFail=avatar.generate）」 and 「服务暂时不可用，请稍后重试。重试不会重新上传素材。」
  - the stages done so far with ✓, and the failed one with ✕ (red)

  It also toasts 「生成失败，可以直接重试」. Bottom: 「返回检查」 and 「重试」. 重试 runs a new job on the same materials.

**Step 创建完成.**
- No back button. Heading: 「你的数字分身已创建！」.
- Preview: the preset model, full body, in a 176 × 330 frame, labelled 「2D 形象预览 · 演示版」.
- 「角色」 with the name, the tag 「本人」 for 本人, and 「修改名称」 (✎). 修改名称 opens the sheet 「修改名称」:
  - For 本人, the field is 「昵称（本人的名称即你的昵称）」, max 12; empty → 「昵称不能为空」.
  - For others, 「名称」, max 8; empty → 「请填写名称」.
  - 「保存」 toasts 「名称已保存」.
- 「演示原型使用预设的数字分身形象，并非三维模型；」 / 「真实产品将基于你上传的素材进行三维重建。」.
- 「重新生成」 runs 生成建模 again on the same materials. 「更换素材」 goes back to the upload step.
- Bottom, by context:
  - `launch`: 「进入虚拟试衣间」 (→) runs `enterMain()`.
  - `new`: the same label. It drops this screen from every stack, then shows 首页 and, 300 ms later, the toast 「已切换到「{name}」」.
  - `profile`: 「去首页试穿」 drops this screen and goes to 首页; 「完成」 goes back to 我的形象 with the toast 「数字分身已更新」.
- With demo samples it also toasts 「已使用示例素材生成演示分身」.

**Other interactions.**
- Back:
  - 照片上传 / 视频上传 → 选择上传方式.
  - 智能检测 → its upload step.
  - 生成建模 → the stop dialog.
  - 选择上传方式 → pop: `/welcome` on first launch, `/me/avatar` from 我的形象, or the screen that opened 新建数字分身 (nothing is created).
- 「跳过」 (first launch only) sets `avatar.status = 'ready'` and `demo = true` if not ready yet, then runs `enterMain()`. 300 ms later it toasts 「已使用示例数字分身，可在「我的 → 我的形象」中更换」 **[demo]**.

**我的形象 → 「重新生成」** (`VT.avatarGen.run`, the `hub` context). A full-screen layer (`.av-gen`, aria 「正在生成数字分身」) runs the same simulated job:
- Content: 「正在重新生成数字分身」, the same ring, stage list and 「模拟进度 …」 note, and 「取消」.
- 取消, Esc and back all cancel it and toast 「已取消生成」.
- Result:
  - 「数字分身已更新」, the 2D preview and 「演示原型使用预设的数字分身形象，并非三维模型」.
  - 「完成」 closes the layer, re-renders 我的形象 and toasts 「数字分身已更新」.
  - 「去首页试穿」 goes to 首页.

**Data.** Reads `avatar`, `mediaConsent`, the active avatar's record and the profile name. Writes:
- `mediaConsent = { v: 1, at }`
- When generation finishes, `avatar = { status: 'ready', generatedAt, demo: true, materials, fullbody, portrait }`:
  - `materials` is `{ method: 'photo', photos: { front, back, left, right, face } }`. Each photo is `{ media, name, w, h }`, or `{ src, name: '示例照片', sample: true }` for a sample.
  - Or `materials` is `{ method: 'video', video: { name, sec, sample, frames: [{ media, w, h }] } }`.
  - `fullbody` is the front photo or the first frame. `portrait` is the face photo, `null` for a video.
- Where it goes:
  - In the `new` context, `VT.store.avatars.create(name, avatar)` creates the avatar and makes it active.
  - Otherwise the data replaces the active avatar's, and its old media are deleted.
- `setupDone`, through `enterMain`.
- Media (`js/media.js`, `VT.media`):
  - Photos and frames are Blobs in IndexedDB (`vt-prototype-media` / `blobs`), referenced by key. The page reads them through object URLs.
  - At start-up, old data URLs are migrated and unreferenced blobs are deleted, so an unfinished visit's drafts go. Starting another visit also deletes the previous visit's drafts.
- Side effect: the face photo is the fallback profile picture (`VT.ui.profilePhoto`) and the 我的形象 thumbnail on 我的.

**`VT.avatarGen` = `{ run(app), readImage(file, max = 900, quality = 0.8) }`.** 首页 uses `readImage` for garment photos.

**States & edge cases.**
- A deep link without `from` behaves like first launch.
- Leaving mid-visit drops the drafts. Coming back starts at 选择上传方式, with empty slots.
- A slot that is still being checked has no ↻ or 🗑.
- Replacing a photo re-checks duplicates for every slot.
- The recorder and the camera layers stop the camera stream when they close, including during the close animation.
- Errors from a video that can't be read leave the previous video in place.
- In the `new` context nothing reaches the store until generation finishes. A second finish (重新生成) updates the avatar it created.

**Deliberate differences from the mockup** (all from the brief):
- The subtitle uses the brief's copy (no 3D claim) and the 拍摄建议 card is added.
- The video takes 10 s (the mockup says 10–15 s).
- 「AI 智能检测结果」 / 「系统已完成素材质量检测」 become 「素材检测结果」 and an honest note. Rows that can't be measured show 无法检测.
- The mockup's 「68%」, 「预计用时约 1-2 分钟」 and 「预计还需约 40 秒」 become stages and a step count. 「高精度的 3D 数字分身」 is not claimed.
- 背景简洁度 is used for the brief's 背景清晰度 (Background suitability), following the mockup's 「背景简洁」.

**Components used.** `VT.ui.statusBar`, `VT.ui.backBtn`, `VT.ui.img`, `.scroll`, `.btn--dark.btn--xl` + `.btn-arrow`, `.btn--ghost`, `.spinner`, `.sr-only` file inputs, the local `stepper()` (`.av-steps`), `app.sheet`, `app.layer`, `app.dialog`, `app.toast`, `app.refresh`, `app.later`, `app.enterMain`, `app.back`, `app.drop`, `app.go`, `VT.camera.errorCopy` / `blockedByHost`, `VT.media`.

**Acceptance checks.** `开始体验 → avatar creation` · `选择上传方式: 照片上传 or 视频上传, 跳过 kept, 4-step progress` · `consent before any upload (purpose, on-device, deletion, third-party AI); 不同意 uploads nothing` · `consent stored` · `照片上传: 4 full-body angles + 面部生活照, each with an example; tips; 正确 / 错误示范` · `下一步 disabled until the photos pass` · `non-image rejected` · `real checks: too dark, blurry and the same photo twice → 需重拍 with the fix` · `delete a photo → its slot shows the example again` · `replacing them: 5 × 通过, 下一步 enabled` · `photos stay on this device in IndexedDB, never in localStorage` · `智能检测: what the browser measured 通过, AI-only checks 无法检测` · `the materials are previewed before generating, each replaceable` · `生成建模: 5 stages, labelled as simulated, no percentage or time estimate` · `创建完成: a 2D preview (not called 3D), name, 修改名称 / 重新生成 / 更换素材` · `AC1: setup complete → 首页 (virtual fitting room)` · `setupDone stored` · `the avatar keeps its 5 photos as IndexedDB references` · `我的形象 → 上传照片` · `demo samples: no check is claimed as passed` · `generate → back to 我的形象` · `重新生成 stays on 我的形象` · `新建数字分身: one new avatar, its own empty wardrobe, now active` · `the new avatar is listed in 切换角色` · and the 创建数字分身 block: `视频上传: the turn shown in 4 steps, 8 capture conditions, 上传视频 + 开始拍摄` · `a 3-second video fails its length check; 下一步 stays disabled` · `a 10-second video passes (length read from the file)` · `the video plays back before it is submitted` · `开始拍摄 (MediaRecorder): 3-2-1, a 10 s timer with the turn steps, then checked like an upload` · `智能检测 (video): 4 frames + play; format/length and light measured, the rest 无法检测` · `failed generation shows where it stopped; 重试 (same materials) → 创建完成` · `a video avatar keeps 4 frames on the device, not the video` · `a failed check (simulated AI result, labelled 演示) names the fix; replacing the photo clears it` · `隐私与安全 → 清除已上传的照片 deletes the avatar media from the device` · `360 px: every step of 创建数字分身 fits the width`.


## The five tabs

### 3. 首页 · 虚拟试衣间 · `fitting`

**Route** `/home` · **Type** tab root · **Prototype** `js/screens/03-fitting.js`, `css/screens/03-fitting.css`, `js/camera.js` (video try-on and 拍摄衣服), `js/screens/12-avatar-hub.js` (the 切换角色 sheet), `js/screens/06-wardrobe.js` (保存造型, `VT.wardrobe.saveLook`), `js/store.js` (digital avatars) · **Design ref** `reference/design/screens/03_fitting_room_v2.webp` (the single-column selector, 拍照 and the header) and `reference/design/fitting-upload-flow.png` (拍照 / 上传 → 临时试穿 → 自主保存). The original `reference/design/screens/03_fitting_room.png` and phone 1 of `reference/design/five-screen-mockup.png` still show the avatar, plate and category menu.

**Purpose.** Dress the active digital avatar in that person's own garments, picked by category from one list (✓ on the ones they own); try on photos of garments without saving them; save the look to that person's 穿搭瞬间 (保存造型); switch avatar and backdrop; open a live camera preview ("video try-on").

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
- Right: the garment picker, right-aligned 8 px from the edge, from y 136 (level with the category menu) to 10 px above the tab bar. There are no source tabs: 推荐 / 我的上传 are gone (21 Oct 2026).
  - The rail (aria 「可试穿单品」, `data-keep-scroll="rail"`), the only scrolling region: a 76 px wide translucent track (`rgba(255, 251, 246, .18)`, radius 18) holding one column of 64 × 64 px tiles, 8 px apart, radius 12, on #ECE4DB. The selected tile has a 1.5 px muted coral ring (#D48B7A) and `aria-pressed`; aria 「试穿{name}」 / 「取消试穿{name}」, followed by 「，已拥有」 for an owned garment.
  - **One list of the active person's garments** (`VT.garments.all`, HANDOFF §9.17), whatever their source: first this session's temporary garments, newest first (photos taken with 拍照, products tried on from another screen and not saved), then the person's wardrobe in its own order. No source headings or labels.
  - A garment is listed under the category of its garment category (上装 top, 下装 bottom, 连衣裙 dress, 外套 outer, 鞋履 shoes, 包包 bag, 配饰 acc), and also under a category whose `data.fitCatsAll` list names it: 上装's list holds four outer garments (knit-cardigan, beige-blazer, black-blazer, utility-jacket), so those show in 上装 and 外套.
  - Fresh 本人 (✓ = owned): 上装 knit-cardigan ✓, striped-shirt, black-blazer ✓, white-tee, white-shirt, brown-sweater, ribbed-tank ✓, basic-cami ✓ · 下装 straight-jeans, pleated-skirt ✓, beige-trousers ✓ · 连衣裙 satin-slip-dress · 外套 knit-cardigan ✓, black-blazer ✓, taupe-coat, black-cardigan ✓, denim-jacket · 鞋履 white-sneakers ✓, black-pumps, strappy-heels · 包包 brown-tote, black-handbag · 配饰 gold-hoops.
  - ✓ (`VT.ui.ownMark`, 15 px, top-right, 4 px in) marks the garments the person owns, and only those. It never marks a selection: the coral ring does, so a worn owned garment shows both.
  - A category with nothing in it shows the note 「还没有{category}」 (e.g. 「还没有配饰」). There is no camera tile: 「拍照」 is the way to add a photo.
- Bottom left, 14 px above the tab bar, a column with 8 px gaps (`.fit-dock`), from the bottom up:
  - 「拍照」: an ivory pill (38 px, `camera` icon; `aria-haspopup="menu"`, `aria-expanded`).
  - 「保存造型」: the same ivory pill with the `image` icon (aria 「保存造型到穿搭瞬间」), always shown. It arrived with 个人衣橱 V2 (8bf9527).
  - Above them, only while a garment photo is being tried on, the **临时试穿 card** (116 px): the thumbnail of the first worn photo in the rail's order (temporary ones first, newest first) and 「临时试穿」, the note 「演示版暂无上身图」 **[demo]**, and, while that photo is temporary, a dark 「＋ 加入衣橱」 button (aria 「将{name}加入衣橱」). Once it is in the wardrobe, the button reads 「已在衣橱」 with a hanger icon (no ✓: ✓ means owned) and is disabled. On screens 700 px tall or less the card is just its button.
- Tab bar, with 首页 active.

**Interactions.**
- Category pill → sets `fit.cat`. The menu, rail and card re-render in place, the rail scrolls to the top, and focus stays on the pill.
- Product tile → toggles the product in `fit.outfit` (see the slot rules below). The rail re-renders and keeps its scroll position and focus. The avatar then cross-fades to `pickRender(outfit).render`: the new image fades in and the old one is removed after 450 ms. Nothing happens if the render doesn't change. Toasts:
  - Item added and listed in `missing`: 「演示版暂无「{name}」的上身图，已加入当前搭配」 for 2800 ms **[demo]**.
  - Item added and shown: 「已试穿：{name}」.
  - Item removed: no toast. A garment without a render stays on the rail, so focus stays on its tile.
- Photo tile (temporary, or saved in the wardrobe) → toggles the photo in the slot of its garment category (`custom.cat`, from the category chosen in 确认衣物照片: 上装 → `top`, 下装 → `bottom`, 连衣裙 → `dress`, 外套 → `outer`, 鞋履 → `shoes`, 包包 → `bag`, 配饰 → `acc`), with the same slot rules. The outfit stores `up:{uid}`. A photo is never drawn onto the avatar: `pickRender` counts it as missing, so the render changes only when the slot rules take something else off. Added → 「演示版暂无「{name}」的上身图，已加入临时试穿」 for 2800 ms **[demo]**; removed → no toast.
- 「拍照」 → the 拍照 menu (see Overlays).
- 「保存造型」 → saves what the avatar wears now into the **active person's** 穿搭瞬间 (`VT.wardrobe.saveLook`; the record is described under 穿搭瞬间, §26): the current render on the current backdrop, with the outfit's catalogue garments as its 相关单品. It goes first, and the toast 「已保存到穿搭瞬间」 (check icon) offers 「去看看」, which sets 个人衣橱 to its 穿搭瞬间 view and makes a contextual jump there. If the newest 穿搭瞬间 already has the same render, backdrop and garments, nothing is saved and the toast is 「这套造型已经保存过了」, with the same 「去看看」.
- 「加入衣橱」 → moves the temporary photo into the front of the **active avatar's** wardrobe as the same record (same `uid`, so the outfit keeps wearing it; `source: 'photo_upload'`, not owned: 个人衣橱 can mark it; HANDOFF §9.17) and sets `wardrobeCat = 'all'`. The button becomes 「已在衣橱」. Toast 「已加入个人衣橱」 (check icon), or 「已加入「{avatar name}」的衣橱」 when there is more than one avatar, with the action 「去看看」 (contextual jump to 个人衣橱). A second save is impossible: the photo is no longer temporary. Deleting it in 个人衣橱 also takes it off the outfit, so the card goes away.
- While the 临时试穿 card shows, toasts sit at tab bar + 186 px, so 加入衣橱 stays reachable. Since 保存造型 joined the column, the card reaches higher (its top is at tab bar + 212 px at 390 × 844), so a toast covers the right end of the card's top row (HANDOFF §13.2 #39).
- 「开启视频试衣」 → opens the camera layer (see Overlays).
- 「切换场景」 → the scene sheet. 「切换角色」 → the 切换角色 sheet.
- Tapping the 首页 tab while already on 首页 smooth-scrolls the rail to the top. Other tabs switch instantly, and this screen keeps its state.

**Slot rules.**
- There are seven slots: `top`, `bottom`, `dress`, `outer`, `shoes`, `bag`, `acc`. Each slot holds one garment: a product or a photo.
- A product's slot comes from its `cat` (`data.slotOf`), not from the menu. 「上装」's full list includes four outerwear items (knit-cardigan, beige-blazer, black-blazer, utility-jacket), which fill `outer` and also show in 「外套」; when one is selected it shows the ring in both lists. A photo's slot is its garment category, chosen in 确认衣物照片 (or 个人衣橱's 添加衣物).
- Tapping a selected item removes it. Tapping another item for an occupied slot replaces the current one.
- `dress` and `top`/`bottom` exclude each other: picking a dress clears both top and bottom, and picking a top or bottom clears the dress. `outer`, `shoes`, `bag` and `acc` combine with anything, including a dress.
- `VT.tryOn` (05-product.js:195) applies the same rules when another screen sends garments here. A product the person hasn't got becomes a temporary garment of theirs, so the rail lists it (HANDOFF §9.17).

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
- `missing` lists the selected items the winning render doesn't wear, in slot order from top to acc. Photos are always in it.
- Only the 10 image-ready garments can ever be rendered: 上装 black-blazer, basic-cami · 下装 straight-jeans · 连衣裙 satin-slip-dress · 外套 black-blazer · 鞋履 white-sneakers, black-pumps, strappy-heels · 包包 brown-tote, black-handbag · 配饰 gold-hoops. Every other product and every photo always ends up in `missing`.

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
  - 确认试穿 (a blank name becomes 「我的衣物」) makes the photo a temporary garment of the active person (`VT.garments.addPhoto`: `source: 'photo_upload'`, not owned, not in the wardrobe; HANDOFF §9.17) at the front of the rail, sets `fit.cat` to the chosen category, puts the photo on (slot rules), focuses its tile and toasts 「演示版暂无「{name}」的上身图，已加入临时试穿」.
- **切换场景 sheet.** Title 「切换场景」. Four options in a row (`role="radiogroup"`, aria 「试衣间背景」): 暖灰, 奶白, 燕麦, 深咖. Each is a 3:4 swatch of that backdrop with the base avatar standing in it, over its name. The current one has an ink ring and a bold name (`aria-checked`). Tapping one stores `fitScene` and changes the backdrop at once, visible behind the sheet; the sheet stays open. Note 「场景只更换试衣间的背景，不影响当前搭配」.
- **切换角色 sheet** (`VT.avatarUI.switcher(app)`). 个人衣橱 switches with its portrait row instead (§5); both set the same active avatar.
  - Title 「切换角色」, then a radiogroup (aria 「数字分身」) of `.opt` rows: the avatar's portrait (its 生活照, else 本人's profile photo, else the demo face), its name (本人's is the profile nickname, followed by the tag 「本人」), 「衣橱 {n} 件 · 已生成」 or 「衣橱 {n} 件 · 示例形象」, and a radio.
  - Tapping another avatar switches to it (HANDOFF §9.15), closes the sheet, re-renders the current screen and toasts 「已切换到「{name}」」 (check icon). Tapping the active one just closes the sheet.
  - Below the list: a ghost 「＋ 新建数字分身」 and the note 「每个数字分身都有自己的衣橱和搭配」 / 「演示版的数字分身均使用示例模特形象」 **[demo]**.
- **新建数字分身 sheet** (`VT.avatarUI.create(app)`; also opened by the ＋ at the end of 个人衣橱's portrait row, §5). Lead 「为家人或朋友创建一个数字分身，TA 的衣橱和搭配与你的分开保存。」. 「名称」 field (max 8, placeholder 「例如：家人、朋友」, Enter submits). A dark 「下一步：上传照片」: a blank name toasts 「请填写名称」; otherwise it pushes the upload screen in its `new` context (§2) on the current tab.
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
- Reads `fit.cat`, `fit.outfit`, `fitScene`, `avatars`, `activeAvatar`, `profile.name`, and the active person's garments through `VT.garments` (their wardrobe and this session's temporary garments, with `isOwned` for ✓; HANDOFF §9.17), plus `data.fitCats`, `data.fitCatsAll`, `data.byId`, `data.slotOf` and `data.renders`.
- Writes `fit.cat`, `fit.outfit` (product ids, or `up:{uid}` for photos), `fitScene`, the temporary garments, `wardrobe` and `wardrobeCat` (加入衣橱), the active person's `moments` and, through 「去看看」, `wardrobeView` (保存造型); the avatars go through `VT.store.avatars` (HANDOFF §9.15).
- `fit.outfit` belongs to the active avatar; `fit.cat` and `fitScene` are shared by all avatars. All of these are persisted. Keep `data-keep-scroll="rail"`.
- **Loading.** Once the page has loaded, 首页 fetches the four body renders at low priority, so later outfit changes swap from the cache; the preloads never start before `load`. The first 8 rail tiles load at once and the rest use `loading="lazy"`.
- **Temporary garments**: `sessionStorage['vt-garments-temp-v1']` holds garment records with `isTemporary: true` (HANDOFF §9.17), each with its `avatarId`, newest first: photos as `custom: { src (JPEG data URL), name, cat (garment category) }`, products as `p` with its `merchantId`. They last for the browser session: a reload keeps them, a new tab or a closed browser doesn't. Each person sees only their own; deleting a person removes theirs, and 「重置演示数据」 clears them all. The old shared list `vt-fit-uploads-v1` (我的上传) is moved once into the active person's temporary garments, leaving out photos already saved, and removed.
- **Outfit sync.** Each render first makes the outfit agree with the rail (`syncOutfit`): a photo whose garment is gone (an earlier session) comes off, an older photo ref is rewritten to the saved garment's `up:{uid}`, and a worn product the person hasn't got becomes a temporary garment, so the rail lists it.

`VT.tryOn` also writes `fit` when another screen sends garments here: 商品详情 试穿上身, 个人衣橱 (立即试穿, the queue, 一键试穿这套, 再次试穿), AI造型师 looks and outfits, and 我的收藏. It takes product ids or `up:{uid}` for a photo. Products the person hasn't got become temporary garments of theirs (`source: 'shopping_plaza'`, not owned, not saved), so the rail lists them for the session. It applies the same slot rules and sets `fit.cat` from the first garment (`VT.garments.fitCatOf`, `05-product.js:210`): the first `data.fitCatsAll` entry that lists it, skipping 「上装」 unless it is a top or outer garment, else the category of its garment category. A garment without a render still opens its own category (utility-jacket opens 「上装」, brown-blazer 「外套」, maxi-skirt 「下装」; a photo its own). It forces the active avatar to `'ready'`, then makes a contextual jump to this screen. 420 ms later `VT.tryOn` shows its own toast here: 「已为你的数字分身换上所选单品」, or the 「演示版暂无…」 message for the first of the sent garments that is missing (3000 ms).

This screen doesn't read uploaded avatar photos or `avatar.status`; every avatar is shown with the preset renders **[demo]**.

**States & edge cases.**
- Fresh state: 「上装」 is active and the outfit is empty, so the `base` render shows. The rail shows 本人's 8 上装, four of them with ✓, and none is marked selected, even though the base avatar wears the cami, jeans and sneakers.
- A garment without a render stays on the rail; tapping it gives the 「演示版暂无…」 toast and tapping it again takes it off (HANDOFF §13.2 #34 no longer applies). A product tried on from another screen (e.g. grey-hoodie from 商品详情) stays on the rail for the session, without ✓, after it is taken off.
- maxi-skirt is in no `data.fitCatsAll` list. Sent here (商品详情 「试穿上身」), it joins the outfit as `bottom` with the 「演示版暂无…」 toast and, as a temporary garment, shows under 「下装」 by its garment category, so it can be tapped off (HANDOFF §13.2 #35).
- A new person (新建数字分身) has no garments: every category shows 「还没有{category}」 until they take a photo or try something on.
- A temporary garment belongs to the person it was made for: another person doesn't see it, and 加入衣橱 moves it into that (active) person's wardrobe, once.
- 保存造型 works with any outfit, the empty one included: that saves the base render with basic-cami, straight-jeans and white-sneakers, the garments it wears. A garment photo is never drawn and never listed, so putting one on doesn't make a new look: the save is the same render as before (「这套造型已经保存过了」 when that is the newest 穿搭瞬间).
- Short viewports: 保存造型 made the bottom-left column 46 px taller. Without the status bar it reaches the category menu below about 584 px of height (624 px while the 临时试穿 card, reduced to its button, shows), e.g. iPhone SE in Safari: 保存造型 then overlaps 「配饰」 (HANDOFF §13.2 #39). The §5.3 test heights are clear.
- Ownership is per person: 本人 owns white-sneakers (✓), 伴侣 has them without ✓, 妈妈 doesn't have them (HANDOFF §9.17). Switching avatar redraws the rail with that person's garments.
- Once `setupDone` is true, every launch opens this screen. Before setup is finished it is never shown; the path is onboarding → avatar → 首页.
- There are no loading or error states apart from the camera layers and the image checks. All images are local.

**Components used.** `VT.ui.statusBar('light')`, `VT.ui.img`, `VT.ui.ownMark` (`.own-mark`), `VT.ui.tabBar('fitting')`, `.scroll`, `.chip`, `.field` / `.field-row`, `.btn--ghost` / `.btn--dark` `.btn--lg`, `.sheet-actions`, `.sheet-note`, `.opt` / `.radio` (切换角色), `VT.icon` (category icons and their `-filled` variants, `person`, `home`, `chevron-down`, `chevron-right`, `video`, `camera`, `image`, `plus`, `hanger`, `check`), `app.sheet`, `app.layer`, `app.toast`, `app.later`, `VT.garments`, `VT.wardrobe.saveLook` (保存造型), `VT.avatarUI` (`switcher`, `create`). Camera: `app.layer`, `.btn--light.btn--lg.btn--block`, `.spinner`, `VT.icon` (`close`, `switch-camera`, `info`).

**Acceptance checks.** `AC1: setup complete → 首页 (virtual fitting room)` · `AC3: tab → fitting` · `AC2/4: fitting has one bar with the 5 tabs` · `tab switch to fitting is instant` · `fitting has no back button (primary)` · `outfit change: blazer → look2 render` · `outfit change: dress → look3 render` · `the selection border and ✓ are separate (worn dress: border only; worn owned blazer: both)` · `首页 rail: no 推荐 / 我的上传; 本人's 上装 in one list, ✓ on the owned ones` · `each category lists the person's garments of that kind from every source (VT.garments)` · `honest toast for garments without imagery` (grey-hoodie sent through `VT.tryOn`, as from 商品详情) · `a product tried on from elsewhere joins the rail: temporary, from 购物广场, not owned, not in the wardrobe` · `garment without a render can be tapped off (it stays in the rail this session)` · `camera preview live (getUserMedia)` · `camera stops on close` · `look → 首页 with outfit` · `AC1: relaunch after setup opens 首页` · `mobile: relaunch opens 首页` · `mobile: tabs work` · `首页 header: 切换角色 · 切换场景 · 开启视频试衣; no 推荐 / 我的上传 tabs` · `拍照 opens 拍摄衣服 / 从相册上传` · `upload → the one rail, tried on: temporary, not owned (no ✓), not in the wardrobe` · `外套 lists the photo with the wardrobe's own garments (owned ✓ and not), no source headings` · `the photo lasts for the browser session (still temporary)` · `加入衣橱 saves the upload once, still not owned` · `拍摄衣服 captures a photo (getUserMedia)` · `切换场景 changes the backdrop` · `新建数字分身: one new avatar, its own empty wardrobe, now active` · `切换角色 back to 本人 restores her wardrobe` · `per person: 本人 owns the white sneakers (✓), 伴侣 only saved them, 妈妈 has none; the photo stays 本人's` · `去试衣间试穿 wears the photo with the rest on 首页`. From the 个人衣橱 V2 block: `one active person across 首页 切换角色 and the portrait row` · `一键试穿这套 → 首页 wears the set` · `首页 保存造型 → 本人's 穿搭瞬间, newest first` (one more 穿搭瞬间, 「去看看」 lands on 个人衣橱, and the first photo is a body render). `board phone opens simulator on 首页` exists only for the showcase board.


### 4. 购物广场 · `plaza`

**Route** `/plaza` · **Type** tab root · **Prototype** `js/screens/04-plaza.js`, `css/screens/04-plaza.css`; stores in `js/data.js` (`stores`, `storeOf`, `seedStoreFavs`, `seasonPicks`) · **Design ref** `reference/design/screens/04_shopping_plaza.png`. The mockup predates the stores redesign (514de38): it has a bell, no store bar, banners or store header, and taller cards in the first rows. `reference/design/screens/04_plaza_store_v2.webp` (商家店铺, 66f648a) adds the bar with a store chosen and that store's banner with 「进入店铺」 (its first phone; the second is 商家店铺, §27). For the platform banners, search and the sheets the prototype is the only reference.

**Purpose.** Shop across stores: search every store and product, switch between the stores the user follows (关注), filter by category, and browse a two-column feed with wishlist hearts. It is also the entry point to product details, the store pages (商家店铺, §27), the one-item checkout (购物袋) and 商家消息.

**Layout (top → bottom).**
- Header (fixed): h1 「购物广场」 on the left. On the right are two icon buttons: 购物袋 (aria 「购物袋」) and 商家消息 (chat-dots icon; aria 「商家消息」, or 「商家消息，{n} 条未读」 when store chats have unread messages). The second carries a red count badge (`.pz-badge`, 16 px, `#C8473D`) with the unread total over all store chats, 「99+」 above 99, hidden at 0. REPORT deviation 5 still applies: the newer mockup drops both icons, the prototype keeps them.
- Search pill (fixed): search icon plus `<input type="search">` with placeholder 「搜索商家、品牌或单品...」 (aria 「搜索商家、品牌或单品」, `enterkeyhint="search"`). A scan button (aria 「拍照找同款」) sits at the right end of the pill. There is no inline clear (×) button: the native WebKit cancel button is hidden.
- Favourite-stores bar (fixed, scrolls sideways with a hidden scrollbar, `data-keep-scroll="pz-stores"`). A tablist (aria 「关注的商家」) of 60 px items, each a 46 px round logo over a one-line 10 px label (at most 66 px, then ellipsis):
  - 「全部」 first (grid icon on `#F1ECE6`), then one item per favourite store in `s.storeFavs` order, labelled with the store's `name`. A store's logo is its monogram (`mono`) in its `fg` colour on its `bg` colour; a monogram longer than two letters (only 「ZARA」) is set as a serif wordmark (`.st-logo.is-word`: Didot, Bodoni 72, Times New Roman; local fonts only, nothing is downloaded).
  - The chosen item (`aria-selected`) gets a dark ring around its logo (`box-shadow: 0 0 0 2px #FAF6F0, 0 0 0 3.6px #393532`) and a bold dark label.
  - After the tablist, in the same scroller: a button with a + in an outlined circle, labelled 「管理」, or 「关注商家」 when the user has no favourite stores.
  - Since b483527, 关注 / 已关注 name this list everywhere: the bar, 管理, the search pills, the store page and the toasts. 收藏 stays for product hearts and 我的收藏 (REPORT deviation 36).
- Category chip row (fixed, scrolls sideways, `role="tablist"` aria 「商品分类」): 「全部」「上衣」「下装」「外套」「连衣裙」「鞋包」「配饰」 (`data.plazaCats`). The active chip is dark (`.chip.is-on`, `aria-selected`).
- Feed (`.scroll.pz-scroll`, the only vertical scroller): a head, then the product grid. While a query is active, search results replace both (see Interactions).
  - **Head for 全部:** the platform banner carousel. Two full-width slides, `assets/plaza/banners/platform-new-season.webp` and `platform-autumn.webp` (aspect ratio 2.95, radius 12; the second loads lazily), in a horizontal scroll-snap track (`data-keep-scroll="pz-ban"`). Two dots at the bottom centre follow the swipe (5 px; the current one 12 px wide and white). No autoplay. Each slide is a button, aria 「NEW SEASON 秋日灵感穿搭，探索本季精选单品」 and 「秋日灵感穿搭，精选单品，定义新季风格」; their visible text is part of the images.
  - **Head for a chosen store** (every store since 66f648a): the store's banner (`VT.plaza.banner`, the same one 商家店铺 shows), one full-width button (`.mban.pz-shop-ban`, aspect ratio 2.31, radius 12, 12 px above the grid) with the aria 「{name} {campaign line}：{tagline}，进入店铺」, e.g. 「ZARA 2024 秋冬系列：简约与质感的日常时装，进入店铺」.
    - Live copy on the left (at most 52 % of the width): the store's `name` (ZARA as a 34 px serif wordmark, the others 20 px in the same serif stack), its campaign line (`campaign.line`, table below), its tagline and, at the bottom, the pill 「进入店铺 ›」 (27 px, a brown gradient).
    - Behind it, ZARA's text-free campaign photo (`campaign.img`, `assets/plaza/banners/zara-hero.webp`). A store without a campaign photo (all the others) gets a collage of its first three products in feed order instead: 62 × 84 px tiles, overlapping and staggered at the right, on a gradient from `#F8F4EE` to its logo colour mixed 78 % toward `#F6F1EA` (REPORT deviation 35).
    - The old ZARA banner image with its text baked in (`zara.webp`), the store card and its 「店铺详情 ›」 are gone.
  - **Grid:** 2 columns in `data.plazaOrder` order, filtered by the chosen store and the active chip. All matching products render at once (29 for 全部), with no pagination. Rows are top-aligned, not masonry.
  - Each card has: an image in a fixed 1 : 0.95 box (`aspect-ratio: 1 / .95`), a heart at top-right, `cardName` (one line, ellipsis), `tags` (one line), and a row with `¥{price}` plus up to 4 colour dots (`p.dots`) and `+N` (`p.dotsMore`; aria `{n} 种颜色`). The first 6 images load eagerly, the rest use `loading="lazy"`.
  - ✓ (`VT.ui.ownMark`, `own-mark--l`: 18 px, top-left, 8 px in, since the heart has the top-right) when the active person owns the product (`VT.garments.ownsProduct`, HANDOFF §9.17). A heart is not ownership, and a product saved but not owned has no mark. Search results and 商家店铺 use the same card. Seed (本人): knit-cardigan, black-blazer, pleated-skirt, white-sneakers, black-cardigan, ribbed-tank, beige-trousers, basic-cami.
  - Card image: `img.plaza` (the plaza asset pack's model photo or cleaned-up shot), else `img.card`, with `object-fit: cover`. Model photos (`assets/plaza/models/`: knit-cardigan, straight-jeans, brown-blazer, maxi-skirt) are anchored at 50% 24%, `cardFocus: 'top'` products (basic-cami, pleated-skirt) at the top, and everything else is centred; `small` products are contained on a `#F2EEE9` plate with 12 px padding. Every card has the same image box: the reference heights the first six cards used to have (`REF_H`) are gone.
- Tab bar (fixed): `VT.ui.tabBar('plaza')`, with 「购物广场」 active.

**Interactions.**
- Store item (「全部」 or a favourite) → writes `s.plaza.store`. Without a query, only the bar's selection and the feed re-render. With a query, it also clears the query and refreshes the whole screen: tapping a store leaves the search. Either way the feed scrolls to the top, the bar scrolls just enough to show the chosen item whole (16 px margin), and the chip is kept.
- 「管理」 / 「关注商家」 → 「关注的商家」 sheet.
- Chip → writes `s.plaza.cat`, re-renders the feed and scrolls it to the top. The category applies inside the chosen store, and to search results. 「鞋包」 matches `cat` shoes or bag; the other chips match `p.cat` exactly.
- Banner slide (全部) → 「秋日灵感穿搭」 sheet. A store's banner (its 「进入店铺」 is part of it) → that store's page: push `store` `{sid}` → `/plaza/s/:sid` (proposed; 商家店铺, §27). Back returns here with the store and chip as they were.
- Card → push `product` `{pid}` → `/plaza/p/:pid`. The whole card is a transparent button `.pz-open` with aria `查看 {name}，¥{price}`, followed by 「，已拥有」 when the person owns it. The heart sits above it.
- Heart (`VT.ui.heart`, global `fav` action) → toggles `s.favorites[pid]`. It updates every heart for that pid on screen (`aria-pressed`, aria 「收藏」/「取消收藏」, pop animation) and toasts 「已收藏」 / 「已取消收藏」 (2200 ms).
- Search input → on every `input` event (no submit, no debounce) writes the raw value to `s.plaza.q`. If the trimmed value isn't blank and a store other than 全部 is chosen, `s.plaza.store` becomes `'all'` and the bar re-renders, keeping its scroll position. Then the feed re-renders; its scroll is not reset. Matching rules and verified counts: HANDOFF §9.1.
  - Matching stores (any of the 7, favourite or not, in `data.stores` order) come first, under the heading 「相关商家」. Each row is a card (`#FBF8F3`, radius 14) and the whole row is a transparent button (aria 「查看店铺 {full name}」) that opens the store's page (§27). It shows a 40 px logo, the full name (bold), 「{tagline} · 在售 {n} 件」, and a pill on top of the row button: 「关注」 (dark) or 「已关注」 (light), with `aria-pressed` and the store name as sr-only text. The pill toggles the favourite and refreshes the screen.
  - Matching products follow in the grid, under the heading 「相关商品」 when there are store rows above them, without a heading otherwise. Store rows ignore the chip; products don't.
  - Stores match but no products do: after the rows, the line 「没有找到「{q}」相关的单品」. Nothing matches: the empty state below.
- 「清除搜索」 (empty state) → resets both `s.plaza.q = ''` and `s.plaza.cat = 'all'`, then re-renders the whole screen with `app.refresh()`. The store stays 全部.
- 「查看全部分类」 (empty state) → the 全部 chip.
- 购物袋 → push `checkout` with no params (`data-act="nav" data-to="checkout"`), so the stack becomes plaza › checkout with no product in between. Checkout shows `s.cart`, or the demo fallback cart (蓝色条纹衬衫 · M · ×1) when `s.cart` is null. This button resumes a pending checkout; it is not a cart list.
- 商家消息 → push `messages` → `/plaza/messages` (see 商家消息). Scan → 「拍照找同款」 sheet.
- Tapping the active 购物广场 tab again while at root → smooth-scrolls the feed to the top (instant with reduced motion).

**Overlays.** All sheets close via ×, scrim tap or Esc (generic `app.sheet`). `app.go` and `app.open` also close them instantly.
- The store sheet is gone (66f648a). Every way into a store (its banner here, a search row, 商品详情's brand row, 商家消息's store logo and chat header) opens the store's page, 商家店铺 (§27), through `VT.storefront.open`. `VT.plaza.openStore` still exists for old callers and opens the page too.
- **「关注的商家」 sheet** (「管理」): lead 「关注的商家会显示在购物广场顶部，左右滑动、点击即可切换。」, then the heading 「已关注 {n}」 with one row per favourite (40 px logo, `name`, tagline, an 「已关注」 pill), or 「还没有关注的商家」 when there are none. Then, when some stores aren't favourites, the heading 「推荐商家」 with their rows and 「关注」 pills. A pill toggles that store: the sheet body re-renders (the store moves to the other list; a new favourite goes to the top of 已关注) and focus returns to that store's pill. The plaza behind the sheet refreshes.
- Following a store anywhere (search row, 管理, the store page's 「关注」) puts it first in `s.storeFavs`, so it shows right after 「全部」. Unfollowing removes it, and if it was the chosen store the feed goes back to 全部. Toasts 「已关注「{name}」」 / 「已取消关注「{name}」」, with the store's `name`.
- **「秋日灵感穿搭」 sheet** (either banner slide, class `ov--shop`): lead 「本季精选单品 · 演示数据」, then `.mini` rows for `data.seasonPicks`: taupe-coat, knit-cardigan, maxi-skirt, brown-blazer, brown-sweater, black-cardigan, pleated-skirt. A row → push `product`. **[demo]**
- **「拍照找同款」 sheet:**
  - Content: lead 「上传一张衣服照片，演示版会从本地商品库中推荐风格相近的单品（非真实图像识别）。」 and a dark button 「选择照片」 (a label wrapping a hidden `accept="image/*"` file input).
  - Non-image file → toast 「请选择图片文件」.
  - Image file → shows a preview (object URL) tagged 「已上传」, then heading 「相似单品推荐」 with badge 「演示数据」, then the same three `.mini` rows every time: striped-shirt, oxford-shirt, white-shirt (`img.card`, name, tags, price). **[demo]** No image analysis.
  - Tapping a row → push `product` → `/plaza/p/:pid`. Picking another photo replaces the result.
- The 「消息通知」 sheet, which the bell used to open, now opens from 商家消息's first row.

**Data.**
- Reads `data.plazaOrder`, `data.byId`, `data.plazaCats`, `data.inCat`, `data.stores` (with each store's `campaign`), `data.storeById`, `data.storeOf`, `data.seasonPicks`, `s.plaza.{cat,q,store}`, `s.storeFavs`, `s.storeChats` (the badge), `s.favorites`, and the active person's wardrobe for ✓ (`VT.garments.ownsProduct`). Writes `s.plaza.{q,cat,store}`, `s.storeFavs` and `s.favorites[pid]`.
- **Stores** (`data.stores`, in this order). Every product belongs to the store whose `name` equals its `brand` (`data.storeOf`; no product falls through to its first-store fallback). Logo colours are in `data.js`.

| id | `name` (bar label) | full name | tagline | `campaign.line` | mono | rating | products, in feed order |
|---|---|---|---|---|---|---|---|
| `zara` | ZARA | ZARA 官方旗舰店 | 简约与质感的日常时装 | 2024 秋冬系列 | ZARA | 4.9 | knit-cardigan, straight-jeans, brown-blazer, maxi-skirt |
| `soft-archive` | Soft Archive | Soft Archive 官方店 | 柔软针织 · 基础衣橱 | 秋冬针织系列 | SA | 4.8 | basic-cami, brown-sweater, black-cardigan, white-tee, black-sweater, ribbed-tank |
| `linea-studio` | Linea Studio | Linea Studio 官方店 | 法式温柔 · 日常优雅 | 本季新品 | LS | 4.8 | pleated-skirt, satin-slip-dress, white-shirt, beige-trousers, bow-blouse, oxford-shirt |
| `mono-atelier` | Mono Atelier | Mono Atelier 官方店 | 利落剪裁 · 摩登通勤 | 西装与大衣系列 | MA | 4.8 | black-blazer, taupe-coat, beige-blazer |
| `forma` | Forma | Forma 官方旗舰店 | 鞋包配饰 · 简约实用 | 秋冬鞋包上新 | F | 4.7 | brown-tote, white-sneakers, black-handbag, black-pumps, grey-hoodie, utility-jacket, strappy-heels, gold-hoops |
| `reformation` | Reformation | Reformation 官方旗舰店 | 轻盈面料 · 经典衬衫 | 亚麻衬衫系列 | R | 4.8 | striped-shirt |
| `linea-denim` | Linea Denim | Linea Denim 官方店 | 经典丹宁 · 自在随性 | 复古牛仔系列 | LD | 4.7 | denim-jacket |

- 商家店铺 (66f648a) gave every store a `campaign` (`line`, the banner's title; `img` only for ZARA) and an `intro` (its introduction on the store page), and ZARA alone `collections` (当季精选, §27). The stores' `banner` / `bannerAlt` went with `zara.webp`.
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
- Unfollowing the chosen store sends the feed back to 全部. With no favourites, the bar shows only 「全部」 and 「关注商家」.
- The filter also runs on unfinished IME composition text (pinyin letters), because there is no `isComposing` guard. The empty state can flash while typing Chinese.
- **[demo]** The banners, the 秋日灵感穿搭 picks, the store data and the scan results are static. The scan object URL is never revoked (`04-plaza.js:232`).
- Same for logged-in and logged-out users.

**Components used.** `VT.ui.iconBtn`, `VT.ui.heart` + global `fav`, global `nav`, `VT.ui.img`, `VT.ui.ownMark`, `VT.ui.price`, `VT.ui.dots`, `VT.ui.tabBar` + global `tab`, `.chip`, `.scroll`, `app.sheet`, `.opt-list`, `.mini`, `.badge-demo`, `.sheet-lead`, `.sheet-note`, `.btn--ghost.btn--sm`, `.btn--dark.btn--lg`, `.sr-only`. Local: `logo()` (`.st-logo` and its `--md` 40 px / `--lg` 54 px / `--msg` 44 px sizes), the store bar (`.pz-stores`, `.pz-st`), the banners (`.pz-banners`, `.pz-ban`, `.pz-ban-dots`), the store banner (`banner()`: `.mban`, `.mban-art`, `.mban-copy`, `.mban-cta`; `.pz-shop-ban` here), the search results (`.pz-sec`, `.pz-srow`, `.pz-sfav`, `.pz-none`) and the 管理 sheet (`.ms-*`, `.ss-h`). Exports `VT.plaza = { openStore, manageStores, toggleFav, notices, logo, syncBadge, banner, bannerText, card, mini, storeProducts, isFavStore }`; 商家店铺, 商品详情 and 商家消息 use them, so both store views share one store model, card and banner.

**Acceptance checks.** `AC3: tab → plaza`, `AC2/4: plaza has one bar with the 5 tabs`, `tab switch to plaza is instant`, `plaza has no back button (primary)`, `plaza search`, `plaza scroll kept after switching tabs`, `plaza heart toggles`, `plaza → product details`, `AC6: back from product → plaza`, `plaza tab returns to its own history (product page)`, `finished checkout removed from plaza history`, `mobile: tabs work`. The stores block (mobile context, seed data): `plaza: store bar = 全部 + favourite stores only`, `plaza: 全部 shows every store, with the platform banner`, `plaza: a favourite store shows only its products` (ZARA: 4 products and its banner), `plaza: category narrows the chosen store` (ZARA + 外套 → knit-cardigan, brown-blazer), `plaza: the store banner's 进入店铺 opens the store page` (ZARA), then five store-page checks (商家店铺, §27), then `plaza: search covers every store and product` (「Reformation」 → one store row, striped-shirt, bar on 全部), `plaza: favouriting a store from search adds it to the bar`, `plaza: 管理 removes a store from the bar`. 商家消息 and 商家店铺 list the checks that continue from here. Ownership block: `购物广场: ✓ on exactly the products 本人 owns (a heart is not ownership)`.


### 5. 个人衣橱 · `wardrobe`

**Route** `/wardrobe` · **Type** tab root · **Prototype** `js/screens/06-wardrobe.js`, `css/screens/06-wardrobe.css`, `js/store.js` (each person's 搭配集 and 穿搭瞬间), images in `assets/wardrobe/` · **Design ref** `reference/design/screens/06_my_wardrobe.png` (the header, category tabs and grid). 个人衣橱 V2 (8bf9527, 20 Oct 2026) follows an Instagram-style mockup and the asset kit `Wardrobe_Instagram_Assets_V2`, neither of which is in `reference/design/`: for the portrait row, 衣服 / 搭配集 / 穿搭瞬间 and the long-press menu the prototype is the only reference (REPORT deviations 16–23).

**Purpose.** Each person's wardrobe. A row of portraits switches whose it is (the same setting as 首页's 切换角色). Under it, three views: 衣服, to browse, filter and search the active digital avatar's saved garments, whatever their source (from 购物广场, photos, already there), see and set which ones they own (✓, 标记为已拥有), heart them, queue several items for 首页 try-on, and add photos of the user's own clothes; 搭配集, outfit collections to open (搭配集详情, §25) and try on in one go; 穿搭瞬间, a private gallery of saved looks (§26), including the ones 首页's 保存造型 adds.

**Layout (top → bottom).**
- Header (fixed): centred h1 「个人衣橱」; on the right a search icon button (aria 「搜索衣橱」, `aria-expanded`) and an add button (＋ in a circle, aria 「添加衣物」). No back button, although the design ref shows one (tab roots have none, REPORT deviation 1). The design's own tab bar (分类/购物车) is replaced by the shared 5-tab bar.
- Portrait row (切换角色; `role="radiogroup"` aria 「切换角色」, scrolls sideways with a hidden scrollbar, `data-keep-scroll="wr-people"`): one 56 px round portrait per digital avatar in `s.avatars` order (seed: 本人, 伴侣, 爸爸, 妈妈), then a ＋ button with a thin ring (aria 「新建数字分身」).
  - No names are shown. Each portrait is a `role="radio"` button whose aria-label and `title` are the name, 本人's followed by 「（本人）」 (seed: 「小橙子（本人）」). The active one has `aria-checked` and a thin brown ring 5 px outside it (`#64402F`).
  - The gaps are `clamp(10px, (row width − 280px) / 4, 18px)`: four people and ＋ fill the row at 390 px and still fit at 360 px; more people scroll.
  - A portrait is the person's uploaded 生活照, else (本人) the profile photo, else their demo portrait (`assets/wardrobe/avatars/`), else `assets/people/chat-user.webp` (`VT.store.avatars.portraitOf`). The demo portraits are kit images, not real relatives (REPORT deviation 23).
- Toggle 「衣服」 | 「搭配集」 | 「穿搭瞬间」 (`role="tablist"` aria 「衣橱内容」): a 36 px track (`#EDE6DA`, radius 12, 16 px from the sides) with a brown thumb (`#55392E`) that slides under the selected tab in 260 ms; the selected label is white and bold (`aria-selected`).
- The view (`role="tabpanel"`, labelled with its tab's name), one of three. The chosen one is `s.wardrobeView` (default 衣服).
  - **衣服:**
    - Search bar (fixed, only while open): pill `type=search` input, placeholder 「搜索衣橱里的单品」, aria 「搜索衣橱」.
    - Category tabs (fixed row, scrolls sideways, `role=tablist` aria 「衣橱分类」), from `data.wardrobeCats`: 「全部」「上衣」「下装」「鞋包」「配饰」「外套」「连衣裙」. The active tab is bold and underlined.
    - Grid (`.wr-scroll`, the view's only vertical scroller, `data-keep-scroll="wr-clothes"`): 3 columns of 123.8 px tiles (radius 10), every saved garment of the person whatever its source. Each tile has the garment image (the kit's square shot `img.square` for the 12 products that have one, else `img.tile`; a photo garment shows its photo; the whole tile is a button with `aria-haspopup="dialog"`; aria `{name}`, followed by 「，已拥有」 when owned), a heart toggle top-right, and ✓ top-left on the garments the person owns (`VT.ui.ownMark`, `own-mark--l`: 18 px, 7 px in; top-left because the heart keeps the top-right, REPORT deviation 37). There are no source labels (the old 已收藏 / 已购买 / 我上传的 badges are gone). A queued tile gets a dark outline and, bottom-left, its place in the queue (「1」, 「2」…: a dark pill, 11 px VT Inter, no ✓).
    - Queue bar (only in 衣服, when `tryQueue` is not empty): a floating pill just above the tab bar with 「已选 N 件」, the text button 「清空」 and the dark button 「去试衣间」 plus an arrow.
  - **搭配集:**
    - A bar: 「{n} 个搭配集」 on the left (empty when there are none) and the pill button 「＋ 新建搭配集」 on the right.
    - The list (`data-keep-scroll="wr-sets"`, gap 14): one card per collection of the person, in their order (new ones first). A card (`#EFE8E0`, radius 16) is the cover, then the name (15 px bold) and 「{n} 件单品」; it is one button (aria 「{name}，{n} 件单品」), with a ⋯ button at its bottom-right (aria 「更多操作：{name}」, `aria-haspopup="dialog"`).
    - The cover is the collection's kit image (`cover`, `assets/wardrobe/collections/`), cropped to 16 : 10 and zoomed 4.5 % so the frame drawn inside the image doesn't show (REPORT deviation 18). A collection without one (the demo people's, new ones) shows a collage of its first garments on `#E9E1D7`: one fills it, two side by side, three as one tall and two stacked, four as 2 × 2. An empty collection shows a hanger.
  - **穿搭瞬间:**
    - A bar: a lock and 「仅自己可见」 on the left, 「{n} 张」 on the right.
    - A 2-column gallery (`data-keep-scroll="wr-moments"`, gaps 12), newest first. Each photo is 2 : 3 (radius 12) and a button (aria 「{M月D日}的穿搭瞬间」), with a heart at its top-right (white; dark brown `#5E3729` when hearted) and the date 「{M月D日}」 under it. A seed photo fills its frame; a 首页 render stands whole at the bottom on its backdrop's colour (暖灰 #D0C0B0 · 奶白 #E8DED4 · 燕麦 #E5D4C1 · 深咖 #5A4C3D).
- Tab bar (个人衣橱 active).

**Interactions.**
- Portrait → that person becomes the active avatar (`VT.store.avatars.switchTo`, HANDOFF §9.15: the same setting as 首页's 切换角色, so 首页 follows). The search closes and its query clears, every view's remembered scroll is dropped, and the view fades in (200 ms) with that person's garments, 搭配集 or 穿搭瞬间, at the top; the chosen view and category stay. No toast. Tapping the active portrait does nothing.
- ＋ at the end of the row → the 新建数字分身 sheet (§3, `VT.avatarUI.create`), then the upload screen in its `new` context, pushed on this tab (`/wardrobe/avatars/new`, proposed, HANDOFF §13.1 #13).
- Toggle tab → writes `s.wardrobeView` and slides the new view in from the side of its tab (220 ms; none with reduced motion). While the tab stays open, each view keeps its scroll position (in memory). Tapping the selected tab scrolls its view to the top.
- Category tab → sets `s.wardrobeCat`, re-renders the grid in place and scrolls it to the top. Mapping (`data.inCat`): 全部 shows everything; 鞋包 shows product `cat` `shoes` or `bag`; every other tab matches its own `cat` id (`top`/`bottom`/`acc`/`outer`/`dress`). Seed counts (本人): 全部 21 · 上衣 6 · 下装 3 · 鞋包 5 · 配饰 1 · 外套 5 · 连衣裙 1.
- Search icon → toggles the search bar; from 搭配集 or 穿搭瞬间 it switches to 衣服 with the search open. Opening it focuses the field; closing it clears the query. Filtering is live on every keystroke: a case-insensitive substring match on `name + tags` (uploaded items: name only), combined (AND) with the active category.
- Heart → toggles that wardrobe entry's own `fav` flag, with a pop animation and no toast; aria 「标记喜欢：<name>」/「取消喜欢：<name>」, updated with the state. This flag is **not** 我的收藏 (`s.favorites`) and not ownership (✓), and nothing else reads it.
- Tile → item sheet (below). A tile never opens the product page directly.
- Press and hold a tile for 480 ms, right-click it, or press the context-menu key on it → long-press menu (below).
- 「去试衣间」 → takes the queued entries in queue order, photos included (as `up:{uid}`), always empties the queue, then calls `VT.tryOn(refs)`. With nothing to send, it shows the toast 「所选衣物暂不支持试穿」 and stays on the wardrobe.
- 「清空」 → empties `tryQueue` and hides the bar (no confirm, no toast).
- ＋ in the header, or 「添加衣物」 in the empty state → 添加衣物 sheet.
- 「新建搭配集」 (the bar or the empty state) → the name sheet titled 「新建搭配集」 with 「创建」. The new, empty collection goes first; then 搭配集详情 is pushed for it and opens 编辑单品 by itself (§25).
- A collection card → push 搭配集详情 `{id}` (§25). Its ⋯ → the collection menu (below).
- A 穿搭瞬间 → push 穿搭瞬间 `{id}` (§26). Its heart → toggles that 穿搭瞬间's own `fav` (pop animation, no toast; aria 「标记喜欢：{M月D日}的穿搭」 / 「取消喜欢：{M月D日}的穿搭」); nothing else reads it.
- 「去试衣间」 in the 穿搭瞬间 empty state → contextual tab jump to 首页.
- Re-tapping the active tab scrolls the shown view to the top (global `tab` action).
- Arrives from: the tab bar and 我的 → stats 「我的衣橱」 (both keep the tab's own stack), and 商品详情 → 「加入衣橱」 sheet → 「去衣橱看看」 (contextual jump, which resets the tab to its root). 首页's toasts jump here too: 「去看看」 after 加入衣橱, and 「去看看」 after 保存造型, which first sets the view to 穿搭瞬间.
- **Try-on (`VT.tryOn`, `js/screens/05-product.js:195`)**, used by 「立即试穿」, 「去试衣间」, 「一键试穿这套」 (§25) and 「再次试穿」 (§26). For each garment in order (a product id, or `up:{uid}` for a photo) it sets `s.fit.outfit[slot]`, where the slot is its garment category; a photo joins without an on-body image. A dress removes top and bottom; a top or bottom removes the dress. Slots not touched stay in the outfit (merge, not replace). It sets 首页's left-menu category `s.fit.cat` from the first item (see 首页) and marks the avatar ready (`avatar.demo = true`) if there is none **[demo]**. Then it does a contextual tab jump to 首页 `/home` (fade). 420 ms later it shows the toast 「已为你的数字分身换上所选单品」, or 「演示版暂无「<name>」的上身图，已加入当前搭配」 (3000 ms, naming the first tried item that has no on-body image). The wardrobe stack is left as it was.

**Overlays.**
- **Item sheet** (title = item name; a tap on a tile, or on a 搭配集详情 tile). It shows a large image (catalog: `img.hd`, falling back to `img.tile`; photo: the photo) and a meta line 「已拥有 · {brand} · {colour name} · {size}」: 「已拥有」 with an inline ✓ (`own-mark--inline`, 14 px) only for an owned garment, the brand only for catalog items, colour and size only when set (added from 商品详情 or bought). Missing parts are left out; with none, the line is hidden. Rows (icon, label), top to bottom:
  - 「立即试穿」 (hanger) → closes the sheet and calls `VT.tryOn([ref])`. A photo joins the 首页 outfit without an on-body image.
  - 「加入搭配集」 (circled ＋) → the 加入搭配集 sheet. Opened from 搭配集详情, 「从「{name}」移出」 (minus) follows it: it takes the garment out of that collection, closes the sheet and toasts 「已从「{name}」移出」.
  - 「加入试衣搭配」 (t-shirt) / 「移出试衣搭配」 (minus) → toggles the entry `uid` in `tryQueue`, closes the sheet, toast 「已加入试衣搭配」 / 「已移出试衣搭配」. This is the only way to queue items, and photos can be queued.
  - 「标记为已拥有」 (a circled ✓, drawn like the circled ＋) or 「取消已拥有标记」 (close icon) → sets or clears `isOwned` (`VT.garments.setOwned`): the source stays and no record is added (HANDOFF §9.17). Closes the sheet and refreshes; toast 「已标记为已拥有」 (check icon) / 「已取消已拥有标记」. With 确认收货, this is the only way a garment becomes owned.
  - 「查看商品详情」 (bag; catalog items only) → pushes `product` `{pid}` onto the wardrobe stack → `/wardrobe/p/:pid`; the sheet closes.
  - 「分享」 → the native share sheet with 「「{name}」— 来自我的个人衣橱」; without it the text is copied (「已复制，可粘贴分享」), else 「分享面板在此浏览器不可用」.
  - 「删除」 (trash, red tint) → dialog 「删除这件单品？」 / 「「{name}」将从衣橱和搭配集中移除。」 / 「取消」 · 「删除」. Confirm removes the entry, its queue slot, its place in that person's 搭配集 and, when it is worn, its slot in the 首页 outfit; it closes the sheet and toasts 「已删除」. Every garment can be deleted (REPORT deviation 20).
  - Photos also show the note 「演示版暂无这件衣物的上身图，试穿时会加入当前搭配」 **[demo]**.
- **Long-press menu** (press and hold a tile for 480 ms, right-click, or the context-menu key): the garment lifts as a card (its heart top-right, ✓ top-left at 22 px when owned) over a menu (`role="menu"`): 「立即试穿」 · 「加入搭配集」 · 「标记为已拥有」 / 「取消已拥有标记」 · 「分享」 · 「删除」, which do what the item sheet's rows do.
  - The card is 264 × 236 px (radius 20), centred over a darker scrim (`rgba(28, 22, 18, .46)`); the menu card overlaps its bottom edge by 16 px, and both scale in (240 ms). The card's heart toggles like the tile's and updates the tile too. 「删除」 is red.
  - Moving more than 10 px cancels the press; the held tile shrinks a little while pressed. The click that ends the press is swallowed (within 600 ms), so it neither opens the item sheet nor closes the menu.
  - The first item takes focus (60 ms later); ↑ / ↓ move between items. Where allowed, the phone vibrates for 8 ms. A tap on the scrim, Esc or back closes it; a second one never opens while it is open.
- **加入搭配集 sheet** (title 「加入搭配集」): one row per collection of the person (a `role="checkbox"` button: a 60 px 4 : 3 cover, the name, 「{n} 件单品」 and a round tick, filled brown with a brown outline on the row when the garment is in it), then a ghost 「＋ 新建搭配集」.
  - A row adds the garment to that collection (at the end) or takes it out, closes the sheet and toasts 「已加入「{name}」」 (check icon) / 「已从「{name}」移出」.
  - 「新建搭配集」 → the name sheet titled 「新建搭配集」 with 「创建并加入」: a new collection holding this garment goes first; toast 「已加入「{name}」」 (check icon).
- **Name sheet** (新建搭配集, 重命名): a 「名称」 field (max 12, placeholder 「例如：周末出游」, aria 「搭配集名称」; focused; Enter submits) and a dark button (「创建」, 「创建并加入」 or 「保存」). A blank or all-space name toasts 「请填写名称」 and keeps the sheet open.
- **Collection menu** (⋯ on a card, or in 搭配集详情; a sheet titled with the collection's name):
  - 「重命名」 → the name sheet titled 「重命名」, pre-filled, with 「保存」; toast 「已重命名」.
  - 「编辑单品」 → the 编辑单品 sheet.
  - 「分享」 → the text 「我的搭配集「{name}」：{a、b、c}」 (its garments' names), shared like an item.
  - 「删除搭配集」 (red) → dialog 「删除「{name}」？」 / 「搭配集里的单品仍会保留在衣橱中。」 / 「取消」 · 「删除」. Confirming removes the collection (its garments stay in the wardrobe), toasts 「已删除搭配集」 and, from 搭配集详情, goes back.
- **编辑单品 sheet** (title 「编辑单品」; full height when the person has more than 8 garments): the lead 「从「{person}」的衣橱里挑选单品，组成「{collection}」。」, every garment of the person in a 4-column grid of square checkboxes (aria the name; a round tick top-left, brown, and a brown outline when chosen; no ✓ marks), and a sticky dark button 「完成 · 已选 {n} 件」 that counts live.
  - 完成 keeps the garments still chosen in their order and adds the new ones after them, in the order they were tapped; toast 「已更新搭配集」. Closing the sheet any other way changes nothing.
  - With an empty wardrobe: the lead 「衣橱里还没有单品，先添加几件吧。」 and a dark 「添加衣物」 → the 添加衣物 sheet.
- **穿搭瞬间 menu** (⋯ in 穿搭瞬间, §26).
- **添加衣物 sheet**. Contents, top to bottom:
  - The lead 「拍下或选择一张衣物照片，保存到你的个人衣橱。」.
  - A drop zone (a label wrapping a hidden `<input type=file accept="image/*">`) with 「选择照片」 and 「支持 JPG / PNG，建议纯色背景平铺拍摄」.
  - The divider 「或」, then the ghost button 「从购物广场挑选」 (bag icon) → contextual tab jump to 购物广场 `/plaza`, which resets plaza to its root.
  - Choosing a file: a non-`image/*` file gives the toast 「请选择图片文件」. There is **no file-size limit**. The image is downscaled so its longest side is at most **520 px** (never upscaled) and re-encoded as **JPEG, quality 0.82**, as a data URL. If decoding fails, the toast is 「无法读取这张图片，请换一张」.
  - After a file is chosen, the drop zone shows a preview with the badge 「已选择：<file name, first 18 chars>」; tapping it picks another photo and re-fills the name. The form appears:
    - 「名称」 input: maxlength 16, placeholder 「例如：米白针织开衫」, prefilled with the file name without its extension (cut to 16 chars, fallback 「我的衣物」).
    - 「分类」 chips 「上衣」「下装」「外套」「连衣裙」「鞋子」「包包」「配饰」 → `top/bottom/outer/dress/shoes/bag/acc`; the default is 上衣.
    - The dark button 「保存到衣橱」.
  - Save → adds a saved photo garment at the top (`VT.garments.addPhoto(…, { save: true })`: `custom: {src, name, cat}`, `source: 'photo_upload'`, not owned, so no ✓ until the user marks it; HANDOFF §9.17), resets the filter to 全部 and the view to 衣服, closes the sheet, scrolls the grid to the top and shows the toast 「已添加到衣橱」 with a check icon. 鞋子/包包 photos appear under 鞋包. Closing the sheet without saving discards the photo.
- Sheets close with ✕ (aria 「关闭」), a scrim tap, Esc, or any navigation. The dialog closes only with its buttons or Esc.

**Data.**
- Reads: `s.wardrobe`, `s.wardrobeCat`, `s.wardrobeView`, `s.tryQueue`, `s.collections`, `s.moments`, `data.wardrobeCats`, `data.inCat`, `data.byId`; for the portrait row, `s.avatars`, `s.activeAvatar` and the profile photo. `wardrobe`, `tryQueue`, `collections` and `moments` are the **active avatar's** (each avatar has its own); `wardrobeCat` and `wardrobeView` are shared.
- Writes: `s.wardrobe` (fav, ownership, remove, upload), `s.wardrobeCat`, `s.wardrobeView`, `s.tryQueue`, `s.collections` (new, rename, 加入搭配集, 编辑单品, delete), `s.moments` (`fav`), the active avatar (portraits); delete also writes that person's 搭配集 and `s.fit.outfit`; try-on also writes `s.fit` and `s.avatar`.
- Entries are garment records (HANDOFF §9.17), every change through `VT.garments`: catalog `{uid, avatarId, p, merchantId, source, isOwned, isSavedToWardrobe: true, isTemporary: false, fav, color?, size?, addedAt}`; photos `{uid, avatarId, custom:{src,name,cat}, source: 'photo_upload', isOwned, …}`. A photo saved from 首页 keeps its temporary `uid`; one saved before 21 Oct 2026 also has `fromUpload` (the old 我的上传 id). `source` is `manual`, `shopping_plaza` or `photo_upload` and never changes; ✓ follows `isOwned` only.
- Seed: `data.seedWardrobe`, 本人's 21 garments with uids `w1…w21` (the reference screen's 15, then basic-cami, satin-slip-dress, black-handbag, black-pumps, strappy-heels and gold-hoops), 4 of them hearted. 8 are owned (`manual`, ✓): knit-cardigan, black-blazer, pleated-skirt, white-sneakers, black-cardigan, ribbed-tank, beige-trousers, basic-cami. The other 13 came from 购物广场 (`shopping_plaza`, no ✓); the striped shirt's order VT20260715092418 is still on its way. 伴侣, 爸爸 and 妈妈 own their garments, except those they saved from 购物广场: 伴侣's utility-jacket and white-sneakers, 爸爸's brown-blazer, 妈妈's satin-slip-dress and black-handbag. (`data.seedRoles`: 伴侣 has 7 garments, 爸爸 6, 妈妈 8.)
- **搭配集** (`s.collections`): `{ id, name, cover, createdAt, items }`, where `items` are wardrobe uids and `cover` is a kit image or `null`. The seed lists product ids, turned into that person's uids at start-up (`seedCollections` in `store.js`). 本人's four (`data.seedCollections`, each with a kit cover): 周末最爱 (knit-cardigan, straight-jeans, white-sneakers, brown-tote) · 通勤搭配 (taupe-coat, striped-shirt, white-shirt, brown-tote) · 约会穿搭 (pleated-skirt, white-tee, black-blazer, brown-tote) · 旅行穿搭 (white-tee, straight-jeans, white-sneakers, black-cardigan). The kit's lists have 4 garments each (REPORT deviation 19). The demo people's have no cover: 伴侣 周末最爱 (3) and 旅行穿搭 (4), 爸爸 通勤搭配 (3), 妈妈 约会穿搭 (4) and 通勤搭配 (4). A new person has none.
- **穿搭瞬间** (`s.moments`): `{ id, src, scene?, at, items, missing?, fav }`, shown newest first by `at` (§26 describes the record). 本人's four seed photos (`data.seedMoments`, crops of the mockup in `assets/wardrobe/moments/`, each with the catalogue garments closest to what it shows): 10月14日 knit-cardigan, straight-jeans · 10月12日 black-blazer, black-handbag · 10月8日 grey-hoodie (hearted) · 10月6日 satin-slip-dress, black-handbag. The demo people and new people start with none.
- Order is the array order; there is no sort control. New entries are `unshift`ed: photos here and from 首页 (加入衣橱), 商品详情 「加入衣橱」 and checkout (both `shopping_plaza`, not owned). One record per product per person: re-adding a product only updates its colour/size, and buying one that is there changes nothing (owned or not). 确认收货 marks the bought garment owned. `addedAt` is stored but never used.
- Persisted: the wardrobe, `wardrobeCat`, `wardrobeView`, `tryQueue` (the queue survives a reload), and each person's 搭配集 and 穿搭瞬间.
- In memory only (kept across tab switches, lost on reload): whether search is open, the query, and each view's scroll position.
- Kept when returning to the tab: the shown view's scroll (`data-keep-scroll` `wr-clothes`, `wr-sets`, `wr-moments`), the category row (`wr-tabs`) and the portrait row (`wr-people`).

**States & edge cases.**
- Empty grid: a hanger icon, the text 「没有找到匹配的单品」 (when a query is typed) or 「这个分类还没有衣服」, and the ghost button 「添加衣物」. With 本人's seed no category is empty; a new person's are.
- No 搭配集: a hanger icon, 「还没有搭配集」, 「把喜欢的单品组合成一套 Look，随时一键试穿」 and a ghost 「新建搭配集」 (a new person). No 穿搭瞬间: an image icon, 「还没有穿搭瞬间」, 「在首页试穿后点「保存造型」，造型会保存在这里」 and a ghost 「去试衣间」 (the demo people and a new person).
- ✓ and the heart are independent: the seed has hearted garments without ✓ (brown-tote, white-shirt) and owned ones without a heart. Temporary garments (首页) never show here until 加入衣橱.
- The queue bar shows only in 衣服; the queue itself stays while another view is shown.
- A name of only spaces is saved as an empty string (bug, `06-wardrobe.js:580`; the intent is 「我的衣物」).
- Saving does not clear an open search query, so the new item can be hidden by the search.
- Toasts appear on top of the queue bar (both sit at about the same height: `components.css:259`, `06-wardrobe.css:100`). Keep them apart in the rebuild.
- The prototype keeps uploaded photos as data URLs in local state **[demo]**.
- No difference between first launch and later, or logged in and not.

**Components used.** `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.ownMark` (`.own-mark--l`, `.own-mark--inline` in `.wr-own-tag`), `VT.ui.tabBar`, `.heart-btn` (+`.pop`), `.btn` (`--dark/--ghost/--sm/--lg/--block`), `.chip`, `.field`/`.field-label`/`.field-row`, `.sheet-lead`, `.sheet-note`, `.sr-only`, `.wr-menu-row` (with `.wr-ring-plus` / `.wr-ring-own`), `app.sheet`, `app.layer`, `app.dialog`, `app.toast`, `VT.tryOn`, `VT.garments`, `VT.store.avatars`, `VT.avatarUI.create`. Local: the portrait row (`.wr-people`, `.wr-face`), the toggle (`.wr-segs`, `.wr-seg`), the view bars (`.wr-bar`, `.wr-private`), the collection cards and covers (`.wr-set*`, `.wr-cover*`), the gallery (`.wr-moment*`, `.wr-photo`), the long-press layer (`.wr-ctx*`) and the sheets' parts (`.wr-set-row*`, `.wr-pick-*`). Exports `VT.wardrobe = { saveLook }` for 首页's 保存造型. (`VT.ui.statusBar` is prototype-only.)

**Acceptance checks.** `AC3: tab → wardrobe` · `AC2/4: wardrobe has one bar with the 5 tabs` · `tab switch to wardrobe is instant` · `wardrobe has no back button (primary)` · `加入衣橱 → 个人衣橱 tab` · `加入衣橱: top of the wardrobe, from 购物广场 with its store, not owned: no ✓, no source label` · `wardrobe filter 下装` · `wardrobe queue bar; a queued tile is numbered, not ✓` · `添加衣物: saved as a photo garment, not owned (no ✓)`. The 个人衣橱 V2 block runs in a fresh 390 × 844 context with empty storage, from `?app=wardrobe`; each check builds on the one before: `portrait row: 4 people + 新建数字分身, no names, 本人 ringed` · `衣服 | 搭配集 | 穿搭瞬间 over a 3-column grid` (21 tiles) · `tapping a portrait shows that person's wardrobe` (伴侣: 7 garments, grey-hoodie, no knit-cardigan) · `one active person across 首页 切换角色 and the portrait row` · `category filters follow the person (妈妈 连衣裙 1, 本人 全部 21)` · `个人衣橱: ✓ exactly on the owned garments; hearts apart (♥ without ✓ and ✓ without ♥); no source labels` · `标记为已拥有: ✓ on the tile, source kept, no new record; the heart still toggles on its own` · `取消已拥有标记 takes the ✓ away again` · `long-press: 立即试穿 · 加入搭配集 · 取消已拥有标记 · 分享 · 删除 (not the item sheet)` · `加入搭配集 → 新建搭配集 holding that garment` (「春日出游」 with 1 garment, first of 5) · `搭配集 → 搭配集详情 with its garments` · `一键试穿这套 → 首页 wears the set` · `首页 保存造型 → 本人's 穿搭瞬间, newest first` · `穿搭瞬间 detail: photo, date, 仅自己可见, related garments, 再次试穿`. The last four are listed with 搭配集详情 (§25), 首页 (§3) and 穿搭瞬间 (§26) too.


### 6. AI 造型师 · `stylist`

**Route** `/stylist` · **Type** tab root · **Prototype** `js/screens/07-stylist.js`, `css/screens/07-stylist.css` · **Design ref** `reference/design/screens/07_ai_stylist.png`

**Purpose.** A scripted chat stylist. The user asks for outfit advice (typed, a suggestion chip, an occasion or a photo) and gets keyword-matched replies with look cards, or an outfit put together from the active person's own garments (owned first, ✓ on the owned ones) with the products to buy shown apart, which they can save, open, shop or try on.

**Layout (top → bottom).**
- Header (fixed): centred h1 「AI 造型师」; on the right, 历史造型 (clock icon, aria 「历史造型」) and share (aria 「分享对话」). No back button, although the design ref shows one (REPORT deviation 1).
- Chat thread (`.st-scroll`, the vertical scroller, `aria-live="polite"`), rendered from `s.chat`:
  - User text: a bubble on the right plus the user's round photo (`VT.ui.profilePhoto`: profile photo → avatar portrait → `assets/people/chat-user.webp`). User photo: an image bubble (alt 「我上传的穿搭照片」).
  - AI text: a sparkle avatar on the left plus a bubble; `\n` in the script becomes a line break.
  - Looks row: look cards side by side in 3 columns. A single look renders as one larger centred card (`.is-single`).
  - Wardrobe set (outfit, `.st-wl`): a card with a 2-column grid of garment tiles (104 px tall) and a footer 「<name> + <name> + …」 with the dark button 「去试衣间试穿」. A product tile is a button (aria 「查看单品：<name>」); a photo tile is a `<span role="img">` (aria `<name>`). Both add 「，已拥有」 and show ✓ (17 px, top-right, 6 px in) when the person owns the garment. A photo that is gone is left out, and a set with nothing left isn't drawn.
  - Products to buy (`.st-buy`, a list with aria 「可以单独购买的单品」): up to 4 square product tiles in 4 columns, under the outfit. Each is a button (aria 「查看商品：<name>，¥<price>」). The plans never suggest a product the person owns; one marked owned later shows ✓ (14 px) and 「，已拥有」 when the thread is drawn again.
- Suggestion chips (inside the scroller, right after the last message, scrolling sideways, aria 「快捷提问」), from `data.chatSuggestions`: 「我想要更正式一些」「换成裙装搭配」「根据我已有的衣服来搭配」. They stay after use.
- Input bar (fixed above the tab bar): a round ＋ (aria 「更多：上传照片或选择场合」), a text field (placeholder 「告诉我你的穿搭需求...」, maxlength 120, `enterkeyhint=send`) and a round dark ↑ send button (aria 「发送」).
- Tab bar (AI造型师 active).
- **Look card** (data from `data.looks` / `lookById`): a model image (button, aria 「查看 Look N 详情」) with a column of item-thumbnail buttons over its right edge (aria 「查看单品：<name>」, plus 「，已拥有」 with ✓ 11 px top-right, 1.5 px in, when the person owns the product; positions per look are hard-coded in `ITEM_BOX`, `07-stylist.js:13`). Below the image: 「Look N」 with a heart save button, the sub line (e.g. 「休闲时髦 · 轻松有范」) and 3 tag pills.

**Interactions.**
- Send (button, or Enter except during IME composition) → trims the text. If it is empty, the field gets focus and the toast 「先输入你的穿搭需求吧」 shows. Otherwise the field is cleared and the text is asked.
- Suggestion chip → asks the chip text.
- **Reply engine [demo].** Asking appends the user message, then picks a reply: the first `data.chatReplies` entry, in array order, with any keyword that is a plain substring of the message (`String.includes`, no normalisation). The first three are `plan` replies, put together from the active person's garments at the time of asking (`07-stylist.js`, `plan`; rules, templates and cases in HANDOFF §9.7). The other texts are in `data.js`.
  1. 拍了 刚拍 拍的 上传了 刚上传 上传的 → `upload` plan: their newest garment photo (of the kind named, e.g. 外套) is the focus, styled with their wardrobe, owned pieces first; the photo is never taken as owned.
  2. 购物广场 这件 → `focal` plan: the 购物广场 product the sentence means (its garment word and colour, one they saved or viewed; 「这件」 alone = the product viewed last) is the focus, styled the same way; the pieces to buy are named.
  3. 已有 衣橱 我的衣服 现有 → `owned` plan: an outfit of owned garments only (a dress or top + bottom, outer layer, shoes, bag; 通勤 / 约会 / 休闲… words bias the picks), or what is missing said plainly.
  4. 正式 通勤 上班 会议 面试 → text + look `look2`
  5. 裙 连衣裙 约会 优雅 女人味 → text + `look3`
  6. 休闲 舒适 轻松 日常 周末 → text + `look1`
  7. 冷 降温 保暖 秋 冬 → text + wardrobe set `taupe-coat, brown-sweater, straight-jeans, white-sneakers`
  - No match → `data.chatFallback` (text only).
  - A plan answers with an AI text and the outfit card, then, for missing pieces, another AI text and the products to buy. With 「允许 AI 造型师读取衣橱」 off (隐私与安全), every plan answers only that it can't see the clothes. The replies call 本人 你 and anyone else by name in corner brackets, e.g. 「爸爸」.
  - The three chips hit rules 4, 5 and 3. Because order decides, 「我想穿裙子去上班」 hits rule 4, and 「用我现有的衣服搭一套通勤装」 hits rule 3, not 4.
- **Reply timing.** A typing bubble (3 bouncing dots, sr-only 「AI 造型师正在输入」) appears at once. After **1100 ms** (200 ms with reduced motion) it is replaced by the reply's messages in order (AI text, looks row, outfit, more text, products to buy); each new message smooth-scrolls the thread to the bottom. Sending is never blocked, and parallel replies each get their own typing bubble. If the user has left the screen (another tab, or a pushed product page) when the timer fires, the messages are only written to the store; they appear on return, with no typing bubble and the scroll position as the user left it.
- Look card heart → toggles `s.savedLooks[id]` (sets a timestamp, or deletes the key). Every heart for that look in the thread updates. Toast 「已保存到「历史造型」」 / 「已取消保存」.
- Look card image → look sheet.
- Item thumbnail, a product tile of the outfit, or a product to buy → pushes `product` `{pid}` onto the stylist stack → `/stylist/p/:pid`. Photo tiles aren't buttons.
- Wardrobe-set 「去试衣间试穿」 → `VT.tryOn(refs)` with its garments, photos included (`up:{uid}`), a contextual jump to 首页 (see 个人衣橱 for what try-on does).
- 历史造型 → 历史造型 sheet. This is not the 浏览记录 screen.
- 分享对话 → the native share sheet (`navigator.share`, title 「AI 造型师」) with the fixed text 「AI 造型师为我推荐了 3 套朋友聚会造型：休闲时髦 / 摩登气质 / 优雅迷人」 (the same whatever the conversation); cancelling it is silent. Without native share, the text is copied and the toast 「对话摘要已复制」 shows; if the clipboard fails, the toast is 「分享面板在此浏览器不可用」. The prototype skips native share when embedded (`VT.framed`); the web build should drop that check.
- ＋ → 更多 sheet. Re-tapping the active tab scrolls the thread to the top.
- Arrives from: the tab bar (keeps the tab's own stack); 我的收藏 → 造型 empty state 「去问问 AI 造型师」 and the 「AI 造型师」 item in the 「消息通知」 sheet on 商家消息 (both contextual jumps, which reset the tab to its root).

**Overlays.**
- **Look sheet** (full height). Title 「Look N · <sub>」, e.g. 「Look 1 · 休闲时髦 · 轻松有范」. Contents:
  - The hero image, then item rows (`.mini`: image, name, tags, price). The image carries ✓ (15 px, top-right, 4 px in) and the name a sr-only 「，已拥有」 when the person owns the product; the subtitle is always its tags (「衣橱已有」 is gone). A row pushes `product` and closes the sheet.
  - 「整套参考价 ¥X」, the sum of the item prices formatted with `VT.ui.yuan` (Look 1 = ¥1,316).
  - 「保存搭配」, which reads 「已保存」 once saved. It sets `savedLooks[id]` if missing and never unsaves. It shows the toast 「已保存到「历史造型」」 on every tap, even when already saved, and fills the hearts in the thread.
  - The dark 「去试衣间试穿」 → `VT.tryOn(all look items)` → 首页, which normally shows that look's render.
- **历史造型 sheet**:
  - 「已保存的造型」: saved looks, newest first, as 3-column tiles (image, name, sub). A tile closes this sheet and opens that look's sheet. Empty: 「点击造型卡片上的 ♡ 即可保存」.
  - 「最近的对话」: static, non-tappable rows 「朋友聚会穿搭」 今天 · 「一周通勤穿搭」 10月12日 · 「周末出游怎么穿」 10月6日, plus the note 「演示数据」 **[demo]**.
- **更多 sheet**:
  - 「上传一张穿搭照片」: a button-styled label with a hidden `image/*` file input.
  - 「按场合推荐」 chips 「周末出游」「上班通勤」「晚餐约会」「降温保暖」 → close the sheet and ask 「<chip>穿什么好？」, which hits rules 6, 4, 5 and 7.
  - Photo: a non-image file gives the toast 「请选择图片文件」; there is no size limit. The image is downscaled so its longest side is at most **420 px** and saved as **JPEG, quality 0.8**, a Blob in IndexedDB (`VT.media.put`); if decoding fails, the original file is kept as it is. The sheet closes, the photo is posted as a user message, and after the same delay the fixed reply in the 更多 sheet's `photo` action (not in `data.js`) arrives with `look2` **[demo]**.

**Data.**
- Reads: `s.chat`, `s.savedLooks`, the active person's garments through `VT.garments` (✓ on every garment card, and the plans: the wardrobe and this session's photos), `s.privacy.wardrobeAI`, `s.history` (the focal plan), `s.avatars` / `s.activeAvatar` (「你」 or the name), `s.profile.photo` / `s.avatar.portrait`, and from `data.js`: `chatSeed`, `chatSuggestions`, `chatReplies`, `chatFallback`, `looks`/`lookById`, `byId`, `products`, `plazaOrder` (products to buy). `chatSeed` holds 4 seed messages: user, AI, looks 1–3, AI.
- Writes: `s.chat` and `s.savedLooks` (`{lookId: timestamp}`); try-on also writes `s.fit` and `s.avatar`. `s.chat` entries are `{role:'user', text|img}`, `{role:'ai', text}`, `{role:'looks', looks:[ids]}`, `{role:'wardrobe', pids:[refs]}` (product ids, or `up:{uid}` for a photo) and `{role:'buy', pids:[]}` (products to buy). The ✓ are not stored: each draw reads the current ownership. The chat is capped at 60 entries: the first 4 are kept, then the newest 56.
- Persisted: chat and saved looks. A photo message keeps only a reference, `img: { media: key }`. The photo itself is a Blob in IndexedDB (`js/media.js`, as for the avatar photos; HANDOFF §9.16), never a data URL in `localStorage`.
  - It is read through `VT.media.src(img)`. A photo message is left out of the thread while its photo isn't loaded (the first render after start-up) or is no longer on the device.
  - The photo of a message that falls off the 60-entry cap is deleted from the device. So is every chat photo when 隐私与安全 → 清除已上传的照片 runs, which also removes their messages.
  - Photos saved as data URLs before 21 Oct 2026 move to IndexedDB at start-up.
- UI state: the input draft is kept across tab switches but not reloads (`data-keep-value="st-in"`); scroll is kept for the thread (`st`) and the chips row (`st-sg`). On a fresh load with more than the seed messages, the thread opens scrolled to the bottom; with only the seed messages it opens at the top.

**States & edge cases.**
- The first visit shows `chatSeed` (looks for a 朋友聚会). There is no empty or error state, and no loading state other than the typing bubble.
- All replies are scripted and photos are not analysed **[demo]**. The 隐私与安全 toggle 「允许 AI 造型师读取衣橱」 turns the three plan replies into its privacy reply; the others don't change.
- A plan uses what the person has when they ask: with no owned garments the owned plan says so and offers products to buy; with no photo the upload plan asks for one on 首页; a garment marked owned later (标记为已拥有, 确认收货) shows ✓ in the cards already in the thread.
- The typing bubble exists only in the DOM and is never stored.
- Saved looks also appear in 我的收藏 → 造型 and count towards 我的 → 我的收藏.

**Components used.** `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.ownMark`, `VT.ui.nl2br`, `VT.ui.profilePhoto`, `VT.ui.price`, `VT.ui.yuan`, `VT.ui.tabBar`, `.chip`, `.btn`, `.mini`, `.sheet-actions`, `.sheet-note`, `.sr-only`, `app.sheet` (incl. `full: true`), `app.toast`, `app.later`, `VT.tryOn`, `VT.garments`, `VT.reducedMotion`.

**Acceptance checks.** `AC3: tab → stylist` · `AC2/4: stylist has one bar with the 5 tabs` · `tab switch to stylist is instant` · `stylist has no back button (primary)` · `stylist draft kept across tabs` · `AI stylist reply with looks` · `look → 首页 with outfit` · `头像, 售后凭证 and AI 造型师 photos stay on this device in IndexedDB, never in localStorage` · `头像, 售后凭证 and AI 造型师 photos load from IndexedDB after a reload` · `data URLs saved by an earlier version move to IndexedDB at start-up (avatar photos too)`. Ownership block: `AI 造型师 look cards: ✓ on the items 本人 owns, nothing on the others` · `用我现有的衣服…: owned garments only, each with ✓` · `a 购物广场 product as the focus: the blue shirt without ✓, owned pieces with ✓, the ones to buy named` · `…and AI 造型师's card for it shows ✓ at once` (after 确认收货) · `爸爸 owns no shoes: his owned outfit (✓), the gap said, shoes to buy apart (no ✓)` · `a photo they took as the focus: in the outfit, not taken as owned (no ✓), said so` · `去试衣间试穿 wears the photo with the rest on 首页`


### 7. 我的 · `profile`

**Route** `/me` · **Type** tab root · **Prototype** `js/screens/10-profile.js`, `css/screens/10-profile.css` · **Design ref** `reference/design/five-screen-mockup.png` (phone 5)

**Purpose.** Account hub: profile header, three live counts, order-status shortcuts and the entry rows to every account and settings screen.

**Layout (top → bottom).**
- Prototype status bar (`VT.ui.statusBar('dark')`): drop in the web app (safe-area inset instead).
- One scroll container `.me-scroll` (`data-keep-scroll="me"`) holds everything above the tab bar. A decorative beige band `.me-band` sits behind the header and scrolls with it.
- Header: round profile photo with a small dark camera badge (`VT.ui.profilePhoto(s)`: `profile.photo` → 本人's `avatar.portrait` → `assets/people/chat-user.webp`, the first two read through `VT.media.src`), wrapped in a `<label title="更换头像">` with a hidden `<input type="file" accept="image/*">` (aria 「更换头像」). Next to it one button holding the name `<h1>` and the bio line (empty bio → placeholder 「编辑个性签名」); both are single-line with ellipsis. Gear icon button (aria 「设置」) top right.
- Stats card (aria 「我的数据」), three columns, number over label:
  - 「我的衣橱」 = `s.wardrobe.length` (every saved garment of the active person, owned or not, whatever its source; this session's temporary garments on 首页 are not counted).
  - 「我的收藏」 = `VT.store.h.favCount(s)` = products with `favorites[pid] === true` + saved AI-stylist looks (keys of `savedLooks`). Wardrobe hearts (`w.fav`, 「标记喜欢」) are not counted.
  - 「浏览记录」 = `s.history.length` (product-page views, one per product, newest first, max 30).
  - Values at reset: 21 / 8 / 6. The mockup's 12 / 28 / 6 are placeholders (REPORT deviation 6).
- 我的订单 card: 「我的订单」 + 「查看全部 ›」; five icon shortcuts = `data.orderFilters` without 全部, in order 「待付款」 wallet · 「待发货」 box · 「运输中」 truck · 「待收货」 box-check · 「售后」 aftersale. The count per filter (`VT.store.h.inFilter`) is only in the aria-label (「待付款，1 个订单」; zero → just the label). No visible badge, same as the mockup.
- Account list card (aria 「账户与设置」): seven `VT.ui.row` rows (icon, label, chevron): 「我的资料」 person · 「我的形象」 figure, with a round thumbnail on the right (`VT.media.src(avatar.portrait)`, else `chat-user.webp`) · 「收货地址」 pin · 「支付方式」 card · 「消息通知」 bell · 「帮助与客服」 question · 「设置」 settings. There is no separate 数字形象 card: this row is the avatar entry.
- Tab bar `VT.ui.tabBar('profile')`, fixed at the bottom.

**Interactions.**
- Photo → native file picker → `squarePhoto(file)`: centre-crops the largest square, scales it to 320×320, JPEG quality 0.82, stores it as a Blob in IndexedDB (`VT.media.put`) → its reference saved straight to `profile.photo` (no draft, no confirm); the photo it replaces is deleted from the device → re-render → toast 「头像已更新」 (check icon). Non-image → toast 「请选择图片文件（JPG / PNG 等）」; decode failure → 「无法读取这张图片，请换一张」. No file-size limit.
- Name/bio button (aria 「编辑个人资料：{name}」) → push `editprofile` (`/me/profile`). There is no separate edit icon.
- Gear and the 「设置」 row (duplicates) → push `settings` (`/me/settings`).
- 「我的衣橱」 → switch to the `wardrobe` tab exactly like the tab bar (instant; that tab keeps its own stack). 「我的收藏」 → push `favorites`. 「浏览记录」 → push `history`.
- 「查看全部」 → push `orderlist` with status `all`; each shortcut → push `orderlist` with its filter id (`unpaid`, `toship`, `shipping`, `toreceive`, `aftersale`).
- Rows → push: `editprofile` (`/me/profile`), `avatarhub` (`/me/avatar`), `addresses`, `payments`, `notifications`, `help`, `settings`.
- Tab bar: tapping 「我的」 while on this root smooth-scrolls `.me-scroll` to the top (instant jump with reduced motion); other tabs switch instantly and keep their stacks.

**Overlays.** None (the photo uses the native file picker).

**Data.** Reads `profile.{name,bio,photo}`, `avatar.portrait` and `wardrobe` (both the active avatar's: 我的衣橱 counts the active avatar's wardrobe, and the 我的形象 row shows its portrait), `favorites`, `savedLooks`, `history`, `orders`, `returns`, `data.orderFilters`. Writes `profile.photo`: a reference `{ media: key }` to a Blob in IndexedDB (`js/media.js`, HANDOFF §9.16), read through `VT.media.src`, never a data URL in `localStorage`. A photo saved as a data URL before 21 Oct 2026 moves to IndexedDB at start-up. Until start-up has loaded the photo (the first render), the header shows the next fallback. All counts are recomputed on every render, so they are live when coming back from any screen or tab. Keep scroll `me`. The 我的 tab keeps its own stack: leaving from 我的订单 and returning by the tab bar lands on 我的订单 again.

**States & edge cases.** No logged-in / logged-out difference: 我的 always shows the local profile (defaults 「小橙子」 / 「开启更美的每一天」); `loggedIn` only switches the bottom button of 设置 (「登录 / 注册」 ↔ 「退出登录」). Until a photo is uploaded, the header photo and the 我的形象 thumbnail show the demo portrait `chat-user.webp` **[demo]**. The header prefers `profile.photo`; the 我的形象 thumbnail never uses it (always the avatar 生活照). 设置 → 隐私与安全 → 清除已上传的照片 resets both to the sample. Only reachable after first-launch setup.

**Components used.** `VT.ui.profilePhoto`, `VT.ui.img`, `VT.ui.iconBtn`, `VT.ui.row` (`.set-row.me-row`), `VT.ui.tabBar`, global actions `nav` and `tab`, `.sr-only` file input, `VT.profile.squarePhoto` (also used by 编辑资料).

**Acceptance checks.** `AC3: tab → profile` · `AC2/4: profile has one bar with the 5 tabs` · `tab switch to profile is instant` · `profile has no back button (primary)` · `我的订单 → back → 我的` · `我的 → 待收货 filter` · `我的 tab remembers its own history` · `我的 → 我的形象` · `我的形象 → back → 我的` · `我的 → 设置` · `设置 → back → 我的` · `我的 → 我的资料` · `我的资料 → back → 我的` · `我的 → 收货地址` · `收货地址 → back → 我的` · `我的 → 支付方式` · `支付方式 → back → 我的` · `我的 → 消息通知` · `消息通知 → back → 我的` · `我的 → 帮助与客服` · `帮助与客服 → back → 我的` · `edit profile saved` · `change profile picture` (an object URL, `blob:`) · `我的收藏 lists favourites` · `浏览记录 includes viewed products` · `mobile: tabs work` · `mobile: no horizontal overflow` · `头像, 售后凭证 and AI 造型师 photos stay on this device in IndexedDB, never in localStorage` · `头像, 售后凭证 and AI 造型师 photos load from IndexedDB after a reload` · `我的 counts the saved wardrobe only (temporary garments are not in it)`


## Shopping flow

### 8. 商品详情 · `product`

**Route** `/plaza/p/:pid` (canonical parent `plaza`; other paths below) · **Type** secondary · **Prototype** `js/screens/05-product.js`, `css/screens/05-product.css` · **Design ref** `reference/design/screens/05_product_details.png`

**Other paths.** The screen is pushed onto whichever stack opened it: `/wardrobe/p/:pid`, `/stylist/p/:pid`, `/me/favorites/p/:pid`, `/me/history/p/:pid`, `/me/orders/p/:pid` (「再次购买」), `/me/orders/o/:oid/p/:pid`, `…/checkout/p/:pid` (checkout item card), `/plaza/messages/p/:pid` (the 「心愿单降价提醒」 notice on 商家消息), `…/s/:sid/p/:pid` (a store page's products and 当季精选 rows, proposed route: 商家店铺, §27) and the 搭配集详情 / 穿搭瞬间 paths `/wardrobe/sets/:id/p/:pid`, `/wardrobe/moments/:id/p/:pid` (proposed, §25–§26). The store sheet that pushed `…/p/:pid/p/:pid2` is gone.

**Purpose.** Show one catalogue item (gallery, rating, brand, price, description), let the user choose colour and size, and send it to the wardrobe, to try-on on 首页, or to checkout.

**Layout (top → bottom).**
- Floating top bar, fixed over the hero (it does not scroll and has no background): back (aria 「返回」) on the left; heart (`VT.ui.heart`) and share (aria 「分享」) on the right.
- Scroll container `.pd-scroll`; everything below scrolls:
  - Hero image `gallery[i]` with alt `{name}（第 {i} 张，共 {n} 张）`. It uses `contain` when the path contains `model` or `items/` and `cover` otherwise; `small` products get padding. A transparent button (aria 「下一张图片」) covers the hero below the top bar.
  - Thumbnail strip (`role="tablist"` aria 「商品图片」, scrolls sideways), built from `galleryThumbs || gallery`. Each tab has aria `第 {i} 张图片`. The active thumb is wider and outlined.
  - Title row: h1 `name`, plus a rating button (★, `rating.toFixed(1)`, `({reviews})`; aria `评分 {rating}，{reviews} 条评价`).
  - Brand row (`.pd-brand`, one button, aria 「{brand}，进入店铺」; its touch target is stretched to 44 px): the store's 20 px logo (`VT.plaza.logo`), the brand (the store's `name`, e.g. 「ZARA」) and, after a hairline, 「进入店铺 ›」 (12 px, grey). Then the large price `¥{price}`, then `desc` (`\n` becomes a line break).
  - When the active person owns the product (`VT.garments.ownsProduct`), the price line ends with 「已拥有」 after an inline ✓ (`.pd-own`: 10 px after the price, 12.5 px / 600, `--text-2`, ✓ 15 px). Saved but not owned, hearted or ordered: nothing.
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
- 「尺码指南」 opens the size guide sheet and the rating opens the reviews sheet.
- The brand row opens the page of the product's store (`VT.storefront.open(app, data.storeOf(p).id)`, `05-product.js:133-137`; 商家店铺, §27), pushed on this tab's stack (`…/p/:pid/s/:sid`, proposed). When that store's page is already in the stack, as after store → product, it goes back to it instead of pushing a copy. Until 66f648a it opened the store sheet, and before 514de38 a brand sheet (lead 「品牌店铺 · 演示数据。以下为同品类在售单品：」); both are gone.
- Heart → global `fav` on `s.favorites[pid]`, with toast 「已收藏」 / 「已取消收藏」.
- Share. The text is `{name} ¥{price} — 来自「全新的购物体验」原型`.
  1. If `navigator.share` exists (and the page is not framed), call `navigator.share({title: name, text})`. On success or `AbortError`, stop silently. Any other error falls through to step 2.
  2. Call `navigator.clipboard.writeText(text)` and toast 「商品信息已复制，可粘贴分享」.
  3. If the clipboard call fails, toast 「分享面板在此浏览器不可用」.
- 「试穿上身」 → `VT.tryOn(app, [pid])`:
  1. If the active person hasn't got the product, it first becomes a temporary garment of theirs (`source: 'shopping_plaza'`, not owned, not in the wardrobe; HANDOFF §9.17), so 首页's rail lists it for the session without ✓. Then it sets `s.fit.outfit[slot] = pid`, with the slot from `data.slotOf` (top/bottom/outer/dress/shoes/bag/acc). A dress clears top and bottom; a top or bottom clears the dress; other slots stay.
  2. Sets `s.fit.cat` to the first `data.fitCatsAll` entry whose `items` contains the pid (skipping 「上装」 unless the product is a top or outer garment), else the 首页 category of its garment category, so the 首页 side menu shows that category and the garment is on the rail. maxi-skirt is in no list: it opens 「下装」 (HANDOFF §13.2 #35).
  3. If `s.avatar.status !== 'ready'` (none or stale), sets `status: 'ready'` and `demo: true`. 首页 draws the demo renders whatever the status; the flag only affects places like the size-guide tip and 我的形象.
  4. Contextual tab jump `app.go('fitting')` → 首页 root with fade, at `/home`. The product page stays on the opener's stack.
  5. After 420 ms it toasts. If `VT.fitting.pickRender(outfit).missing` includes the pid: `演示版暂无「{name}」的上身图，已加入当前搭配` (3000 ms). Otherwise: 「已为你的数字分身换上所选单品」.
- 「加入衣橱」 → writes the active person's wardrobe immediately (`VT.garments.addProduct(pid, {color, size})`, no undo), then opens the result sheet. One record per product per person (HANDOFF §9.17):
  - If the wardrobe holds the product, only its `color` and `size` change; its position, `source` and ownership stay the same.
  - If it was only tried on this session (a temporary garment), that same record joins the wardrobe, first.
  - Otherwise a new record goes first: `source: 'shopping_plaza'`, `merchantId` = the product's store (`data.storeOf`), not owned, with the colour and size. The item appears first in 个人衣橱 without ✓ and without a source label.

**Overlays.** Every sheet closes via ×, scrim tap or Esc.
- 「选择颜色」: one option per colour (swatch, name, radio). The sub-line is 「实拍图展示颜色」 for the first colour and 「有货 · 演示原型仅展示主色实拍图」 for the others. Picking applies the colour (same as the swatch) and closes the sheet.
- 「尺码指南」 **[demo]**: the same table and fixed recommendation for every product.
  - Tip when the avatar is `ready`: sparkle icon + `根据你的数字分身（身高 165cm · 胸围 84cm），推荐 M 码，宽松版型。` with 「M 码」 in bold. Otherwise: info icon + 「创建数字分身后，可根据你的身材自动推荐尺码。」.
  - Table headers 「尺码」「胸围」「衣长」「肩宽」「袖长」. Rows: XS 88/64/38/54, S 92/66/39/55, M 96/68/40/56, L 100/70/41/57. The row matching the selected size is highlighted.
  - Note 「单位：cm，平铺测量，误差 ±1–2cm。」.
- `商品评价 ({reviews})` **[demo]**: summary with `rating`, 「★★★★★」 and `98% 买家认为「尺码合适」`. Then three hard-coded reviews from the `reviews` array in 05-product.js (masked name, stars, text, `size · colour`). Note 「演示数据」.
- 加入衣橱 result sheet:
  - Title 「已加入衣橱」 (new entry) or 「已在你的衣橱中」 (existing entry).
  - A `.mini` row: image, name, `{colour name} / {size}`, price.
  - Lead `已保存到「个人衣橱」，可随时在试衣间搭配试穿。` (new) or 「已更新为当前选择的颜色和尺码。」 (existing).
  - 「去衣橱看看」 → contextual tab jump `app.go('wardrobe')` → 个人衣橱 root at `/wardrobe` (fade; pop when already in that tab). The plaza stack keeps the product page.
  - 「立即购买」 → sets `s.cart = {p, color, size, qty: 1}` (replacing any earlier cart), then pushes `checkout` → `/plaza/p/:pid/checkout`.
  - Closing the sheet keeps the wardrobe change.

**Data.**
- Reads: `data.byId[pid]` (name, brand, rating, reviews, price, desc, colors, sizes, defaultSize, gallery, galleryThumbs, small, img.card, cat), `data.storeOf` (the brand row's logo and store), `data.fitCatsAll`, `data.slotOf`, `data.renders` (through `pickRender`), `s.selections`, `s.favorites`, `s.avatar.status`, `s.wardrobe` and the temporary garments (through `VT.garments`: 已拥有, 加入衣橱, 试穿上身).
- For knit-cardigan, straight-jeans and brown-blazer the gallery's second image is the plaza model photo (`assets/plaza/models/…`), shown with `contain` like the other model shots. maxi-skirt has one image, its model photo.
- Writes: `s.history`, `s.selections[pid]`, `s.favorites[pid]`, `s.wardrobe`, the temporary garments (试穿上身), `s.cart`, `s.fit.outfit`, `s.fit.cat`, `s.avatar.status/demo`.
- Kept UI state: `.pd-scroll` (`data-keep-scroll="pd"`). A missing `pid` defaults to 'striped-shirt'.

**States & edge cases.**
- Browsing history (`mount` calls `VT.store.h.viewed`).
  - It records every time the screen mounts: first push, `open`, popping back from checkout, and returning to its tab. It skips in-place `app.refresh()`, but no product action refreshes, so in practice it records on every display.
  - It drops older entries for the same pid, prepends `{p, t: '今天 HH:MM'}` and keeps 30 entries.
  - **[demo]** The label is stored as text, so it still says 「今天」 on later days.
- An unknown `pid` renders the striped shirt (05-product.js:22), but the actions look up `data.byId[pid]` and throw (verified by tapping a size). `mount` still writes the unknown id into history, and 我的 counts it (10-profile.js:75).
- A product with one image: tapping the hero just re-shows the same image, and there is one thumb.
- The brand row never stacks a second copy of a store page: opened from a store page, it returns to it (`plaza › store › product` → `plaza › store`). From any other screen it pushes the store page on that tab, e.g. `/wardrobe/p/:pid/s/:sid`.
- The size table never matches shoe sizes or 均码. The tip ignores `s.body` and `s.avatarPrefs.sizeTips`.
- Every product shows the same reviews (they mention 「蓝色条纹」), and the summary is always five stars.
- 去衣橱看看 resets neither `s.wardrobeCat` nor the wardrobe scroll. If 个人衣橱 is filtered to another category, the new item is hidden (verified).
- Prototype-only behaviour: the share text says 「原型」, and `VT.framed` (embedded preview) forces the clipboard path. Drop both in the web build.

**Components used.** `VT.ui.backBtn`, `VT.ui.heart` + global `fav`, `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.price`, `VT.ui.nl2br`, `VT.ui.swatchStyle`, `.btn`, `app.sheet`, `.opt-list`/`.opt`/`.opt-sw`/`.radio`, `.guide-tip`, `.guide-table`, `.rv-sum`/`.rv-list`, `.mini`, `.sheet-actions`, `.sheet-lead`, `.sheet-note`, `app.toast`, `app.later`, `VT.store.h.selection/isFav/viewed`, `VT.fitting.pickRender`, `VT.plaza.logo` (`.st-logo--pd`, 20 px), `VT.storefront.open` (the store page), `VT.ui.ownMark` (`own-mark--inline`), `VT.garments`. Exports `VT.tryOn(app, refs)` (product ids, or `up:{uid}` for a photo), which is also used by 个人衣橱 (「立即试穿」, queue 「去试衣间」, 「一键试穿这套」, 「再次试穿」), AI造型师 (「去试衣间试穿」) and 我的收藏 (「去试衣间试穿」).

**Acceptance checks.** `plaza → product details`, `secondary screen hides tab bar`, `AC6: back from product → plaza`, `加入衣橱 → 个人衣橱 tab`, `加入衣橱: top of the wardrobe, from 购物广场 with its store, not owned: no ✓, no source label`, `plaza tab returns to its own history (product page)`, `立即购买 → checkout`, `浏览记录 includes viewed products`, `look → 首页 with outfit` (via `VT.tryOn`), `honest toast for garments without imagery` (via `VT.tryOn`), `a product tried on from elsewhere joins the rail: temporary, from 购物广场, not owned, not in the wardrobe` (via `VT.tryOn`), `product brand opens its store page` (the first 购物广场 card, knit-cardigan → ZARA's page: 购物广场 › 商品详情 › 商家店铺), `store page → product; its brand row returns to the same store page` (商家店铺, §27), `商品详情 says 已拥有 only for a product 本人 owns`.


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
- `created`: `YYYY-MM-DD hh:mm:ss`. `carrier`: 「待分配」. `isNew: true` is set but never read. `avatarId`: the active person, whose wardrobe the garment goes to; they own it once it is received (确认收货).
- Store side effects:
  - `orders.unshift(order)`, `currentOrder = id`, `cart = null`.
  - Wardrobe (`VT.garments.purchase`, HANDOFF §9.17): if the active person doesn't have the product, a new record goes first (`source: 'shopping_plaza'`, colour and size, **not owned** until 确认收货); a temporary try-on of it is the record that joins. If the wardrobe holds it, nothing changes: it stays owned or not, and colour and size are not updated.

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
  - Also used by 我的订单 `orderlist` (「去支付」 on 待付款 cards) and 订单详情 `orders` (the 「立即支付」 pay bar), both through `orderActions().paynow` (09-orders.js:66–81). There it is called with `payment: o.payment`, `amount: o.paid` and cancelMsg `已取消支付，订单仍在「待付款」`.
    - `onPaid` sets status 0, progress 1 and eta 「3 天内」, and adds a logistics line.
    - `onView` closes the layer and refreshes in place. `onShop` calls `app.go('plaza')`.

**Data.**
- Reads:
  - `s.cart`, with fallback `{p:'striped-shirt', color:'blue', size:'M', qty:1}`.
  - `s.checkout.{address, shipping, payment, agree}` (defaults `a1` / `standard` / `alipay` / `true`).
  - Addresses through `VT.store.h.addresses/address`: falls back to `data.addresses`, and resolves the stored id, then the default, then the first address.
  - `data.byId`, `data.shippingOptions`, `data.payments`.
- Writes: `s.cart`, `s.selections[pid]`, `s.checkout.*`, `s.orders`, `s.currentOrder`, `s.wardrobe` (and the temporary garments, when a try-on joins it).
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

**Acceptance checks.** `立即购买 → checkout`, `checkout address sheet lists address book`, `pay → 订单详情 (in 我的 → 我的订单)`, `new order 待发货`, `加入衣橱 twice, then bought: one record, still not owned (until 确认收货)`, `order details → back → 我的订单`, `我的订单 → back → 我的`, `finished checkout removed from plaza history`, `去支付 moves order out of 待付款` (reuses `VT.pay`).


### 10. 商家消息 · `messages`

**Route** `/plaza/messages` (proposed: HANDOFF §8, §13.1 #11) · **Type** secondary, parent 购物广场 · **Prototype** `js/screens/14-messages.js`, `css/screens/12-messages.css`; the 「消息通知」 sheet is `notices()` in `js/screens/04-plaza.js`; chats seed `storeChatSeed` in `js/data.js` · **Design ref** none: the screen was added after the mockups (514de38), so the prototype is the only reference.

**Purpose.** The user's conversations with stores, newest first, under a row that opens the platform notices. Every store answer is scripted **[demo]**.

**Layout (top → bottom).**
- Sub-header (`VT.ui.subHead('商家消息')`): back button (aria 「返回」) and the centred title 「商家消息」. No tab bar.
- Scroll (`.sub-scroll.msg-scroll`, `data-keep-scroll="msg"`):
  - System row (a button, card background, radius 16, padding 12): a 44 px round bell icon; 「消息通知」 (bold) with the time 「10 分钟前」 on the right; below, 「心愿单降价提醒、订单物流与 AI 造型师推荐」 on one line.
  - Heading 「商家」.
  - One row per store chat that has at least one message, newest activity first (gap 8). Each row has the same card look and two buttons. The row itself (`.msg-row`) shows the store's full name (bold, ellipsis) with the last message's time on the right, and the last message on one line (ellipsis), prefixed 「我：」 when the user sent it; unread rows end with sr-only 「，{n} 条未读」. On top of its left end sits the store's 44 px logo as a separate button (`.msg-shop`, aria 「查看店铺 {full name}」), with, when the chat has unread messages, a red count badge at its top-right (`.msg-dot`, 18 px, `#C8473D`).
  - Empty state, when no chat has a message: a chat icon, 「还没有和商家的聊天」 and a ghost button 「去购物广场逛逛」.
  - Note 「演示对话，回复为预设内容」.

**Interactions.**
- Back → pop to 购物广场 `/plaza`. A deep link to `/plaza/messages` gets the same parent.
- 「消息通知」 row → 「消息通知」 sheet.
- A store row → that store's chat thread sheet. Opening it marks the chat read at once: its badge and the 购物广场 badge drop.
- A store's logo → that store's page (`VT.storefront.open`; push `store` → `/plaza/messages/s/:sid`, proposed; 商家店铺, §27). Back returns here.
- 「去购物广场逛逛」 → back.

**Overlays.** Both sheets close via ×, scrim tap, Esc or back.
- **「消息通知」 sheet** (`VT.plaza.notices(app)`; the bell on 购物广场 used to open it). Three static notices, each a button with an icon, bold title, line and time:
  - 「心愿单降价提醒」 · `你关注的「条纹亚麻衬衫」本周可用 ¥20 优惠券` · 「10 分钟前」 → push `product` `{pid:'striped-shirt'}` on top of this screen → `/plaza/messages/p/striped-shirt`.
  - 「订单运输中」 · 「你的订单预计 7月18日 送达，点击查看物流」 · 「今天 08:32」 → `app.open('orders', {oid: data.seedOrder.id}, {anim:'fade'})`. This switches to 我的 and replaces its stack with 我的 › 我的订单 (`filter:'all'`) › 订单详情, at `/me/orders/o/VT20260715092418`. The copy says 物流, but it opens 订单详情, not 物流跟踪 (HANDOFF §13.2 #17).
  - 「AI 造型师」 · 「为你准备了 3 套朋友聚会穿搭，快去看看」 · 「昨天」 → contextual tab jump to `stylist` (its root, fade) → `/stylist`.
- **Chat thread sheet** (`VT.storeChat.open(app, storeId)`, a full-height sheet). Also opened by 「联系商家」 on 商家店铺 (§27), over that page, without navigating.
  - Header: one button (`.mchat-who`, aria 「查看店铺 {full name}」) holding the store's logo, its full name and a ›; the sheet keeps the plain full name as its accessible name. It opens the store's page with `chat: '1'`, so back from that page re-opens this chat. Over that store's own page it just closes the chat.
  - Thread (`.mchat`): the stored messages as bubbles, the store's on the left and the user's on the right. A store with no messages shows one greeting bubble, 「您好，欢迎光临 {full name}，请问有什么可以帮您？」, which is stored only once the user writes.
  - Quick-question chips 「什么时候发货？」「尺码怎么选？」「有优惠券吗？」; an input (placeholder 「输入消息…」, aria 「输入消息」; Enter sends, not while composing) with a dark 「发送」 button; the note 「演示对话，回复为预设内容」.
  - Opening sets the chat's `unread` to 0 and updates 商家消息 (when it is the screen underneath) or the 购物广场 badge.
  - Unsent text is kept per store while the app runs: closing the sheet, or visiting the store from its header, keeps it in the input for next time. A reload loses it.
  - Sending (a chip, or the trimmed input; blank does nothing): the user's bubble appears at once and the message is stored with the time `HH:mm`. If the chat was empty, the greeting is stored first. 900 ms later the store's reply (HANDOFF §9.14) is stored and appended. If the sheet was closed in the meantime, the reply raises the chat's `unread` by 1 and the badges show it. Each message moves the chat to the top of the list. The thread scrolls to the bottom on open and after each bubble.

**Data.** Reads `s.storeChats` and `data.storeById`. Writes `s.storeChats[storeId]` = `{ unread, at, msgs: [{ me, text, t }] }`: `unread` (opening, replies), `msgs` (sent and received messages, with `t` the display time) and `at` (last activity: `Date.now()` for new messages, small numbers in the seed; only used to order the list). Persisted. Keep scroll `msg`. The unsent text per store (`drafts` in `14-messages.js`) is in memory only.

Seed (`data.storeChatSeed`); the list shows ZARA, Mono Atelier, Forma and the 购物广场 badge reads 1:

| Store | `unread` | `at` | Messages (`t`) |
|---|---|---|---|
| ZARA | 1 | 3 | store 「10:24」: 「您关注的店铺上新啦！2024 秋冬系列已上线，关注店铺的顾客可领取 ¥30 新品券～」 |
| Mono Atelier | 0 | 2 | user 「昨天」: 「黑色西装外套还有 S 码吗？」 · store 「昨天」: 「亲，黑色 S 码有现货，下单后 48 小时内发货哦～」 |
| Forma | 0 | 1 | store 「7月13日」: 「您的小白板鞋已送达，穿着还合适吗？有任何问题随时联系我们～」 |

**States & edge cases.**
- The empty state can't appear with the seed: three chats exist and nothing deletes one.
- Times are stored as display text. A message sent today keeps saying `HH:mm` on later days, and the seed's 「10:24」 / 「昨天」 / 「7月13日」 never move (HANDOFF §13.2 #38).
- Every store answers from the same keyword table **[demo]**. The ¥30 新品券 in the ZARA message and the coupon reply isn't applied anywhere; checkout keeps its flat ¥20 coupon.
- A reply that lands after the user left this screen is still stored, and counts as unread when the thread sheet was closed.
- The 「消息通知」 row has no unread state, and its time is fixed.
- 订单详情's 「联系商家」 is a different, unstored chat with other scripted answers. It never shows up here (HANDOFF §13.2 #36).

**Components used.** `VT.ui.subHead`, `VT.plaza.logo` (`.st-logo--msg`, 44 px; `.st-logo--chat` in the sheet header), `VT.icon` (`bell`, `chat-dots`, `chevron-right`), `.msg-row`/`.msg-sys`/`.msg-face`/`.msg-shop`/`.msg-dot`/`.msg-main`/`.msg-top`, `.msg-h`, `.ol-empty`, `.sheet-note`, `app.sheet` with `full: true`, `.mchat` with `.b.me`/`.b.them`, `.mchat-who`, `.or-quick` chips, `.mchat-input`, `app.later`, `app.refresh`, `VT.storefront.open`. Exports `VT.storeChat = { open, unread }`.

**Acceptance checks.** `plaza: chat icon opens 商家消息` (the rows are ZARA, Mono Atelier, Forma, with one unread badge) · `商家消息: a store avatar opens its store page; back returns` (Mono Atelier) · `plaza: store chat replies and clears unread` (ZARA, chip 「什么时候发货？」) · `chat header opens the store page; back reopens the same chat with its draft` (「有 M 码吗」 typed, not sent) · `plaza: back from 商家消息 → 购物广场`.


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
  - receive, after confirming: `status 4`, `progress 4`, `steps[3] = {label:'已签收', time: now}`, logistics 「你已确认收货，交易完成」 prepended; the bought garment becomes owned (✓) for the person the order was for (`VT.garments.received`: `order.avatarId`, or 本人 for the seed orders, which have none; a record deleted meanwhile comes back as an owned `shopping_plaza` garment; the source of an existing one stays; HANDOFF §9.17); re-render; toast 「已确认收货，已标记为已拥有」 (check icon).

**Overlays.**
- Cancel dialog: 「取消这个订单？」 / 「未付款订单取消后不可恢复。」 / 「再想想」 · 「取消订单」.
- Receive dialog: 「确认收货？」 / 「请确认已收到商品且无质量问题。」 line break 「确认后订单将完成，这件衣服会在衣橱中标记为已拥有（演示）。」 / 「取消」 · 「确认收货」.
- Both are `app.dialog`: centred card over a scrim; tapping the scrim does nothing; Esc = cancel; confirm button focused.
- Pay layer `VT.pay` (`payLayer` in `js/screens/08-checkout.js`, shared with checkout), bottom panel over a scrim, four states: 「正在调起{支付宝|微信支付|…}…」 spinner 900 ms (150 ms with reduced motion) → confirm: 「{name} · 模拟收银台」, amount, 「演示原型不会产生真实扣款」, 「确认支付」 / 「取消」 → 「支付处理中…」 900 ms (200 ms) → 「支付成功」, 「实付 ¥{amount} · 演示订单，未产生真实扣款」, 「查看订单」 / 「继续逛逛」. 「取消」 closes it and toasts the cancelMsg. Scrim tap does nothing; Esc closes it silently. All **[demo]**.

**Data.** Reads `orders`, `returns`, `data.orderFilters`, `data.orderStatus`, `data.byId` (image, brand). Writes `orders` (pay, receive, cancel), `currentOrder` (cancel) and, on receive, the wardrobe of the order's person. Filter rule `VT.store.h.inFilter`: unpaid = status −1 · toship = 0 · shipping = 1 or 2 · toreceive = 3 · aftersale = has `returns[oid]` (any status) · all = every order. A 已完成 order without a return only appears under 全部; an order with a return appears under its status filter and under 售后. Keep: filter (stack params), scrolls `ol-tabs` and `ol`.

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
- 「确认收货」 → receive dialog → re-render as 已完成 (button gone, tracker full, 4th step 已签收 + now); the garment is now owned (see 我的订单), toast 「已确认收货，已标记为已拥有」.

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

**Acceptance checks.** `pay → 订单详情 (in 我的 → 我的订单)` · `new order 待发货` · `order details → back → 我的订单` · `order details 运输中` · `订单详情 → 物流跟踪` · `物流跟踪 → back → 订单详情` · `订单详情 → 申请退换货` · `return submitted → back on details` · `merchant chat replies` · `order info sheet` · `确认收货 confirms ownership: the striped shirt is owned now (one record, source kept)`


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
- 「确认收货」 → receive dialog → re-render: 已完成, 「已签收，感谢你的购买」, 4th step 已签收 + current time, new top entry 「你已确认收货，交易完成」, button gone; the garment is now owned (see 我的订单); toast 「已确认收货，已标记为已拥有」.
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
- Add tile → native picker (`accept="image/*"`). Non-image → toast 「请选择图片文件」; decode failure → 「无法读取这张图片，请换一张」; otherwise `shrinkPhoto`: scaled so the longest side is at most 360 px (never upscaled), JPEG quality 0.78, stored as a Blob in IndexedDB (`VT.media.put`), its reference appended to the draft. Max 3 (the tile disappears at 3); no file-size limit. ✕ removes that photo and deletes it from the device.
- 「提交申请」: no reason → toast 「请选择申请原因」 (the only validation). Otherwise saves `returns[oid] = { type, reason, note (trimmed), photos, time: 'M月D日 HH:mm', stage: 1 }`, discards the draft, goes back one screen, toast 「{退货|换货}申请已提交（演示）」 (check icon). 订单详情 then shows 「已提交{type} · 等待商家处理」; the list shows 「 · 售后中」 and 「售后进度」.
- 「撤销申请」 → dialog → deletes the return and its evidence photos (from the device too), re-renders as an empty form (title back to 申请退换货), toast 「售后申请已撤销」.
- 「联系商家」 → merchant chat sheet (see 订单详情).

**Overlays.** Withdraw dialog: 「撤销售后申请？」 / 「撤销后可在有效期内重新申请。」 / 「再想想」 · 「撤销申请」. Merchant chat sheet (see 订单详情).

**Data.** Reads the order (same fallback), `data.byId[o.p]`, `returns[oid]`. Writes `returns[oid]` on submit; deletes it on withdraw. The draft per order id `{ type, reason, note, photos }` lives in memory (module `drafts`): it survives leaving and re-opening the form and tab switches, is lost on reload and is never persisted; the textarea also has `data-keep-value="rt-note"`. Keep scroll `rt`.
- Evidence photos are Blobs in IndexedDB from the moment they're picked (`js/media.js`, HANDOFF §9.16). The draft and the saved return hold references only, `photos: [{ media: key }]`, read through `VT.media.src`. They're never data URLs in `localStorage`.
  - A draft's photos stay on the device until the draft is sent. If it's never sent, they're deleted at the next start-up (keys nothing refers to).
  - 隐私与安全 → 清除已上传的照片 deletes the photos of the saved returns and of unsent drafts (`VT.orders.clearDraftPhotos`).
  - Photos saved as data URLs before 21 Oct 2026 move to IndexedDB at start-up. 售后进度 leaves out a photo that isn't loaded yet (the first render after start-up).

**States & edge cases.** The stage is set to 1 and never advances, so only 「提交申请」 is ever done and the stage ≥ 2 copy is unreachable **[demo]**. Seed: the 已完成 skirt order already has an exchange, so it opens in progress mode. 订单详情 offers this form for any paid order (also 待发货 and 运输中); the list only offers it for 已完成.

**Components used.** `VT.ui.subHead`, `.mini` (`.rt-mini`), `.co-sh-h` headings (from `08-checkout.css`), `.or-seg`, `.opt-list` / `.opt` / `.radio`, `textarea.field-area`, `.rt-photos` / `.rt-add` / `.rt-del`, `.rt-steps`, `.kv`, `.tr-acts`, `.sheet-note`, `app.dialog`, `VT.openChat`.

**Acceptance checks.** `订单详情 → 申请退换货` · `return evidence photo added` · `return submitted → back on details` · `头像, 售后凭证 and AI 造型师 photos stay on this device in IndexedDB, never in localStorage` · `头像, 售后凭证 and AI 造型师 photos load from IndexedDB after a reload` · `撤销申请 deletes its evidence photos`


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

**Orders created at checkout** (`createOrder` in `08-checkout.js`): id `VT` + `YYYYMMDDHHmmss`, added at the top, `shop` = the product's store full name (`data.storeOf(p).full`), status 0, progress 1, eta = delivery date, 4th step 预计送达 + that date, carrier 待分配, one entry 「订单已提交并完成支付（演示），等待商家发货」, `avatarId` = the active person. The seed orders have no `avatarId`: they are 本人's. 本人's striped shirt (VT20260715092418, 运输中) is in her wardrobe without ✓ until it is received; she already owns the sneakers (待收货) and the skirt (已完成).



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
    - Each tile shows the avatar's own image or a sample (`assets/people/upload-fullbody.webp` / `upload-portrait.webp`). A caption pill shows the label plus 「已上传」 or 「示例」. The tiles cannot be tapped.
      - 全身照: `VT.media.src(avatar.fullbody)`, which is the 正面全身 photo, or the first frame of a video.
      - 生活照: `VT.media.src(avatar.portrait)`, which is the 面部生活照 photo. A video avatar has none, so it shows the sample.
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
- 「更换照片」 → **push** the avatar upload screen `avatar` with `{from:'profile'}`, at `/me/avatar/upload`. It starts at 选择上传方式 (see the note at the end of this section). The task brief and acceptance check call this button 上传照片.
- 「重新生成」 → runs the generation layer in place (`VT.avatarGen.run(app)`, context `hub`), from the avatar's current materials.
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
- **Full-screen generation layer** (`.av-gen`, aria 「正在生成数字分身」). It runs the same simulated job as the upload screen's 生成建模 step **[demo]** (SCREENS.md 2, 「我的形象 → 「重新生成」」):
  - The 4-step progress at step 3, and 「正在重新生成数字分身」.
  - The indeterminate ring with 「{n}/5」 and the stage name, the preset figure, 「模拟进度 · 演示版未接入建模服务」 and the five stages.
  - Timing: **6400 ms** (1200 ms with reduced motion).
  - 「取消」, Esc and back all close it, toast 「已取消生成」 and store nothing.
  - **450 ms** after the last stage:
    - The store gets `avatar.status = 'ready'`, `generatedAt = Date.now()` and `demo = true`.
    - The progress moves to step 4, and the layer shows 「数字分身已更新」, the preset avatar labelled 「2D 形象预览 · 演示版」 and 「演示原型使用预设的数字分身形象，并非三维模型」.
  - Result buttons:
    - 「完成」 → the layer closes, 我的形象 re-renders, toast 「数字分身已更新」 (✓).
    - 「去首页试穿」 → **contextual tab jump** to 首页 (`app.go('fitting')`: the tab's root, with a fade). 我的 stays on 我的形象 and there is no toast.

**Data.**
- Reads `avatar.{status,fullbody,portrait,generatedAt}`, `body` (default `{ height: 165, weight: 48, size: 'M', shoe: '37' }`) and `avatarPrefs` (both default true). `avatar` and `body` are the **active avatar's** (a new avatar starts from the default body data); `avatarPrefs` are shared by all avatars.
- Writes `body`, `avatarPrefs.*`, and through generation `avatar.status`, `avatar.generatedAt` and `avatar.demo`.
- **No other screen reads `body` or `avatarPrefs`.** 商品详情's 尺码指南 hard-codes 「身高 165cm · 胸围 84cm」 → M.

**States & edge cases.**
- `status === 'ready'`: the chip shows ✓ 「已生成」 in green. The status line is 「更新于 {M}月{D}日 {HH}:{mm}」 when `generatedAt` is set (local time; month and day not zero-padded, time zero-padded, e.g. 「更新于 10月9日 08:53」). Without it the line is 「使用示例照片生成」; this happens when the avatar became ready via 跳过, 启动页 登录, or 商品详情 试穿上身.
- Any other status (`none` or `stale`): the chip shows a neutral 「示例形象」 and the line is 「尚未用你的照片生成」. In normal use, `none` can only be reached by a deep link, because setup always ends with `ready`. The upload flow replaces an avatar's photos only when a generation finishes, so `stale` now comes only from data saved before 21 Oct 2026.
- After 重新生成, only the chip and the status line change. The hero figure and the photo tiles stay the same.
- The photo tiles follow uploads, not status. For example, after 清除已上传的照片 the status is still `ready` but both tiles show 「示例」.

**Components used.** `VT.ui.subHead`, `.ah-hero` / `.ah-plate` / `.ah-chip` / `.ah-shots` / `.ah-acts` / `.ah-fields`, `VT.ui.row`, `VT.ui.toggleRow`, `.btn--dark.btn--sm`, `.btn--ghost` / `.btn--dark .btn--lg`, `app.sheet` + `.field` + `.chip` in `.ad-tags`, `VT.avatarGen.run`, `app.layer`.

**Acceptance checks.** `我的 → 我的形象`, `我的形象 → back → 我的`, `我的形象 → 上传照片`, `generate → back to 我的形象`, `重新生成 stays on 我的形象`, `avatar preference toggle`.

**See also: the upload screen at `/me/avatar/upload`.** This is `avatar` with `from: 'profile'`. Its full spec is in the launch flow's 上传照片 / 视频 section (`/welcome/avatar`). Seen from 我的形象, it differs from first launch in four ways:
1. There is no 「跳过」.
2. 创建完成 shows 「去首页试穿」 and 「完成」 instead of 「进入虚拟试衣间」.
3. 「完成」 pops back to `/me/avatar` and shows 「数字分身已更新」.
4. 「去首页试穿」 drops the upload screen first, so 我的 returns to 我的形象 (HANDOFF §13.2 #5).

The avatar keeps its current photos until a generation finishes. Leaving midway leaves it as it was, and the unfinished drafts are deleted.


### 16. 我的资料 · `editprofile`

**Route** `/me/profile` (also `/me/settings/profile` via 设置 → 个人资料) · **Type** secondary · **Prototype** `js/screens/11-account.js` (L24–70), `css/screens/11-account.css`; crop helper `VT.profile.squarePhoto` in `js/screens/10-profile.js` · **Design ref** none

**Purpose.** Edit nickname, signature, gender, birthday and profile picture. Nothing is stored until 「保存」.

**Layout (top → bottom).**
- Header 「我的资料」 (fixed). The same screen has other names elsewhere: the 我的 row says 「我的资料」, the 设置 row says 「个人资料」, the 我的 header button's aria-label is 「编辑个人资料：{昵称}」, and the simulator list says 「编辑资料」.
- Scroll (`data-keep-scroll="ep"`):
  - Round profile picture with a dark camera badge. The whole circle is a `<label>` (title 「更换头像」) around a hidden `input[type=file][accept="image/*"]` (aria 「更换头像」). Hint below: 「点击更换头像」. The picture is chosen in this order: draft photo → `profile.photo` → 本人's `avatar.portrait` → `assets/people/chat-user.webp` (the first three read through `VT.media.src`).
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
- Picture → the picked file is centre-cropped to a **320×320 JPEG (quality 0.82)** and the preview updates. The JPEG goes to IndexedDB at once (`VT.media.put`), but `profile.photo` points at it only on 保存. Any failure, including a non-image file, shows the toast 「无法读取这张图片，请换一张」. There is no file-size limit.
- 「保存」 → the name is trimmed. If it is empty: toast 「昵称不能为空」 and stay. Otherwise `profile` gets the draft (name and bio trimmed, gender, birthday, photo), the draft is dropped, the screen goes **back** to its opener (我的 or 设置), and the toast 「资料已保存」 (✓) shows.
- Back button → discards the draft without asking.

**Overlays.** None (only the native file picker).

**Data.**
- Reads `profile.{name,bio,gender,birthday,phone,photo}` and `avatar.portrait` (photo fallback).
- 保存 writes `profile.name|bio|gender|birthday|photo`. `profile.phone` can never be edited.
- `photo` is a reference `{ media: key }` to a Blob in IndexedDB (`js/media.js`, HANDOFF §9.16), never a data URL in `localStorage`.
  - A photo picked here and then replaced by another pick, or left behind by the back button, is deleted from the device.
  - 保存 deletes the photo it replaces.
- The draft is one module-level copy of `profile`, except that its `photo` is `null` until a photo is picked here. 保存 writes `photo` only when one was picked. It is created at first render and cleared on back or save. If the screen is left any other way (e.g. a tab switch) the draft survives and is shown again on return. `data-keep-value`: `ep-name`, `ep-bio`.
- 我的 shows the new name, signature and photo after saving. An empty signature shows as 「编辑个性签名」 there.

**States & edge cases.**
- Defaults (`store.js`): 「小橙子」 / 「开启更美的每一天」 / 女 / 1998-06-18 / 「138****8888」.
- The phone number and the 「已绑定」 tag are static **[demo]**.
- Birthday has no range check and can be cleared. Signature may be empty.
- The 我的 header photo picker handles the same mistake differently: for a non-image it shows 「请选择图片文件（JPG / PNG 等）」 (10-profile.js:42). Pick one message for both.

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
- **The empty state can never be shown.** Deleting the last address empties the store, but the screen then shows the two seed addresses again. They are not stored, so 设为默认 on them only sets `checkout.address` and 删除 only shows its toast. The next 保存 re-inserts both seeds plus the new address (`11-account.js:114`).
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
- 「清除已上传的照片」 → dialog. On confirm:
  - It deletes from the device (IndexedDB, `VT.media`) every photo the state refers to (`VT.media.keysInState`): the avatar photos and video frames, the profile photo, the evidence photos and the photos sent to AI 造型师. It also deletes the evidence photos of unsent 申请退换货 drafts (`VT.orders.clearDraftPhotos`).
  - It sets `avatar.fullbody`, `avatar.portrait` and `avatar.materials` (of every digital avatar) and `profile.photo` to `null`.
  - It empties every `returns[oid].photos` and removes the photo messages from the AI 造型师 chat (`s.chat` entries with `img`). Toast 「已清除本机照片」 (✓).
  - `avatar.status` does not change. Wardrobe garment uploads are not touched. This screen does not re-render (nothing on it changes).
  - The dialog text and the row's sub line don't name the AI 造型师 photos yet. That copy is for the prototype owners to decide.
- 「导出我的数据」 → toast 「演示版暂不支持导出数据」 **[demo]**.
- 「注销账号」 → info dialog only; nothing changes **[demo]**.

**Overlays.**
- Dialog 「清除已上传的照片？」. Text: 「将删除本机保存的全身照、生活照、头像和售后凭证照片。」 + line break + 「数字分身会使用示例形象。」. Buttons 「取消」 / 「清除」.
- Dialog 「注销账号」. Text: 「演示原型不会注销真实账号。」 + line break + 「如需清空演示数据，请使用「设置 → 重置演示数据」。」. One button 「知道了」 **[demo]**.

**Data.**
- Reads `profile.phone`, `privacy.personalized` and `privacy.wardrobeAI`.
- Writes those switches, the cleared photo fields and `s.chat` (without its photo messages). AI 造型师 reads `privacy.wardrobeAI`: off, its three plan replies say it can't see the clothes (HANDOFF §9.7). Nothing else reads `privacy.*`.

**States & edge cases.**
- After clearing photos: 我的形象 tiles show 「示例」, and 我的 / 我的资料 fall back to the demo portrait. 售后进度 shows no evidence photos, an unsent return draft has none left, and the AI 造型师 thread no longer has the photos the user sent.

**Components used.** `VT.ui.row` (including `act: 'toast'` + `data-msg`), `VT.ui.toggleRow`, `group()`, `app.dialog`.

**Acceptance checks.** `隐私与安全 → 清除已上传的照片 deletes the avatar media from the device` · `清除已上传的照片 also deletes the 头像, 售后凭证 (sent or not) and AI 造型师 photos`


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
  - Each message adds a user bubble, and a reply arrives **800 ms** later. Replies are the scripted answers in `openChat`'s `answers` map; any other text gets the generic line (09-orders.js:434) **[demo]**.
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
  - 单品: cards in 2 columns, each with the image (`img.card`; small products are contained with padding), a filled heart top-right, ✓ top-left when the active person owns the product (`own-mark--l`, 18 px, 9 px in), the `cardName` and the price. The whole card is a button (aria 「查看 <name>，¥<price>」, followed by 「，已拥有」 when owned).
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
- Reads: `s.favorites` (`{pid: bool}`), `s.savedLooks`, `data.byId`, `data.lookById`, and the active person's wardrobe for ✓ (`VT.garments.ownsProduct`). Writes: `s.favorites`.
- 单品 order is first-favourited first: the seed `data.seedFavorites` comes first, then new favourites. Unfavouriting sets `false` instead of deleting the key, so a re-favourited product goes back to its old place.
- 造型 order: newest saved first.
- Seed: 8 products and 0 looks. Scroll kept: `fv`.

**States & edge cases.**
- 单品 empty: a heart icon, 「还没有收藏的单品」 and the ghost button 「去购物广场逛逛」 → contextual jump to 购物广场 `/plaza` (the 我的 stack keeps 我的收藏).
- 造型 empty: a sparkle icon, 「在 AI 造型师里点 ♡ 保存造型」 and the ghost button 「去问问 AI 造型师」 → contextual jump to `/stylist`.
- Hearts on 购物广场 and 商品详情 feed this list; hearts in 个人衣橱 do not. A heart (收藏) never means owned: only ✓ does.
- The 我的 count is `favCount` = hearted products + saved looks.

**Components used.** `VT.ui.subHead`, `.seg`, `VT.ui.heart`, `VT.ui.ownMark`, `VT.ui.price`, `VT.ui.img`, `.btn--dark .btn--sm`, `.btn--ghost`, `.ol-empty`, `.sub-scroll`, global `nav` action, `VT.tryOn`, `app.toast`.

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
- 商品详情 writes a record every time it opens (`VT.store.h.viewed`, `store.js:251-255`): it adds `{p, t:'今天 HH:MM'}` at the front, removes older entries for the same product and keeps 30.
- Groups use the first word of `t`, in list order. The time part is never shown.
- Seed `data.seedHistory`: 6 entries (今天 ×2, 昨天 ×2, 7月14日 ×2). Scroll kept: `hs`. 我的 shows `history.length`.

**States & edge cases.**
- Empty: a history icon, 「暂无浏览记录」 and the ghost button 「去购物广场逛逛」 → contextual jump to `/plaza`. 「清空」 is hidden.
- Day labels are stored text, not dates, so a view saved as 「今天」 still reads 「今天」 on later days (`store.js:253`). Suggested fix: the web build stores a timestamp and formats 今天 / 昨天 / M月D日 when rendering (to confirm).

**Components used.** `VT.ui.subHead` with its right action `.sub-act`, `.set-group`, `.set-h`, `.set-card`, `.set-main`/`.set-label`/`.set-sub`, `VT.ui.price`, `VT.ui.img`, `.ol-empty`, global `nav` action, `app.dialog`, `app.toast`.

**Acceptance checks.** `浏览记录 includes viewed products`


## Collections and moments (from 个人衣橱)

Added with 个人衣橱 V2 (8bf9527, 20 Oct 2026). Both screens belong to the active person and sit on 个人衣橱's stack (the prototype's `PARENT`: `outfit: 'wardrobe'`, `moment: 'wardrobe'`). Their routes are a proposal (HANDOFF §8, §13.1 #20). The V2 mockup isn't in `reference/design/`, so the prototype is the only reference.

### 25. 搭配集详情 · `outfit`

**Route** `/wardrobe/sets/:id` (proposed: HANDOFF §8, §13.1 #20; prototype params `{ id, pick? }`) · **Type** secondary, parent 个人衣橱 · **Prototype** `js/screens/06-wardrobe.js` (`VT.screens.outfit`; its sheets are 个人衣橱's), `css/screens/06-wardrobe.css` · **Design ref** none in `reference/design/` (REPORT deviations 18–19)

**Purpose.** One collection (搭配集) of the active person: its cover and garments, to open each garment, edit the set, and try the whole set on in one go.

**Layout (top → bottom).** No tab bar.
- Header (`.sub-head`, fixed): back (aria 「返回」); centred, the collection's name (h1, 18 px / 900, one line, ellipsis) over 「{n} 件单品」 (11.5 px); a ⋯ button on the right (aria 「更多操作」, `aria-haspopup="dialog"`).
- Scroll (`.wr-od`, `data-keep-scroll="wr-od"`):
  - The cover at 4 : 3 (radius 16). The kit image is shown whole here (the 搭配集 list crops it to 16 : 10); without one, the collage of the first garments; for an empty collection, a hanger.
  - The garments (aria 「搭配集里的单品」): a 5-column grid of square tiles (gap 8, radius 12), in the collection's order. Each tile is a button (`aria-haspopup="dialog"`) with the garment's grid image (`img.square`, else `img.tile`, or the photo). 搭配集详情's tiles show ✓ (16 px, top-right, 5 px in; aria adds 「，已拥有」) on what the person owns. After them, a ＋ tile with a thin ring (aria 「编辑单品」).
  - With no garments: 「还没有单品，点「＋」从衣橱里挑选」 under the grid.
- Footer (`.sub-foot`): the full-width button 「一键试穿这套」 (`#342722`, white text), disabled while the collection is empty.

**Interactions.**
- Back → pop to 个人衣橱 as it was (its view and scroll kept). A deep link gets the same parent.
- A garment → the item sheet (§5), with 「从「{collection}」移出」 after 「加入搭配集」.
- ＋ → the 编辑单品 sheet (§5).
- ⋯ → the collection menu (§5): 重命名 · 编辑单品 · 分享 · 删除搭配集. After 删除搭配集 it goes back.
- 「一键试穿这套」 → `VT.tryOn` with every garment in the set's order, photos included (as `up:{uid}`): they go on the active avatar with the slot rules, and the app jumps to 首页 (§5, Try-on). 一键试穿这套 works whenever the set has garments, photos included. With none it toasts 「这个搭配集还没有可试穿的单品」 (the button is disabled then anyway).
- Opened by 「新建搭配集」 (`params.pick = '1'`), the screen opens 编辑单品 380 ms after the push, so the new set can be filled at once. It doesn't when the screen is restored (tab switch, back) or refreshed.

**Overlays.** The item sheet, 加入搭配集, the collection menu, the name sheet, 编辑单品, 添加衣物 (from an empty 编辑单品) and the 删除 dialogs, as described under 个人衣橱 (§5).

**Data.** Reads the active person's `s.collections` and `s.wardrobe` (a collection holds wardrobe uids; a uid whose garment was deleted is skipped). Writes that collection (rename, garments, delete) and, through the item sheet, what §5 lists. Keep scroll `wr-od`.

**States & edge cases.**
- An unknown id shows the person's first collection. With no collections at all, the screen is the sub-header 「搭配集」 over the empty state 「这个搭配集已不存在」 with a ghost 「返回」.
- Deleting a garment in the item sheet also takes it out of this collection (and every other one of that person).
- A kit cover is a fixed picture of the seed garments (a collage of the kit's shots): it doesn't change when the set is edited. Only sets without one draw their collage from their current garments.
- **[demo]** The seed collections hold 4 garments each (REPORT deviation 19).

**Components used.** `VT.ui.backBtn`, `.sub-head`, `.sub-foot`, `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.ownMark`, `.btn--xl.btn--block`, `app.sheet`, `app.dialog`, `app.toast`, `app.later`, `VT.tryOn`, `VT.garments`. Local: `.wr-od-*`, `.wr-cover*`, `.wr-cta`.

**Acceptance checks.** From the 个人衣橱 V2 block: `搭配集 → 搭配集详情 with its garments` (5 cards after 「春日出游」 joined; the second, 周末最爱, shows 4 garments) · `一键试穿这套 → 首页 wears the set` (knit-cardigan and straight-jeans in the outfit).


### 26. 穿搭瞬间 · `moment`

**Route** `/wardrobe/moments/:id` (proposed: HANDOFF §8, §13.1 #20; prototype params `{ id }`) · **Type** secondary, parent 个人衣橱 · **Prototype** `js/screens/06-wardrobe.js` (`VT.screens.moment`; `saveLook` for 首页's 保存造型), `css/screens/06-wardrobe.css`; seed photos in `assets/wardrobe/moments/` · **Design ref** none in `reference/design/`

**Purpose.** One saved look of the active person: the picture, when it was saved and the garments in it, to save, share or try on again. Private to the user (「仅自己可见」).

**Layout (top → bottom).** No tab bar.
- Sub-header 「穿搭瞬间」 (`VT.ui.subHead`): back, and a ⋯ button on the right (aria 「更多操作」, `aria-haspopup="dialog"`).
- Scroll (`.wr-mo`, `data-keep-scroll="wr-mo"`):
  - The picture at 2 : 3 (radius 18), drawn as in the gallery (a 首页 render whole on its backdrop's colour), with its heart at the top-right (44 px target; aria 「标记喜欢：{M月D日}的穿搭」 / 「取消喜欢：{M月D日}的穿搭」).
  - One line: 「{M月D日} 保存」 on the left, a lock and 「仅自己可见」 on the right.
  - When it has garments: the heading 「相关单品」 and a 3-column grid. Each garment is a button (aria 「查看商品详情：{name}」, followed by 「，已拥有」 when owned): a square thumbnail (`img.square`, else `img.tile`), the name on one line and, for a garment the render couldn't show, the tag 「暂无上身图」. 穿搭瞬间's 相关单品 show ✓ (16 px, top-right, 5 px in) on what the person owns (`VT.garments.ownsProduct`).
  - A note: 「首页数字分身的试穿画面（演示版使用示例模特）」 under a 首页 render, 「示例照片（演示版）」 under a seed photo **[demo]**.
- Footer (`.sub-foot`): two 51 px round buttons, 保存图片 (download icon) and 分享 (share icon), labelled by their aria-labels 「保存图片」 and 「分享」, then 「再次试穿」 filling the rest (`#342722`), disabled without garments.

**Interactions.**
- Back → pop to 个人衣橱, on its 穿搭瞬间 view.
- Heart → toggles `fav`, as in the gallery (pop animation, no toast).
- A garment → push `product` → `/wardrobe/moments/:id/p/:pid`.
- 保存图片 → downloads 「穿搭瞬间-{M月D日}」: a seed photo as it is (`.webp`; `.jpg` for a JPEG), a 首页 render drawn onto its backdrop's colour as an 800 × 1200 JPEG (quality 0.9; the figure 94 % of the height, standing on the bottom edge). Toast 「图片已开始下载」 (download icon), or 「无法保存这张图片」.
- 分享 → where the browser can share files, the native share sheet with that file, the title 「穿搭瞬间」 and the text 「我的穿搭瞬间 · {M月D日}」. Otherwise the text alone: native share, else the clipboard (「已复制，可粘贴分享」), else 「分享面板在此浏览器不可用」.
- 「再次试穿」 → `VT.tryOn` with the garments that are still in the catalogue → 首页 (§5, Try-on). Garments the person hasn't got become temporary garments of theirs (HANDOFF §9.17).
- ⋯ → a sheet titled 「{M月D日}」 with 「保存图片」 · 「分享」 · 「删除这张」 (red). 删除这张 → dialog 「删除这张穿搭瞬间？」 / 「删除后无法恢复。」 / 「取消」 · 「删除」; confirming deletes it, goes back to the gallery and toasts 「已删除」.

**How a 穿搭瞬间 is made.** 首页's 「保存造型」 (`VT.wardrobe.saveLook`, §3) adds one to the active person's `s.moments`, first:
- `src`: the image of the render 首页 shows (`pickRender(outfit).render`); `scene`: the backdrop (`fitScene`, default `taupe`); `at`: now; `fav`: false.
- `items`: the outfit's catalogue garments (product ids; photos are left out). With none, the garments the render itself wears, so an empty outfit saves base with basic-cami, straight-jeans and white-sneakers.
- `missing`: those of `items` the render doesn't show (`pickRender(outfit).missing`), shown as 「暂无上身图」.
- When the newest 穿搭瞬间 has the same `src`, `scene` and set of `items`, nothing is added (「这套造型已经保存过了」).
- Seed 穿搭瞬间 are photos: `src` only, no `scene` or `missing` (§5, Data).

**Data.** Reads the active person's `s.moments`, `data.byId`, and ownership through `VT.garments.ownsProduct`. Writes `fav` and deletes. No picture data is stored: a 穿搭瞬间 points to a seed image or a render image. Keep scroll `wr-mo`.

**States & edge cases.**
- An unknown id shows the person's newest 穿搭瞬间. With none, the screen is the sub-header 「穿搭瞬间」 over 「这张穿搭瞬间已不存在」 with a ghost 「返回」.
- The garments are product ids, not wardrobe entries: they stay listed whether or not the person still has them, and ✓ follows the current ownership.
- **[demo]** Every render shows the sample model, so saved looks differ only in garments and backdrop. The seed photos are crops of the mockup; their garments are the catalogue items closest to what they show.

**Components used.** `VT.ui.subHead`, `VT.ui.iconBtn`, `VT.ui.img`, `VT.ui.ownMark`, `.heart-btn` (+`.pop`), `.sheet-note`, `.btn--xl`, `app.sheet`, `app.dialog`, `app.toast`, `app.later`, `VT.tryOn`, `VT.garments`. Local: `.wr-mo-*`, `.wr-photo`, `.wr-private`, `.wr-round`, `.wr-cta`, `.wr-menu-row`.

**Acceptance checks.** From the 个人衣橱 V2 block: `首页 保存造型 → 本人's 穿搭瞬间, newest first` · `穿搭瞬间 detail: photo, date, 仅自己可见, related garments, 再次试穿` (the second 穿搭瞬间 in the gallery).


## Store pages (from 购物广场, 商品详情 and 商家消息)

### 27. 商家店铺 · `store`

**Route** `/plaza/s/:sid` (proposed: HANDOFF §8, §13.1 #20; prototype params `{ sid, cat?, chat? }`); also after any 商品详情 (`…/p/:pid/s/:sid`) and after 商家消息 (`/plaza/messages/s/:sid`) · **Type** secondary, parent 购物广场 · **Prototype** `js/screens/15-store.js`, `css/screens/13-store.css`; the logo, banner, card, 关注 and the store's products come from `js/screens/04-plaza.js` (`VT.plaza`); store data in `js/data.js` (`stores`) · **Design ref** `reference/design/screens/04_plaza_store_v2.webp`, its second phone (REPORT deviations 31–36)

**Purpose.** A store's own page (66f648a): who it is, its campaign, introduction and collections, and everything it sells, with 关注 (the user's favourite-store list, the same one as on 购物广场) and 联系商家 (its chat on 商家消息).

**Layout (top → bottom).** No tab bar.
- Top bar (fixed, 88 px including the status bar): back (aria 「返回」) on the left, share (aria 「分享店铺」) on the right. No title.
- Scroll (`.sf-scroll`, `data-keep-scroll="sf"`, side padding 19.4 / 19.9 px):
  - The store: its 64 px logo (`VT.plaza.logo`: the monogram, or ZARA's serif wordmark); the `name` as h1 (19 px / 800, ellipsis), the tagline, and 「在售 {n} 件 · 店铺评分 {rating}」 (rating with one decimal; no follower count, REPORT deviation 31). On the right, two stacked 84 × 30 px pills: 「＋ 关注」 (dark) or 「✓ 已关注」 (light), with `aria-pressed`, and 「联系商家」 (white, outlined, chat icon).
  - The store's banner 16 px below: the same banner as on 购物广场 (§4), without 「进入店铺」, and not a button.
  - The introduction (`intro`, 11.6 px, at most three lines) with a ›: one button (sr-only 「，查看品牌介绍」) → 品牌介绍 sheet.
  - Only for a store with `collections` (ZARA): the heading 「当季精选」 and a sideways row (`data-keep-scroll="sf-cols"`) of 111 px cards: a 1.6 : 1 photo, the name (bold) and a sub-line: 秋冬外套系列 · 质感廓形 从容日常; 针织毛衣系列 · 柔软舒适 百搭实穿; 牛仔系列 · 经典重塑 自在穿着. No 「查看全部」 (REPORT deviation 33).
  - The heading 「全部商品」, a chip row (`role="tablist"` aria 「商品分类」, `data-keep-scroll="sf-chips"`) with 「全部」 and only the 购物广场 categories the store sells (ZARA: 全部 · 下装 · 外套, REPORT deviation 34; Forma: 全部 · 上衣 · 外套 · 鞋包 · 配饰), then the store's products in `data.plazaOrder` order in 购物广场's two-column grid with the same cards (heart, ✓ when the person owns it, colour dots). Every card image loads lazily.
  - The note 「店铺介绍、商品与评分均为演示数据」 **[demo]**.

**Interactions.**
- Back → pop. From 购物广场 that is the plaza root, with its chosen store and chip as they were. When the page was opened from a chat's header (`chat: '1'`) and no sheet is open, back also re-opens that store's chat sheet, with its history and unsent text.
- Share → the native share sheet with the title = the full name and the text 「{full name} · {tagline} — 来自「全新的购物体验」原型」; else the clipboard and 「店铺信息已复制，可粘贴分享」; else 「分享面板在此浏览器不可用」. The text says 「原型」, like 商品详情's (see there).
- 「关注」 / 「已关注」 → `VT.plaza.toggleFav`, the same list as 购物广场's bar (`s.storeFavs`, HANDOFF §9.14): following puts the store first; unfollowing removes it and sends 购物广场 back to 全部 if it was the chosen store. The pill swaps in place and keeps focus; toast 「已关注「{name}」」 / 「已取消关注「{name}」」.
- 「联系商家」 → that store's chat sheet over this page (商家消息, §10). Its header button only closes the chat here.
- The introduction → 品牌介绍 sheet. A 当季精选 card → its collection sheet.
- Chip → filters the grid in place (`.sf-feed` re-renders). The choice lives in this page's stack entry (`params.cat`; proposed `?cat=`), so it survives going to a product and back; a new visit starts on 全部. An unknown or unsold category falls back to 全部.
- A card → push `product` (`…/s/:sid/p/:pid`). Its heart works as on 购物广场.
- **One page per store** (`VT.storefront.open(app, sid)`, used by every way in): when this store's page is already in the current tab's stack, the app goes back to it (closing any sheet, dropping the screens above it, pop transition) instead of pushing a second copy. When it is the current screen, it only closes the sheets. So store → product → brand row returns to the store (stack 购物广场 › 商家店铺). An unknown store id opens nothing.

**Overlays.** All close via ✕, a scrim tap, Esc or back.
- **品牌介绍 sheet** (title 「品牌介绍」): the 54 px logo with the full name (bold) and the tagline; the introduction (13.5 px, line height 1.75); a card of three facts, 「主营品类」 (the categories it sells, joined by 「 · 」), 「在售商品」 「{n} 件」 and 「店铺评分」 {rating}; the note 「店铺介绍与评分均为演示数据」. No company facts (REPORT deviation 32).
- **Collection sheet** (当季精选; titled with its name): its photo (1.9 : 1, radius 14), the lead 「{sub} · {n} 件」, then `.mini` rows (image, name, tags, price) for its products, only ever this store's own: 秋冬外套系列 → brown-blazer, knit-cardigan (2 件); 针织毛衣系列 → knit-cardigan (1 件); 牛仔系列 → straight-jeans (1 件). A row → push `product`.
- The chat sheet (商家消息, §10).

**Data.**
- Reads `data.storeById[sid]` (an unknown `sid` shows ZARA), the store's products (`VT.plaza.storeProducts`: `data.plazaOrder` filtered by `data.storeOf`), `data.plazaCats` and `data.inCat` (the chips), `s.storeFavs`, `s.favorites` and the person's ownership (cards). Writes `s.storeFavs` (关注) and `s.favorites` (hearts); the chat writes `s.storeChats` (§10).
- The store fields this page added (`data.js` `stores`; 购物广场's table lists the campaign lines): `campaign { img?, line }`, the banner's text-free photo (ZARA only) and title; `intro`, the introduction (demo copy, no company facts or follower counts); `collections` (ZARA only) `[{ id, name, sub, img, items }]`, the 当季精选, whose photos are the plaza model photos. The contract's `Store` doesn't have them yet (HANDOFF §13.1 #21).
- Keep scroll `sf`, `sf-cols` and `sf-chips`.

**States & edge cases.**
- Every store but ZARA shows the collage banner and no 当季精选.
- Reformation and Linea Denim sell one product each: their chip row is 「全部」 plus one category.
- The page can sit on any tab's stack: 商品详情 opened from 个人衣橱, AI 造型师, 我的收藏 or 浏览记录 pushes it there (e.g. `/wardrobe/p/:pid/s/:sid`), not on 购物广场.
- Following or unfollowing here changes 购物广场's bar; it shows when the user is back on 购物广场.
- **[demo]** Introductions, collections, ratings and counts are seed data.

**Components used.** `VT.ui.backBtn`, `VT.ui.iconBtn`, `VT.ui.img`, `VT.plaza.logo` (`.st-logo--sf` 64 px, `.st-logo--lg` 54 px), `VT.plaza.banner` (`.mban`), `VT.plaza.card` (`.pz-grid`, `.pz-card`), `VT.plaza.mini`, `VT.plaza.toggleFav`, `VT.plaza.isFavStore`, `VT.plaza.storeProducts`, `.chip` in `.pz-chips`, `.opt-list`, `.sheet-lead`, `.sheet-note`, `app.sheet`, `app.toast`, `VT.storeChat.open`. Local: `.sf-*`. Exports `VT.storefront = { open }`, used by 购物广场, 商品详情 and 商家消息.

**Acceptance checks.** In the 购物广场 stores block (mobile context, seed data): `plaza: the store banner's 进入店铺 opens the store page` (ZARA) · `store page: identity, banner, 当季精选 and only its products, no tab bar` · `store page: category narrows its products` (外套 → knit-cardigan, brown-blazer) · `store page → product; its brand row returns to the same store page` · `back from the store page → 购物广场, store and category kept` · `store page: 关注 is the plaza's favourite-store list` (取消, then 关注 again: ZARA first in the bar) · `商家消息: a store avatar opens its store page; back returns` · `chat header opens the store page; back reopens the same chat with its draft` · `product brand opens its store page`.

