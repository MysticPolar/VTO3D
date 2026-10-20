# 全新的购物体验 — Virtual Try-On Prototype

A high-fidelity, interactive HTML/CSS/JS prototype of the virtual try-on & personal wardrobe app. Plain HTML, CSS and vanilla JavaScript: no build step, no dependencies.

## Run it

1. **Quickest:** double-click `index.html` (works in Chrome, Edge, Safari and Firefox).
2. **Recommended (camera works everywhere):**
   ```bash
   cd vto-prototype
   python3 -m http.server 8080
   ```
   Then open <http://localhost:8080>.
3. **On a phone:** serve the folder as above, then open `http://<your-computer-ip>:8080` on the phone. On a phone the app opens full-screen. Browsers only allow the camera on HTTPS or `localhost`, so to test video try-on on a phone, use an HTTPS tunnel (e.g. `npx localtunnel --port 8080`).
4. **Online copy:** the published preview link runs everything except the camera. Embedded previews block camera access, and the camera overlay says so.

## App structure

| Primary screens (bottom tabs) | Secondary screens (back button, no tab bar) |
|---|---|
| 1 首页 · 虚拟试衣间 | 启动页 → 上传照片 · 创建数字分身 (first launch only) |
| 2 购物广场 | 商品详情 → 结算下单 → 支付成功 · 商家消息 |
| 3 个人衣橱 | 商品详情 (from any item) |
| 4 AI 造型师 | 商品详情, look sheets |
| 5 我的 | 我的订单 → 订单详情 → 物流跟踪 / 申请退换货 · 我的形象 → 上传照片 → 生成 · 我的资料 · 收货地址 · 支付方式 · 消息通知 · 帮助与客服 · 设置 → 隐私与安全 · 我的收藏 · 浏览记录 |

- **Tabs** switch instantly. Each tab keeps its own history, scroll position and typed text, so it comes back exactly as you left it.
- **First launch:** the app opens on 启动页 and the avatar upload. Once that is done (or skipped, or after 登录), every later launch opens straight on 首页.
- To see the first launch again: 我的 → 设置 → 重新体验首次启动, or 重置演示数据.

## How to use the prototype

| What | How |
|---|---|
| Showcase board (Mode A) | Opens by default on desktop. The 5 phones are live renders of the primary screens |
| Interactive simulator (Mode B) | Click any phone. The left panel jumps to any primary or secondary screen. Press **Esc** or **返回展示板** to go back |
| Mobile | The app opens full-screen. The tab on the right edge opens a menu: view the board, jump to a flow screen, reset |
| Deep links | `index.html#profile` (or any screen id) opens the simulator there. `index.html?app=plaza` opens the bare app with no frame; `?app=launch` simulates an app launch (local only) |
| Reset demo data | **重置演示数据** in the simulator, the mobile menu, or 我的 → 设置 |

Screen ids: `fitting, plaza, wardrobe, stylist, profile` (tabs) and `onboarding, avatar, product, checkout, messages, orderlist, orders, tracking, returns, avatarhub, editprofile, addresses, payments, notifications, privacy, settings, help, favorites, history`.

## Project structure

```
index.html              entry: showcase board + simulator
css/tokens.css          colours, radii, type stacks
css/base.css            self-hosted fonts, reset
css/components.css      status bar, buttons, chips, the shared tab bar, settings lists, sheets, dialogs, toasts
css/screens/*.css       one file per screen family (01–11)
css/showcase.css        board, simulator frame, mobile mode
js/icons.js             SVG icon set (also exported to assets/icons/*.svg)
js/data.js              catalog, tabs, looks, orders, chat scripts: all demo data
js/store.js             state + localStorage persistence
js/ui.js                shared render helpers (tab bar, sub-page header, list rows, switches…)
js/app.js               navigation (per-tab stacks, launch flow), transitions, events, overlays
js/camera.js            video try-on camera preview (getUserMedia)
js/screens/01–09        onboarding, avatar, 首页, 购物广场, product, 衣橱, AI 造型师, checkout, orders
js/screens/10–14        我的, account & settings, 我的形象, 我的收藏 / 浏览记录, 商家消息
js/showcase.js          board, simulator, mobile/solo mode, deep links
assets/people|clothing|icons|backgrounds|ui|fonts
docs/                   comparison screenshots + feature report
tools/                  font subsetting + the asset pipeline used to prepare images
```

## Editing

- **Copy and prices** live in `js/data.js` (catalog, tabs, orders, chat) and in each `js/screens/*.js`.
- **The tab bar** is defined once in `VT.data.tabs` (`js/data.js`) and drawn by `VT.ui.tabBar()`.
- **Colours and type** live in `css/tokens.css`.
- **Fonts are subset** to the characters the prototype uses (Noto Sans SC + Inter, about 1.1 MB in total). After you add new Chinese text, re-run:
  ```bash
  pip install fonttools brotli
  python3 tools/subset_fonts.py
  ```
  This needs Noto Sans CJK and Inter installed on the machine (the script lists the paths it expects). Until you re-run it, new characters fall back to the system font (PingFang SC / Microsoft YaHei).
- Demo state (setup flag, digital avatars, wardrobes, orders, favourites, profile, addresses, chat, uploads, the 首页 backdrop) is stored in `localStorage` under `vt-prototype-state-v1`. 首页's 我的上传 (garment photos for try-on) lives in `sessionStorage` under `vt-fit-uploads-v1`, so it lasts for the browser session only.

See `docs/REPORT.md` for which features are real and which are simulated.
