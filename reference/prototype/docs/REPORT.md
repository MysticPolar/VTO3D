# Prototype report: what is real, what is simulated

## Navigation (v2: five primary tabs)

| Requirement | How it works |
|---|---|
| Five primary screens behind one bottom bar | 首页 · 购物广场 · 个人衣橱 · AI造型师 · 我的. The bar is defined once (`VT.data.tabs`) and drawn by one component, so it is identical on all five |
| Instant switching, state kept | Tab switches have no animation. Each tab keeps its own stack, scroll positions and typed text (e.g. a half-typed stylist message, the plaza scroll position, an open product page) |
| Secondary screens | Pushed on top of the current tab, hide the tab bar, always have a working back button. Opened directly (simulator, deep link), they still get the back path they would normally have, e.g. 物流跟踪 → 订单详情 → 我的订单 → 我的 |
| First launch | 启动页 → 上传照片 / 视频 → 智能检测 → 生成 → 首页. After that (or after 跳过 / 登录), every launch opens on 首页. The flag is stored locally |
| Safe areas | The tab bar and bottom buttons pad for `env(safe-area-inset-bottom)` on phones |

## Fully functional (real browser capability)

| Feature | Where |
|---|---|
| Navigation: tabs, back stacks, slide transitions, deep links | everywhere |
| Photo upload with file picker, type and size checks, preview (downscaled, stored locally) | avatar creation, 我的资料 (profile picture), 申请退换货 (evidence photos), 个人衣橱 (own garments), 首页 (拍照 → 从相册上传) |
| Avatar creation by photos: five guided slots (正面 · 背面 · 左侧 · 右侧全身 · 面部生活照), each with an example, a local preview, 更换 and 删除. Checks the browser really runs: format, size, resolution, portrait orientation, brightness and over-exposure, sharpness, the same photo twice. Each failure comes with a concrete fix. 下一步 stays locked until all five pass | 上传照片 / 视频 (照片上传) |
| Avatar creation by video: upload with real length, resolution, brightness and sharpness checks, and four extracted frames; playback preview, 重新拍摄 / 更换 / 删除. In-app recording with MediaRecorder: 3-2-1, a 10 s timer, the four turn steps. Phones without it get the system camera; other browsers get upload only, and say so | 上传照片 / 视频 (视频上传) |
| 智能检测与确认: the materials previewed and replaceable; each check row says how it was checked; failed checks list their fixes and block 开始生成建模 | 上传照片 / 视频 |
| Consent before the first photo or video (purpose, on-device storage, deletion, the future third-party AI provider); 不同意 uploads nothing. Photos and video frames live in IndexedDB on the device, never in localStorage; the video itself only in memory. Drafts of an unfinished visit are deleted; 清除已上传的照片 and deleting an avatar delete their media | 上传照片 / 视频, 隐私与安全, 我的形象 |
| The generation flow's mechanics: one job at a time, a 停止生成？ dialog, failure that keeps the materials and 重试, 修改名称, 重新生成, 更换素材. The new avatar is saved, made active, and listed in 切换角色 and 个人衣橱 | 上传照片 / 视频, 首页, 个人衣橱 |
| Garment photo from the camera: the phone's own camera on phones; an in-app `getUserMedia` preview with a shutter on desktop | 首页 (拍照 → 拍摄衣服) |
| Temporary try-on list (我的上传) for the browser session; 加入衣橱 saves an upload to the active avatar's wardrobe, once | 首页 |
| Several digital avatars (本人 + the demo 伴侣 · 爸爸 · 妈妈), each with its own photos, body data, wardrobe, 搭配集, 穿搭瞬间 and outfit: create, switch, rename, delete. One active person for the whole app: switching on 首页 or in 个人衣橱's portrait row changes both; the account, payment methods and orders never switch | 首页 (切换角色), 个人衣橱, 我的形象 |
| Four backdrops behind the avatar, remembered | 首页 (切换场景) |
| Garment selection with multi-slot outfits, selected indicators, swaps to the matching on-body image | 首页 |
| Live camera preview via `getUserMedia`: permission explainer, front/back switch, clear errors; stops on close | 首页 |
| Search, category filters, favourites | 购物广场, 我的收藏 |
| Store pages: 关注 (the same list as 购物广场's favourite stores), 联系商家 (the store's chat), categories, 当季精选, brand intro, share. Reached from the store banner's 进入店铺, search, 商品详情's brand row and 商家消息 (avatars, chat header); an open store page is reused, not stacked twice, and back from a chat's header re-opens that chat with its draft | 商家店铺 |
| Gallery, colour and size selection, size guide, reviews, share | 商品详情 |
| Add to wardrobe → appears at the top of 个人衣橱 | 商品详情 → 个人衣橱 |
| Wardrobe: 衣服 / 搭配集 / 穿搭瞬间 views; filters, search, hearts, try-on queue, upload; long-press (or right-click) menu 立即试穿 · 加入搭配集 · 分享 · 删除 | 个人衣橱 |
| 搭配集: create, rename, add or remove garments, share, delete; 一键试穿这套 sends the set to 首页 | 个人衣橱 → 搭配集详情 |
| 穿搭瞬间: a private gallery (仅自己可见); 保存造型 on 首页 adds the current try-on; hearts, 保存图片 (a real download; a 首页 try-on is composed onto its backdrop as a JPEG), 分享 (the native share sheet with the photo where the browser allows, else the clipboard), 再次试穿, delete | 个人衣橱 → 穿搭瞬间, 首页 |
| Checkout editing: colour, size, quantity, address book, shipping, payment, agreement, live totals | 结算下单 |
| Order list with status filters (全部 / 待付款 / 待发货 / 运输中 / 待收货 / 售后), pay an unpaid order, confirm receipt, cancel, buy again | 我的订单 |
| Order details, logistics timeline, return/exchange form with progress and withdraw | 订单详情, 物流跟踪, 申请退换货 |
| Edit profile (name, signature, gender, birthday), profile picture | 我的资料 |
| Address book: add, edit, delete, set default (used by checkout) | 收货地址 |
| Default payment method, notification and privacy switches, size standard, avatar preferences and body data | 支付方式, 消息通知, 隐私与安全, 设置, 我的形象 |
| Live counts on 我的 (wardrobe items, favourites + saved looks, browsing history) | 我的 |
| Persistence via `localStorage` (survives refresh; resettable) | global |
| Responsive: desktop board, desktop simulator, full-screen mobile app | global |

## Simulated (no backend)

| Feature | How it is simulated |
|---|---|
| Digital-avatar generation (first launch, 新建数字分身, 我的形象 → 重新生成) | A timed five-stage sequence (6.4 s) labelled 「模拟进度 · 演示版未接入建模服务」. It shows stages and an indeterminate ring with 「n/5」, with no percentage and no time estimate. The result is always the preset model, labelled 「2D 形象预览 · 演示版」, never 3D. `?mockFail=avatar.generate` makes it fail at 55 % |
| AI quality checks (身体完整度, face recognition, 背景简洁度, the real angles, 视频稳定性) | Not performed. Their rows say 无法检测 and why. `?mockFail=avatar.check` simulates one failure (正面全身照缺少脚部), labelled 演示 |
| Sending photos or video to a modeling service or a third-party AI provider | Nothing leaves the device. The consent sheet describes the future transmission, which will ask again |
| 演示：使用示例照片 / 使用示例素材 | Fills the inputs with the kit's examples. They are never checked: every row says 无法检测 |
| Virtual try-on rendering | Only real on-body imagery is used (base avatar + 3 stylist looks). 首页's 推荐 lists the 10 garments those images show first, then the other 18; picking one of those joins the outfit with an honest "演示版暂无…的上身图" message. Photos of the user's own garments (我的上传) are never drawn onto the avatar: 首页 labels them 「临时试穿 · 演示版暂无上身图」 |
| More digital avatars | Generation is simulated, so every avatar renders as the preset model; the 切换角色 sheet says so. The 伴侣 / 爸爸 / 妈妈 portraits are demo images, not real people |
| 穿搭瞬间 photos | The four seed photos are demo crops from the mockup (upscaled, soft). A look saved from 首页 is the on-body image 首页 showed, on its backdrop; garments without an on-body image are listed and tagged 暂无上身图 |
| Video try-on | Camera preview only; real-time AI garment replacement needs a model service. In the online preview the host page blocks the camera, and the overlay explains how to run it locally |
| AI stylist | Keyword-matched scripted replies, no LLM call |
| Login, payment, logistics, merchant chat, FAQ, feedback, notifications, data export | Predetermined demo behaviour; no money moves, nothing is sent |
| Store intros, campaign lines, collections, ratings | Demo data in `VT.data.stores`, written as each store's own description (no founding years, follower counts or other company facts). Only ZARA has campaign photography and 当季精选; the other stores' banners are a collage of their own product photos, and their pages hide 当季精选 |

## Deliberate deviations from the mockup (please review)

1. **No back arrows on 个人衣橱 and AI 造型师.** The mockup still shows them, but those screens are now tabs, and a tab root has nowhere to go back to.
2. **Board subtitle** uses your spec's 虚拟试衣 · 个人衣橱 · 智能购物, not the tab list drawn in the mockup.
3. **Tab icons.** The mockup draws 购物广场 and 个人衣橱 with different icons on different phones. The bar uses one set: house, bag, wardrobe, sparkle, person; the active tab is filled.
4. **购物广场 and AI 造型师 keep the approved scale.** The new mockup draws these two screens about 15% larger than the approved screens and the other three tabs. The prototype keeps one consistent scale, so the plaza shows a third row and the stylist shows its follow-up message.
5. **购物广场 keeps the 购物袋 and 消息 icons** (the cart entry and notifications). The mockup drops them.
6. **我的 counts are live** (15 / 8 / 6 at reset) instead of the mockup's placeholder 12 / 28 / 6.
7. **隐私与安全 sits inside 设置** to keep the mockup's seven rows on 我的.
8. **Order filters** follow the mockup's labels. "Delivered" from the spec is 待收货 (delivered, awaiting confirmation); "Returns and refunds" is 售后.
9. **首页 background** is lighter, as drawn in the new mockup. It is still one continuous taupe plate with no white strip.
10. **Avatar upload has a 跳过 button** on first launch (uses the demo avatar), since the spec says the setup "may" appear.
11. Earlier decisions still stand: the same shirt has three names across detail, checkout and order; the detail-page button reads 试穿上身 (announced as 立即试穿); the status bar is standardised.

**首页 update (20 Oct 2026, `reference/design/screens/03_fitting_room_v2.webp`).**

12. **Readable sizes.** The 推荐 / 我的上传 tabs are 11 px (the mockup draws them at about 8 px) and the 开启视频试衣 label 11 px; the title is 18 px, as drawn, and stays centred on the screen.
13. **加入衣橱 and the 临时试穿 card** are not in the mockup. They follow the flow diagram's 自主保存 step and sit above 拍照, so the avatar and the rail stay clear.
14. **推荐 lists the image-ready garments first.** The mockup's order would start 上装 with the cardigan, which has no on-body image.
15. **The selected tile** has the mockup's thin muted-coral ring and no ✓ badge.

**个人衣橱 update (20 Oct 2026, the Instagram-style mockup and `Wardrobe_Instagram_Assets_V2`).**

16. **The title stays centred**, as the brief asks ("keep the existing header"); the mockup draws it left-aligned.
17. **Garment tiles stay near-square** (the existing 3-column grid), as the brief asks; the mockup draws them taller.
18. **搭配集 covers** are the kit's 4:3 collages. The list shows a 16:10 crop, zoomed just past the frame the kit draws inside each image; 搭配集详情 shows the whole cover. The mockup's wide flat-lays are not in the kit. Collections without a kit cover (the demo people's, new ones) show a collage of their first garments.
19. **Counts are real**: the seed collections hold 4 garments each (the kit's lists), not the mockup's 6 / 5 / 4.
20. **删除 works on every garment**, seed ones included (it used to be hidden for them), and also takes the garment out of that person's 搭配集. 重置演示数据 brings everything back.
21. **A tap still opens the item sheet**, now listing every action (also the keyboard route); the long-press opens the mockup's lifted card and menu.
22. **The mockup's 切换角色 panel** (a grid of portraits) is not built: 首页 keeps its list sheet. The wardrobe's ＋ opens the same 新建数字分身 flow.
23. **The demo people** use the kit's names: 本人, 伴侣, 爸爸, 妈妈 (the brief's 男/女朋友 is 伴侣). Names appear only in labels and in the 切换角色 sheet, never under the portraits.

**Avatar onboarding upgrade (21 Oct 2026, `reference/design/screens/02_avatar_onboarding_v2.webp` and `Avatar_Onboarding_Production_Assets_V1`).**

24. **Five photos, not the brief's six.** 斜侧全身 is dropped, as you decided. The second row splits 50/50 (右侧全身 · 面部生活照), as drawn.
25. **生成建模 shows stages, not 68 %.** The mockup's 「68%」, 「预计用时约 1-2 分钟」 and 「预计还需约 40 秒」 are left out: the brief allows a percentage only when real progress is reported, and no time guarantees. The ring turns and shows 「n/5」 with the stage name.
26. **No 3D or "AI passed" claims.**
    - 「3D 数字分身」 and 「AI 智能检测结果 · 系统已完成素材质量检测，符合建模要求」 become honest copy: 「素材检测结果」, and a note that only the basic checks ran in the browser.
    - Rows the browser can't check say 无法检测.
    - The result says 「2D 形象预览 · 演示版」.
27. **The video is 10 s** (the brief), not the mockup's 10–15 s.
28. **Added from the brief:** the 「拍摄建议」 card; six 正确示范 (adds 单人入镜); seven 错误示范 (adds 滤镜过重 and keeps 背景杂乱). The consent sheet is new as well.
29. **背景简洁度** stands for the brief's 背景清晰度, following the mockup's 「背景简洁」 and the brief's "Background suitability".
30. **The uploaded video** shows its first frame with a play button, rather than tiny inline controls; the preview opens in a sheet.

**商家店铺 (21 Oct 2026, `reference/design/screens/04_plaza_store_v2.webp` and `Merchant_Commerce_App_Assets_V1`).**

31. **No follower count.** The mockup's 「128.6万 粉丝」 is replaced by 「在售 {n} 件 · 店铺评分 {r}」, which the store data has.
32. **The brand intro has no company facts.** The mockup's 「创立于 1974 年」 and 「可持续理念」 are dropped; the positioning sentences stay.
33. **No 「查看全部」 beside 当季精选.** ZARA's three collections all fit on screen, so the link would lead nowhere.
34. **全部商品 shows only the categories the store sells** (ZARA: 全部 · 下装 · 外套), not all seven chips.
35. **ZARA's banner keeps its photo** (the one in the mockup). Its text and 进入店铺 are now live HTML over a text-free copy, so the store page shows the same banner without the button. The asset kit's photos are not used: every model photo in it is one of our ZARA products (cardigan, jeans, blazer, maxi skirt), so on another store's banner it would show ZARA's garments. Those stores get a collage of their own products instead.
36. **关注 names the favourite-store list everywhere**, as in the mockup: the store page, 购物广场's bar, search pills and 管理 sheet (「关注的商家」), the toasts (「已关注「ZARA」」) and the store chat copy. 收藏 stays for product wishlists (hearts, 我的收藏).

## How the imagery was prepared

All imagery comes from your asset kit and reference screens. No stock or generated fashion photos were added.

- Onboarding photo: the baked-in headline, feature list and buttons were removed with LaMa inpainting, so all copy is live HTML.
- 首页 avatar: re-cut with ISNet matting onto a clean taupe plate reconstructed from the fitting-room screen. The plate is brightened in CSS to match the new mockup.
- The 3 look renders: item columns inpainted out of the stylist cards, upscaled ×4 (Real-ESRGAN), matted, colour-decontaminated, then aligned to the base avatar.
- Product tiles: cropped from the reference screens, with the baked heart icons inpainted out.
- Products that only exist as tiny thumbnails (slip dress, black bag, pumps, heels, hoops) were upscaled ×4 and look softer.
- Payment marks are cropped from the checkout mockup.
- 个人衣橱 V2 (`assets/wardrobe/`, from `Wardrobe_Instagram_Assets_V2`): the four portraits (256 px WebP), the twelve square garment shots (trimmed 8% top and left and 4.5% at the bottom to remove the mockup tile frames, then 720 px wide), the four 搭配集 covers and the four 穿搭瞬间 photos, as supplied.
- ZARA banner (`assets/plaza/banners/zara-hero.webp`): the old banner's wordmark, two lines and button were removed by fitting a smooth surface to the plain backdrop around them, so the copy can be live text. The 当季精选 covers reuse the plaza's model photos.
- Avatar onboarding (`assets/avatar-onboarding/`, from `Avatar_Onboarding_Production_Assets_V1`): the method previews, reference photos (360 × 480) and turn frames, the 错误示范 examples (240 px) and the result face, re-encoded as WebP q80. The kit has no heavy-filter example, so `wrong/heavy_filter.webp` was made from its face portrait (smoothing, a pink cast, extra saturation). The kit marks all its photos as synthetic illustrative references.
- Scripts: `tools/asset-pipeline/`. They need the ONNX models noted in `imgtools.py`.

## Known limitations

- Only the default colour of each product is photographed. Picking another colour changes the labels, not the photo.
- Look renders and small-item photos are upscaled and softer than the base avatar.
- New secondary screens (我的订单, 物流跟踪, 我的形象, 设置 and the rest) had no reference design. They reuse the existing card, list and type styles.
- The avatar checks are pixel statistics: brightness, Laplacian sharpness and a 64 × 64 print. They don't see bodies or faces, so a sharp, well-lit photo of anything passes them. Recognising those needs the AI service.
- In-app recording needs MediaRecorder (current Chrome, Edge, Firefox and Safari). The online preview's host page can block the camera; upload still works there.
- Fonts are subset. After adding new Chinese copy, run `tools/subset_fonts.py` (see README); until then, new characters fall back to the system font.
