/**
 * API contract, part 1: data types.
 *
 * The agreement between the web front end and the future backend. The mock
 * (src/api/mock) implements it now; src/api/http implements it later.
 * Copy this file to src/api/types.ts unchanged. Changing it needs approval.
 *
 * Conventions
 * - Money is whole yuan (the prototype only has integer prices).
 * - Fields marked "display" are already localised (zh-CN) by the server, e.g.
 *   '7月15日 09:24', '待付款', '—'. The client shows them as they are.
 * - Fields marked ISODateTime are ISO 8601 with offset: '2026-07-15T09:24:18+08:00'.
 * - Ids are opaque strings. Product ids are URL-safe slugs ('striped-shirt').
 * - Field names follow the prototype's data (reference/prototype/js/data.js and store.js), except:
 *   product `cat` → `category`, `img` → `images`; `p` (product id, everywhere) → `productId`;
 *   look `render` → `renderId`; fitCatsAll `items` → `TryOnCategory.productIds` (the full lists; 首页 filters them);
 *   a product's store `storeOf(p)` (matched by brand) → `Product.storeId`; the plaza card focus
 *   (`cardFocus`, or a path under assets/plaza/models/) → `Product.cardFocus`;
 *   store `full` → `fullName`, `mono`/`bg`/`fg` → `logo`, `banner`/`bannerAlt` → `banner {img, alt}`,
 *   the count of its products → `productCount`; `storeFavs` → `string[]` (bar order);
 *   store chat `{unread, at, msgs}` → `StoreChatSummary` + `StoreChat`, message `{me, text, t}` →
 *   `{id, from, text, sentAt}`; the 04-plaza.js banners + `seasonPicks` → `Banner`;
 *   shipping `eta` → `etaDays`; logistics `{t, s}` → `{time, text}`;
 *   order `address` (an id) → `address` (a snapshot); `returns[oid]` → `Order.return`;
 *   history `{p, t: '今天 09:12'}` → `{productId, viewedAt}`;
 *   wardrobe `custom: {src, name, cat}` → `upload: {img, name, category}`, seed `addedAt: 0` → `null`;
 *   avatar photo `{src, name, w, h}` → `{url, name}`;
 *   chat `img` → `photo`, `looks` → `lookIds`, `{role: 'wardrobe', pids}` → `productIds`;
 *   favourites map `{pid: bool}` → `string[]`; `savedLooks` map → `SavedLook[]`; FAQ tuples → `{q, a}`;
 *   `avatars` + `activeAvatar` (the active avatar's data in the old top-level fields) → `Avatar[]`,
 *   with the active avatar's id kept by the client (HANDOFF §4.4).
 *
 * DRAFT, needs approval (HANDOFF §13.1 #14; 首页 update, 20 Oct 2026): digital avatars. `Avatar`
 * gains `id`, `name`, `self` and `wardrobeCount`; `AvatarCreateInput` is new; `OrderDraft` names
 * the avatar whose wardrobe a purchase joins. The matching operations are in api.ts.
 */

export type ImageUrl = string;
export type ISODateTime = string;
export type Yuan = number;

/* ------------------------------------------------------------------ catalog */

export type GarmentCategory = 'top' | 'outer' | 'bottom' | 'dress' | 'shoes' | 'bag' | 'acc';

/** Category filter ids used by 购物广场 and 个人衣橱 ('shoesbag' = shoes + bag). */
export type CategoryFilter = 'all' | 'top' | 'bottom' | 'outer' | 'dress' | 'shoesbag' | 'acc';

export interface CategoryTab {
  id: CategoryFilter;
  label: string; // display: '全部', '上衣', …
}

export interface ColorOption {
  id: string;
  name: string; // display: '蓝色条纹'
  short: string; // display: '蓝色' (line titles are short + cardName)
  /** CSS colour, or the keyword 'stripe' for the striped swatch */
  hex: string;
}

export interface ProductImages {
  card: ImageUrl; // 购物广场 grid when there is no `plaza` image; sheets' product rows
  /** 购物广场 card, store sheet and picks rows when the plaza asset pack has one; falls back to `card` */
  plaza?: ImageUrl;
  tile: ImageUrl; // wardrobe tiles
  thumb: ImageUrl; // small thumbnails (首页 rail)
  hd: ImageUrl; // product page
  item?: ImageUrl; // cut-out item photo
  checkout?: ImageUrl; // checkout line image, when different from card
  order?: ImageUrl; // order card image, when different from card
}

export interface Product {
  id: string;
  name: string; // full name, product page
  cardName: string; // short name, cards and line titles
  tags: string; // display: '柔软亲肤 · 百搭基础款'
  coTags?: string; // display: checkout variant of tags
  price: Yuan;
  category: GarmentCategory;
  brand: string; // display: the brand row on 商品详情; in the demo it equals the store's `name`
  /** the store that sells it (Store.id) */
  storeId: string;
  rating: number; // 0–5, shown with one decimal
  reviews: number; // review count
  desc: string; // may contain '\n'
  colors: ColorOption[];
  /** colour dots on the plaza card: CSS colours or 'stripe-grey' */
  dots: string[];
  /** '+N' shown after the dots */
  dotsMore: number;
  sizes: string[]; // 'XS'…'L', '35'…'39' or '均码'
  defaultSize: string;
  images: ProductImages;
  gallery: ImageUrl[];
  /** thumbnails under the gallery when they differ from it */
  galleryThumbs?: ImageUrl[];
  /** thumbnails under the item on 订单详情 (fallback: card, tile, thumb) */
  orderThumbs?: ImageUrl[];
  /** only a small source photo exists, so it is shown contained on a plate */
  small?: boolean;
  /**
   * how the 购物广场 card crops its image: 'model' = a model photo, anchored 24% from the top;
   * 'top' = from the top; absent = centred. `small` products are contained instead.
   */
  cardFocus?: 'model' | 'top';
}

export interface ProductQuery {
  category?: CategoryFilter; // default 'all'
  /** free text; matching rule in docs/HANDOFF.md §9.1 */
  query?: string;
  /** a Store.id: only that store's products. 购物广场 leaves it out while searching (HANDOFF §9.1). */
  store?: string;
}

/** A platform banner at the head of the 购物广场 feed (全部). Tapping it opens its picks sheet. */
export interface Banner {
  id: string;
  img: ImageUrl; // the image carries its own text
  label: string; // display, the button's aria-label: 'NEW SEASON 秋日灵感穿搭，探索本季精选单品'
  picks: {
    title: string; // display, the sheet title: '秋日灵感穿搭'
    productIds: string[];
  };
}

/* ---------------------------------------------------------------- stores */

/** A store (商家). Every product belongs to one (`Product.storeId`). */
export interface Store {
  id: string; // 'zara'
  name: string; // display: 'ZARA', the label in the 购物广场 store bar
  fullName: string; // display: 'ZARA 官方旗舰店', the store sheet title and Order.shop
  tagline: string; // display: '简约与质感的日常时装'
  /** the round logo: monogram on a colour; more than two letters are set as a wordmark */
  logo: { text: string; bg: string; fg: string };
  rating: number; // 店铺评分, shown with one decimal
  /** 「在售 {n} 件」: all of its products, whatever category is active */
  productCount: number;
  /** shown instead of the store card at the head of the 购物广场 feed (ZARA in the demo) */
  banner?: { img: ImageUrl; alt: string }; // alt: display
}

/* ----------------------------------------------------------- store chats */

/** A message in a chat with a store (商家消息). */
export interface StoreChatMessage {
  id: string;
  from: 'me' | 'store';
  text: string;
  /** formatted by the client: HH:mm today, 昨天 yesterday, else M月D日 (HANDOFF §13.2 #38) */
  sentAt: ISODateTime;
}

/** A row of 商家消息: a chat with at least one message. The list is newest `lastMessage` first. */
export interface StoreChatSummary {
  storeId: string;
  /** store messages the user hasn't seen; the 购物广场 badge is their sum */
  unread: number;
  lastMessage: StoreChatMessage;
}

/** A chat thread as its sheet shows it. */
export interface StoreChat {
  storeId: string;
  title: string; // display: the store's full name
  /** stored messages, oldest first; empty until the user writes */
  messages: StoreChatMessage[];
  /** display: the store's first bubble while `messages` is empty, stored with the user's first message */
  greeting: string;
  quickQuestions: string[]; // display, the chips
}

export interface ReviewSummary {
  rating: number;
  count: number;
  fitNote: string; // display: '98% 买家认为「尺码合适」'
  items: { author: string; stars: number; text: string; variant: string }[];
}

export interface SizeGuide {
  columns: string[]; // display: ['尺码', '胸围', '衣长', '肩宽', '袖长']
  rows: { size: string; values: number[] }[];
  note: string; // display
  /** the personalised tip when the user has an avatar; `bold` is shown in bold (「M 码」) */
  tip: { before: string; bold: string; after: string } | null; // display
}

/* ---------------------------------------------------------------- try-on */

export type OutfitSlot = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'bag' | 'acc';

/** slot → productId */
export type Outfit = Partial<Record<OutfitSlot, string>>;

/** One entry of the 首页 left menu. */
export interface TryOnCategory {
  id: 'upper' | 'lower' | 'dress' | 'outer' | 'shoes' | 'bag' | 'acc';
  label: string; // display: '上装', '下装', …
  icon: string; // icon name; the active pill uses `${icon}-filled` when it exists
  /**
   * all of its garments, in rail order (prototype `fitCatsAll`). 首页 lists the ones a render wears,
   * plus selected ones; 试穿 opens the first category whose list has the garment (HANDOFF §9.2).
   */
  productIds: string[];
}

/** An on-body image of the avatar wearing a known outfit. */
export interface Render {
  id: string; // 'base' | 'look1' | 'look2' | 'look3' in the demo
  img: ImageUrl;
  label: string; // display: '数字分身 · 基础造型'
  wears: Outfit;
}

export interface RenderResult {
  render: Render;
  /** selected productIds the chosen render does not show */
  missing: string[];
}

/** A styled look the stylist suggests. */
export interface Look {
  id: string;
  name: string; // 'Look 1'
  sub: string; // display: '休闲时髦 · 轻松有范'
  tags: string[];
  card: ImageUrl;
  renderId: string;
  items: { productId: string; img: ImageUrl }[];
}

/* -------------------------------------------------------------- wardrobe */

/**
 * 'owned' = already owned (seed items; cannot be removed) · 'collected' = 加入衣橱 from a product page
 * · 'purchased' = bought here (a collected item becomes purchased) · 'uploaded' = the user's own photo
 */
export type WardrobeSource = 'owned' | 'collected' | 'purchased' | 'uploaded';

export interface WardrobeItem {
  uid: string;
  /** null for uploads, which are not catalogue products */
  productId: string | null;
  /** the wardrobe's own 喜欢 heart; separate from 我的收藏 (favorites) */
  fav: boolean;
  source: WardrobeSource;
  /** colour id and size, for collected and purchased items */
  color?: string;
  size?: string;
  addedAt: ISODateTime | null; // null for seed items
  /** present when source === 'uploaded' */
  upload?: {
    img: ImageUrl;
    name: string; // display name, at most 16 characters
    category: GarmentCategory;
  };
}

export interface WardrobeChoice {
  color: string;
  size: string;
}

export interface WardrobeUploadInput {
  /** already downscaled by the client (HANDOFF §9.9) */
  image: Blob;
  name: string;
  category: GarmentCategory;
}

/* ---------------------------------------------------------- collections */

export interface HistoryEntry {
  productId: string;
  /** grouped on screen as 今天 / 昨天 / M月D日 (formatted by the client) */
  viewedAt: ISODateTime;
}

export interface SavedLook {
  lookId: string;
  savedAt: ISODateTime;
}

/* --------------------------------------------------------------- stylist */

export type ChatMessage =
  /** the user's message: text, or a photo of an outfit */
  | { id: string; role: 'user'; text?: string; photo?: ImageUrl }
  | { id: string; role: 'ai'; text: string }
  /** a row of look cards */
  | { id: string; role: 'looks'; lookIds: string[] }
  /** a set put together from the user's own wardrobe */
  | { id: string; role: 'wardrobe'; productIds: string[] };

export type StylistSendInput =
  | { text: string }
  /** already downscaled by the client */
  | { photo: Blob };

export interface RecentChat {
  title: string; // display: '朋友聚会穿搭'
  time: string; // display: '今天', '10月12日'
}

/* ---------------------------------------------------------------- avatar */

/** 'stale' = a photo was replaced after the last generation */
export type AvatarStatus = 'none' | 'ready' | 'stale';

export type AvatarPhotoKind = 'fullbody' | 'portrait';

export interface AvatarPhoto {
  url: ImageUrl;
  name: string; // original file name, shown as 「已上传：…」
}

export interface Avatar {
  /** DRAFT: one of the account's digital avatars (HANDOFF §9.15) */
  id: string;
  /** display name; 本人's is the profile nickname */
  name: string;
  /** true for 本人, the account holder's own avatar: it can't be renamed (the nickname is) or removed */
  self: boolean;
  /** wardrobe items, for the 切换角色 list (「衣橱 {n} 件」) */
  wardrobeCount: number;
  status: AvatarStatus;
  fullbody: AvatarPhoto | null; // 全身照
  portrait: AvatarPhoto | null; // 生活照 (also the fallback profile picture)
  /** null when the avatar became ready without generating (跳过, 登录, 试穿 before setup) */
  generatedAt: ISODateTime | null;
}

/** DRAFT: 新建数字分身. The photos are the ones picked on the upload screen (already downscaled). */
export interface AvatarCreateInput {
  name: string; // 1–8 characters
  fullbody: { image: Blob; fileName: string } | null;
  portrait: { image: Blob; fileName: string } | null;
}

export interface AvatarJob {
  id: string;
  status: 'running' | 'done' | 'failed' | 'cancelled';
  /** 0–1, as reported by the server; the demo UI animates its own bar (HANDOFF §9.13) */
  progress: number;
  /** true when sample photos stood in for missing uploads */
  usedSamples: boolean;
  error?: string; // display, when failed
}

export interface Body {
  height: number; // cm, 130–210
  weight: number; // kg, 30–150
  size: string; // 'XS' | 'S' | 'M' | 'L' | 'XL'
  shoe: string; // '33'–'46'
}

/* ---------------------------------------------------------------- orders */

/** -1 待付款 · 0 待发货 · 1 已发货 · 2 运输中 · 3 待收货 (delivered) · 4 已完成 */
export type OrderStatus = -1 | 0 | 1 | 2 | 3 | 4;

export type OrderFilter = 'all' | 'unpaid' | 'toship' | 'shipping' | 'toreceive' | 'aftersale';

export interface OrderStep {
  label: string; // display: '已下单'
  time: string; // display: '7月15日 09:24', '待付款', '—'
}

export interface LogisticsEvent {
  time: string; // display
  text: string; // display
}

export interface AddressSnapshot {
  name: string;
  phone: string; // display, masked
  addr: string;
}

export type ReturnKind = '退货' | '换货';

export interface ReturnRequest {
  type: ReturnKind;
  reason: string;
  note: string;
  photos: ImageUrl[];
  time: string; // display: when it was submitted
  /** steps done of 提交申请 · 商家审核 · 寄回商品 · 退款完成/换货完成 */
  stage: 1 | 2 | 3 | 4;
}

export interface ReturnInput {
  type: ReturnKind;
  reason: string;
  note: string; // at most 120 characters
  /** already downscaled by the client; at most 3 */
  photos: Blob[];
}

export interface Order {
  id: string; // 'VT20260715092418'
  shop: string; // display: the store's full name at order time, 'Reformation 官方旗舰店'
  productId: string;
  title: string; // display: colour short name + cardName
  color: string; // colour id
  colorLabel: string; // display
  size: string;
  qty: number;
  price: Yuan; // unit price
  paid: Yuan; // amount paid, or due when unpaid
  coupon: Yuan;
  shipping: Yuan;
  payment: PaymentMethodId;
  /** copied when the order is placed; later address-book edits don't change it */
  address: AddressSnapshot;
  status: OrderStatus;
  /** steps done on the 4-step tracker (1–4) */
  progress: number;
  eta: string; // display: '7月18日', '付款后 3 天内'
  payBy?: string; // display, unpaid orders only
  steps: OrderStep[]; // always 4
  logistics: LogisticsEvent[]; // newest first
  created: string; // display: '2026-07-15 09:24:18'
  carrier: string; // display: '顺丰速运 SF1428 6630 9921' or '待分配'
  return: ReturnRequest | null;
}

export type OrderCounts = Record<OrderFilter, number>;

/** What 结算下单 sends. The server recomputes every amount. */
export interface OrderDraft {
  productId: string;
  color: string;
  size: string;
  qty: number; // 1–9
  addressId: string;
  shipping: ShippingOptionId;
  payment: PaymentMethodId;
  /** DRAFT: the active avatar; the purchase joins its wardrobe (HANDOFF §9.4, §9.15) */
  avatarId: string;
}

/**
 * What the client must do to pay. The mock always returns { kind: 'demo' }. In demo mode the UI
 * opens the simulated cashier first and calls create → pay → confirmDemoPayment only after
 * 确认支付 (HANDOFF §9.4).
 */
export type PaymentAction =
  | { kind: 'demo' }
  | { kind: 'redirect'; url: string } // Alipay mobile web, WeChat Pay H5
  | { kind: 'wechat-jsapi'; params: Record<string, string> } // inside WeChat
  | { kind: 'paid' }; // nothing to do (e.g. zero amount)

/* -------------------------------------------------------------- checkout */

export type ShippingOptionId = 'standard' | 'express';

export interface ShippingOption {
  id: ShippingOptionId;
  name: string; // display: '标准快递'
  price: Yuan;
  note: string; // display: '免费配送', '+¥12'
  etaDays: number;
}

export type PaymentMethodId = 'alipay' | 'wechat' | 'unionpay' | 'card';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string; // display: '支付宝'
  logo?: ImageUrl;
  /** icon name when there is no logo image ('card') */
  icon?: string;
  /** display, the bound account shown on 支付方式: '已绑定 · 138****8888' */
  account?: string;
}

export interface CheckoutOptions {
  shipping: ShippingOption[];
  payments: PaymentMethod[];
  /** the flat coupon on every order (¥20 in the demo) */
  coupon: Yuan;
}

/* ----------------------------------------------------------- notifications */

/** An entry in the 「消息通知」 sheet, opened from the first row of 商家消息. */
export interface Notice {
  id: string;
  icon: string;
  title: string; // display
  text: string; // display
  time: string; // display: '10 分钟前'
  link:
    | { kind: 'product'; productId: string }
    | { kind: 'order'; orderId: string }
    | { kind: 'tab'; tab: 'home' | 'plaza' | 'wardrobe' | 'stylist' | 'me' };
}

/* ------------------------------------------------------- account & settings */

export interface Address {
  id: string;
  name: string; // at most 12 characters
  phone: string; // display, masked: '139****5678'
  addr: string; // at most 48 characters
  tag?: string; // display: '家', '公司', '学校'
  isDefault?: boolean;
}

export interface AddressInput {
  name: string;
  /** 11 digits; omit when editing to keep the stored number */
  phone?: string;
  addr: string;
  tag: string;
  isDefault: boolean;
}

export interface Profile {
  name: string; // at most 12 characters
  bio: string; // at most 20 characters
  photo: ImageUrl | null;
  gender: '女' | '男' | '保密';
  birthday: string; // 'YYYY-MM-DD' or ''
  phone: string; // display, masked: '138****8888'
}

export type ProfilePatch = Partial<Pick<Profile, 'name' | 'bio' | 'gender' | 'birthday'>>;

export interface Settings {
  avatarPrefs: { sizeTips: boolean; stylistUse: boolean };
  notify: { order: boolean; price: boolean; newin: boolean; stylist: boolean; system: boolean; quiet: boolean };
  privacy: { personalized: boolean; wardrobeAI: boolean };
  prefs: {
    sizeStd: '中国码' | '国际码（S / M / L）' | '欧码（EU）';
    quickPay: boolean;
    /** the default on 支付方式; checkout starts from it */
    defaultPayment: PaymentMethodId;
  };
}

/** Partial update: only the keys present change. */
export type SettingsPatch = { [K in keyof Settings]?: Partial<Settings[K]> };

export interface Session {
  loggedIn: boolean;
  phone: string | null; // display, masked
}

export interface LoginInput {
  phone: string;
  code: string;
}

/* --------------------------------------------------------------- support */

export interface Faq {
  q: string;
  a: string;
}

export interface FeedbackInput {
  text: string; // at most 200 characters
}

/** Who a chat is with: the shop of an order (联系商家) or the app's service desk (在线客服). */
export type SupportChannel = { kind: 'merchant'; orderId: string } | { kind: 'service'; orderId?: string };

export interface SupportMessage {
  id: string;
  from: 'me' | 'agent';
  text: string;
}

export interface SupportChat {
  title: string; // display: the shop name, or '在线客服 · 小衣'
  messages: SupportMessage[]; // starts with the greeting
  quickQuestions: string[]; // display, the chips
}

/* ---------------------------------------------------------------- errors */

export type ApiErrorCode =
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'CONFLICT'
  | 'CONTENT_REJECTED'
  | 'INTERNAL';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** Chinese, safe to show to the user as is */
  readonly userMessage?: string;

  constructor(code: ApiErrorCode, message: string, userMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.userMessage = userMessage;
  }
}
