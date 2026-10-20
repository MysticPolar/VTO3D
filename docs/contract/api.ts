/**
 * API contract, part 2: the operations.
 *
 * Copy to src/api/api.ts unchanged. Screens never call this directly: they use the
 * TanStack Query hooks in src/api/hooks, which wrap `api` from src/api/client.ts.
 * Every method may reject with ApiError (types.ts). Demo behaviour of each method
 * is described in docs/HANDOFF.md §9.
 */
import type {
  Address,
  AddressInput,
  Avatar,
  AvatarCreateInput,
  AvatarJob,
  AvatarPhotoKind,
  Banner,
  Body,
  CategoryTab,
  ChatMessage,
  CheckoutOptions,
  Faq,
  FeedbackInput,
  HistoryEntry,
  LoginInput,
  Look,
  Notice,
  Order,
  OrderCounts,
  OrderDraft,
  OrderFilter,
  Outfit,
  PaymentAction,
  PaymentMethodId,
  Product,
  ProductQuery,
  Profile,
  ProfilePatch,
  RecentChat,
  Render,
  RenderResult,
  ReturnInput,
  ReviewSummary,
  SavedLook,
  Session,
  Settings,
  SettingsPatch,
  SizeGuide,
  Store,
  StoreChat,
  StoreChatMessage,
  StoreChatSummary,
  StylistSendInput,
  SupportChannel,
  SupportChat,
  SupportMessage,
  TryOnCategory,
  WardrobeChoice,
  WardrobeItem,
  WardrobeUploadInput,
} from './types';

export interface Api {
  auth: {
    session(): Promise<Session>;
    /** sends an SMS code; the mock returns it so the demo can fill it in */
    requestCode(phone: string): Promise<{ demoCode?: string }>;
    login(input: LoginInput): Promise<Session>;
    logout(): Promise<void>;
  };

  catalog: {
    /** the 购物广场 feed in feed order, filtered (HANDOFF §9.1); `{ store }` alone = a store sheet's products */
    list(query?: ProductQuery): Promise<Product[]>;
    get(productId: string): Promise<Product>;
    /** category tabs; each screen has its own order */
    categories(screen: 'plaza' | 'wardrobe'): Promise<CategoryTab[]>;
    /** the 首页 garment menu with full lists; 首页 filters them with renders() (HANDOFF §9.2) */
    tryOnCategories(): Promise<TryOnCategory[]>;
    renders(): Promise<Render[]>;
    looks(): Promise<Look[]>;
    reviews(productId: string): Promise<ReviewSummary>;
    sizeGuide(productId: string): Promise<SizeGuide>;
    /** 拍照找同款: products similar to a photo (already downscaled) */
    similar(photo: Blob): Promise<Product[]>;
    /** the platform banners at the head of the 全部 feed, each with its picks (秋日灵感穿搭) */
    banners(): Promise<Banner[]>;
  };

  stores: {
    /** every store in display order, or the ones matching a search (HANDOFF §9.1) */
    list(query?: string): Promise<Store[]>;
    get(storeId: string): Promise<Store>;
    /** the user's favourite storeIds in 购物广场 bar order: newest favourite first */
    favorites(): Promise<string[]>;
    /** favourite (moves it to the front) or unfavourite a store; resolves with the new list */
    setFavorite(storeId: string, on: boolean): Promise<string[]>;
  };

  storeChats: {
    /** 商家消息: chats with at least one message, newest first; the 购物广场 badge sums `unread` */
    list(): Promise<StoreChatSummary[]>;
    /** the chat sheet; opening marks the chat read */
    open(storeId: string): Promise<StoreChat>;
    /**
     * stores my message at once (after the greeting when the chat was empty) and resolves with
     * [mine, reply] when the store answers (demo: 900 ms, scripted, HANDOFF §9.14). The reply counts
     * as unread until markRead, which the UI calls when the reply arrives while the sheet is open.
     */
    send(storeId: string, text: string): Promise<StoreChatMessage[]>;
    markRead(storeId: string): Promise<void>;
  };

  favorites: {
    /** hearted productIds, in the order they were first hearted */
    list(): Promise<string[]>;
    set(productId: string, on: boolean): Promise<void>;
  };

  savedLooks: {
    /** newest first */
    list(): Promise<SavedLook[]>;
    set(lookId: string, on: boolean): Promise<void>;
  };

  history: {
    /** newest first, one entry per product, at most 30 */
    list(): Promise<HistoryEntry[]>;
    record(productId: string): Promise<void>;
    clear(): Promise<void>;
  };

  /** DRAFT: every avatar has its own wardrobe; the calls name it (HANDOFF §9.15) */
  wardrobe: {
    /** stored order: seed order, new items first (never re-sorted by date) */
    list(avatarId: string): Promise<WardrobeItem[]>;
    /** 加入衣橱. If the product is already there, only its colour and size change (isNew false). */
    add(avatarId: string, productId: string, choice: WardrobeChoice): Promise<{ item: WardrobeItem; isNew: boolean }>;
    /** 个人衣橱's 添加衣物, and 首页's 加入衣橱 for a 我的上传 photo */
    upload(avatarId: string, input: WardrobeUploadInput): Promise<WardrobeItem>;
    setFav(avatarId: string, uid: string, fav: boolean): Promise<void>;
    /** rejects with VALIDATION for 'owned' items */
    remove(avatarId: string, uid: string): Promise<void>;
  };

  fitting: {
    /** the on-body image of that avatar wearing an outfit (mock: pickRender, HANDOFF §9.3; every avatar
     *  renders as the preset model). DRAFT: `avatarId` is new. */
    render(avatarId: string, outfit: Outfit): Promise<RenderResult>;
  };

  stylist: {
    messages(): Promise<ChatMessage[]>;
    /** resolves with the new messages: the user's message first, then the reply */
    send(input: StylistSendInput): Promise<ChatMessage[]>;
    /** the 「最近的对话」 list in the 历史造型 sheet */
    recentChats(): Promise<RecentChat[]>;
    /** the quick-question chips under the thread */
    suggestions(): Promise<string[]>;
  };

  /** DRAFT: the account's digital avatars, 本人 first (HANDOFF §9.15, §13.1 #14) */
  avatars: {
    list(): Promise<Avatar[]>;
    /** 新建数字分身: creates the avatar from the picked photos and starts generating it. Cancelling the
     *  job removes the avatar again, so a cancelled creation leaves nothing behind. */
    create(input: AvatarCreateInput): Promise<{ avatar: Avatar; job: AvatarJob }>;
    /** rejects with VALIDATION for 本人 (rename the profile instead) */
    rename(avatarId: string, name: string): Promise<Avatar>;
    /** deletes the avatar with its photos and wardrobe; rejects with VALIDATION for 本人 */
    remove(avatarId: string): Promise<void>;
  };

  /** DRAFT: one avatar's photos, generation and body data; the calls name the avatar */
  avatar: {
    get(avatarId: string): Promise<Avatar>;
    /** stores a photo (already downscaled); a ready avatar becomes 'stale' */
    uploadPhoto(avatarId: string, kind: AvatarPhotoKind, image: Blob, fileName: string): Promise<Avatar>;
    /** use the preset demo avatar without generating (跳过, 登录, 试穿 before setup) */
    useDemo(avatarId: string): Promise<Avatar>;
    /** start generating from the stored photos (samples stand in for missing ones) */
    generate(avatarId: string): Promise<AvatarJob>;
    job(jobId: string): Promise<AvatarJob>;
    cancel(jobId: string): Promise<void>;
    body(avatarId: string): Promise<Body>;
    updateBody(avatarId: string, body: Body): Promise<Body>;
  };

  checkout: {
    options(): Promise<CheckoutOptions>;
  };

  orders: {
    /** stored order: seed order, new orders first (never re-sorted by date) */
    list(filter?: OrderFilter): Promise<Order[]>;
    counts(): Promise<OrderCounts>;
    get(orderId: string): Promise<Order>;
    /** creates an unpaid order (status -1); hidden from list/counts until paid (HANDOFF §9.4) */
    create(draft: OrderDraft): Promise<Order>;
    pay(orderId: string, method: PaymentMethodId): Promise<PaymentAction>;
    /**
     * demo only: completes the payment after the simulated cashier. An order made by create()
     * and never paid gets the checkout outcome (§9.4); any other unpaid order the re-pay outcome (§9.5).
     */
    confirmDemoPayment(orderId: string): Promise<Order>;
    /** unpaid orders only; the order is deleted (the demo has no 已取消 status) */
    cancel(orderId: string): Promise<void>;
    confirmReceipt(orderId: string): Promise<Order>;
    submitReturn(orderId: string, input: ReturnInput): Promise<Order>;
    withdrawReturn(orderId: string): Promise<Order>;
  };

  notices: {
    /** the 「消息通知」 sheet, opened from the first row of 商家消息 */
    list(): Promise<Notice[]>;
  };

  addresses: {
    /** in stored order; may be empty */
    list(): Promise<Address[]>;
    create(input: AddressInput): Promise<Address>;
    update(addressId: string, input: AddressInput): Promise<Address>;
    remove(addressId: string): Promise<void>;
    /** exactly one address is the default whenever the book is not empty */
    setDefault(addressId: string): Promise<void>;
  };

  profile: {
    get(): Promise<Profile>;
    update(patch: ProfilePatch): Promise<Profile>;
    /** already cropped to a square and downscaled by the client */
    setPhoto(image: Blob): Promise<Profile>;
  };

  settings: {
    get(): Promise<Settings>;
    update(patch: SettingsPatch): Promise<Settings>;
  };

  privacy: {
    /** 清除已上传的照片: avatar photos, profile photo and return evidence */
    clearUploadedPhotos(): Promise<void>;
  };

  support: {
    faqs(): Promise<Faq[]>;
    feedback(input: FeedbackInput): Promise<void>;
    /** opens a chat; the demo starts a fresh thread every time */
    openChat(channel: SupportChannel): Promise<SupportChat>;
    /** resolves with the new messages: mine first, then the reply */
    send(channel: SupportChannel, text: string): Promise<SupportMessage[]>;
  };

  /** demo builds only (isDemo()) */
  devtools: {
    reset(): Promise<void>;
  };
}
