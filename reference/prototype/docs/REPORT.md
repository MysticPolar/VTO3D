# Prototype report: what is real, what is simulated

## Navigation (v2: five primary tabs)

| Requirement | How it works |
|---|---|
| Five primary screens behind one bottom bar | 首页 · 购物广场 · 个人衣橱 · AI造型师 · 我的. The bar is defined once (`VT.data.tabs`) and drawn by one component, so it is identical on all five |
| Instant switching, state kept | Tab switches have no animation. Each tab keeps its own stack, scroll positions and typed text (e.g. a half-typed stylist message, the plaza scroll position, an open product page) |
| Secondary screens | Pushed on top of the current tab, hide the tab bar, always have a working back button. Opened directly (simulator, deep link), they still get the back path they would normally have, e.g. 物流跟踪 → 订单详情 → 我的订单 → 我的 |
| First launch | 启动页 → 上传照片 → 生成 → 首页. After that (or after 跳过 / 登录), every launch opens on 首页. The flag is stored locally |
| Safe areas | The tab bar and bottom buttons pad for `env(safe-area-inset-bottom)` on phones |

## Fully functional (real browser capability)

| Feature | Where |
|---|---|
| Navigation: tabs, back stacks, slide transitions, deep links | everywhere |
| Photo upload with file picker, type and size checks, preview (downscaled, stored locally) | avatar creation, 我的资料 (profile picture), 申请退换货 (evidence photos), 个人衣橱 (own garments) |
| Garment selection with multi-slot outfits, selected indicators, swaps to the matching on-body image | 首页 |
| Live camera preview via `getUserMedia`: permission explainer, front/back switch, clear errors; stops on close | 首页 |
| Search, category filters, favourites | 购物广场, 我的收藏 |
| Gallery, colour and size selection, size guide, reviews, share | 商品详情 |
| Add to wardrobe → appears at the top of 个人衣橱 | 商品详情 → 个人衣橱 |
| Wardrobe filters, search, hearts, try-on queue, remove, upload | 个人衣橱 |
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
| Digital-avatar generation (first launch and 我的形象 → 重新生成) | A 4-second progress sequence. The result is always the preset model, labelled as a 2D preview |
| Virtual try-on rendering | Only real on-body imagery is used (base avatar + 3 stylist looks). Other garments are added to the outfit with an honest "演示版暂无…的上身图" message |
| Video try-on | Camera preview only; real-time AI garment replacement needs a model service. In the online preview the host page blocks the camera, and the overlay explains how to run it locally |
| AI stylist | Keyword-matched scripted replies, no LLM call |
| Login, payment, logistics, merchant chat, FAQ, feedback, notifications, data export | Predetermined demo behaviour; no money moves, nothing is sent |

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

## How the imagery was prepared

All imagery comes from your asset kit and reference screens. No stock or generated fashion photos were added.

- Onboarding photo: the baked-in headline, feature list and buttons were removed with LaMa inpainting, so all copy is live HTML.
- 首页 avatar: re-cut with ISNet matting onto a clean taupe plate reconstructed from the fitting-room screen. The plate is brightened in CSS to match the new mockup.
- The 3 look renders: item columns inpainted out of the stylist cards, upscaled ×4 (Real-ESRGAN), matted, colour-decontaminated, then aligned to the base avatar.
- Product tiles: cropped from the reference screens, with the baked heart icons inpainted out.
- Products that only exist as tiny thumbnails (slip dress, black bag, pumps, heels, hoops) were upscaled ×4 and look softer.
- Payment marks are cropped from the checkout mockup.
- Scripts: `tools/asset-pipeline/`. They need the ONNX models noted in `imgtools.py`.

## Known limitations

- Only the default colour of each product is photographed. Picking another colour changes the labels, not the photo.
- Look renders and small-item photos are upscaled and softer than the base avatar.
- New secondary screens (我的订单, 物流跟踪, 我的形象, 设置 and the rest) had no reference design. They reuse the existing card, list and type styles.
- Fonts are subset. After adding new Chinese copy, run `tools/subset_fonts.py` (see README).
