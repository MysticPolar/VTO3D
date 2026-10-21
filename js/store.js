/* ==========================================================================
   Demo state + localStorage persistence.
   Persisted: first-launch flag, avatar, favorites, favourite stores, store
   chats, wardrobe, 搭配集, 穿搭瞬间, digital avatars (切换角色), outfit, cart,
   orders + returns, saved looks, chat, filters, profile, addresses, history
   and settings. Use VT.store.reset() to restore.
   ========================================================================== */
(function () {
  const VT = (window.VT = window.VT || {});
  const KEY = 'vt-prototype-state-v1';
  const D = () => VT.data;

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  const clone = (x) => JSON.parse(JSON.stringify(x));

  function defaults() {
    const d = D();
    const wardrobe = d.seedWardrobe.map((w, i) => ({ uid: 'w' + (i + 1), p: w.p, fav: w.fav, source: w.source, addedAt: 0 }));
    return {
      v: 2,
      setupDone: false, // onboarding + avatar creation finished (first launch only)
      avatar: { status: 'none', fullbody: null, portrait: null, generatedAt: null },
      favorites: Object.fromEntries(d.seedFavorites.map((p) => [p, true])),
      wardrobe,
      fit: { cat: 'upper', outfit: {} },
      tryQueue: [],
      cart: null,
      checkout: { address: 'a1', shipping: 'standard', payment: 'alipay', agree: true },
      orders: clone(d.seedOrders),
      currentOrder: d.seedOrder.id,
      savedLooks: {},
      chat: clone(d.chatSeed),
      plaza: { cat: 'all', q: '', store: 'all' },
      storeFavs: d.seedStoreFavs.slice(), // favourite stores, in 购物广场 bar order
      storeChats: clone(d.storeChatSeed), // 商家消息
      wardrobeCat: 'all',
      wardrobeView: 'clothes', // 个人衣橱: 衣服 · 搭配集 · 穿搭瞬间
      selections: {},
      returns: clone(d.seedReturns),
      history: clone(d.seedHistory),
      addresses: clone(d.addresses),
      profile: { name: '小橙子', bio: '开启更美的每一天', photo: null, gender: '女', birthday: '1998-06-18', phone: '138****8888' },
      body: { height: 165, weight: 48, size: 'M', shoe: '37' },
      avatarPrefs: { sizeTips: true, stylistUse: true },
      notify: { order: true, price: true, newin: false, stylist: true, system: true, quiet: false },
      privacy: { personalized: true, wardrobeAI: true },
      prefs: { sizeStd: '中国码', quickPay: false },
      loggedIn: false,
      // 切换角色: every digital avatar has its own photos, body data, wardrobe, outfit, try-on
      // queue, 搭配集 (collections) and 穿搭瞬间 (moments). The active one's live in the fields
      // above (avatar, body, wardrobe, fit.outfit, tryQueue) and below; the others are stashed in
      // `data`. 本人 comes with three demo people (伴侣 · 爸爸 · 妈妈, data.seedRoles).
      collections: seedCollections(d.seedCollections, wardrobe),
      moments: clone(d.seedMoments),
      avatars: [{ id: 'me', name: null, self: true, createdAt: 0, portrait: d.mePortrait }].concat(d.seedRoles.map(roleRecord)),
      activeAvatar: 'me',
      fitScene: 'taupe', // 切换场景: the backdrop behind the avatar on 首页
    };
  }

  /* ---------- digital avatars (切换角色) ---------- */
  const PER_AVATAR = ['avatar', 'body', 'wardrobe', 'tryQueue', 'collections', 'moments'];

  function freshAvatarData(avatar) {
    const d = defaults();
    return { avatar: Object.assign(d.avatar, avatar || {}), body: d.body, wardrobe: [], tryQueue: [], outfit: {}, collections: [], moments: [] };
  }
  /** seed 搭配集: product ids → the uids of those garments in `wardrobe` */
  function seedCollections(list, wardrobe) {
    return list.map((c) => ({
      id: c.id, name: c.name, cover: c.cover || null, createdAt: 0,
      items: c.items.map((p) => (wardrobe.find((w) => w.p === p) || {}).uid).filter(Boolean),
    }));
  }
  /** a demo person (伴侣 / 爸爸 / 妈妈) with their own wardrobe, 搭配集 and body data, stashed until switched to */
  function roleRecord(r) {
    const wardrobe = r.wardrobe.map((p, i) => ({ uid: `${r.id}-w${i + 1}`, p, fav: r.favs.includes(p), source: 'owned', addedAt: 0 }));
    return {
      id: r.id, name: r.name, self: false, demo: true, createdAt: 0, portrait: r.portrait,
      data: {
        avatar: { status: 'none', fullbody: null, portrait: null, generatedAt: null }, body: clone(r.body), wardrobe, tryQueue: [], outfit: {},
        collections: seedCollections(r.collections, wardrobe), moments: [],
      },
    };
  }
  /** a state saved before 搭配集 / 穿搭瞬间 and the demo people: 本人 gets the seed ones, the people are added */
  function addWardrobeV2(s, fresh) {
    const me = s.avatars.find((a) => a.self) || s.avatars[0];
    const live = me.id === s.activeAvatar;
    const mine = { collections: seedCollections(D().seedCollections, live ? s.wardrobe : (me.data && me.data.wardrobe) || []), moments: fresh.moments };
    if (live) Object.assign(s, mine);
    else {
      Object.assign(s, { collections: [], moments: [] });
      if (me.data) Object.assign(me.data, mine);
    }
    if (!me.portrait) me.portrait = D().mePortrait;
    fresh.avatars.filter((a) => !a.self && !s.avatars.some((x) => x.id === a.id)).forEach((a) => s.avatars.push(a));
  }
  /** move the active avatar's live fields into its record */
  function stash(s) {
    const rec = s.avatars.find((a) => a.id === s.activeAvatar);
    if (!rec) return;
    rec.data = clone(Object.assign(Object.fromEntries(PER_AVATAR.map((k) => [k, s[k]])), { outfit: s.fit.outfit }));
  }
  /** make `rec` the active avatar: its stashed fields become the live ones */
  function unstash(s, rec) {
    const data = rec.data || freshAvatarData();
    const fresh = freshAvatarData();
    PER_AVATAR.forEach((k) => { s[k] = k in data ? data[k] : fresh[k]; }); // records stashed before a field existed
    s.fit.outfit = data.outfit || {};
    delete rec.data;
    s.activeAvatar = rec.id;
  }
  const avatars = {
    list(s) { return s.avatars; },
    active(s) { return s.avatars.find((a) => a.id === s.activeAvatar) || s.avatars[0]; },
    /** 本人 follows the profile nickname */
    nameOf(s, rec) { return rec.self ? (s.profile.name || '我') : rec.name; },
    dataOf(s, rec) {
      return rec.id === s.activeAvatar ? { avatar: s.avatar, wardrobe: s.wardrobe, collections: s.collections, moments: s.moments } : (rec.data || freshAvatarData());
    },
    /** the uploaded 生活照, else (本人) the profile picture, else the demo portrait */
    portraitOf(s, rec) {
      const a = avatars.dataOf(s, rec).avatar;
      return (VT.media && VT.media.src(a.portrait)) || (rec.self && s.profile.photo) || rec.portrait || 'assets/people/chat-user.webp';
    },
    switchTo(id) {
      update((s) => {
        const rec = s.avatars.find((a) => a.id === id);
        if (!rec || id === s.activeAvatar) return;
        stash(s);
        unstash(s, rec);
      });
    },
    /** add an avatar (already generated) and make it the active one */
    create(name, avatar) {
      let id = null;
      update((s) => {
        stash(s);
        const rec = { id: uid('av'), name, self: false, createdAt: Date.now(), data: freshAvatarData(avatar) };
        s.avatars.push(rec);
        unstash(s, rec);
        id = rec.id;
      });
      return id;
    },
    rename(id, name) { update((s) => { const rec = s.avatars.find((a) => a.id === id); if (rec && !rec.self) rec.name = name; }); },
    /** 本人 can't be removed; removing the active avatar switches back to 本人 */
    remove(id) {
      update((s) => {
        const rec = s.avatars.find((a) => a.id === id);
        if (!rec || rec.self) return;
        if (s.activeAvatar === id) {
          const self = s.avatars.find((a) => a.self);
          delete rec.data;
          unstash(s, self);
        }
        s.avatars = s.avatars.filter((a) => a.id !== id);
      });
    },
  };

  let state = null;
  let saveTimer = null;
  const listeners = new Set();

  function load() {
    let saved = null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) { saved = null; }
    const base = defaults();
    if (saved && saved.v === base.v) {
      const fresh = defaults();
      state = Object.assign(base, saved);
      // tolerate old/partial objects
      ['fit', 'checkout', 'profile', 'body', 'avatarPrefs', 'notify', 'privacy', 'prefs', 'avatar', 'plaza'].forEach((k) => {
        state[k] = Object.assign(fresh[k], saved[k] || {});
      });
      if (!('collections' in saved)) addWardrobeV2(state, fresh);
    } else {
      state = base;
    }
    return state;
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        // storage full / disabled (e.g. private mode): keep working in memory
        console.info('[store] persistence unavailable:', e && e.name);
      }
    }, 120);
  }

  function get() { return state || load(); }

  /** update(fn): mutate state inside fn, then persist + notify */
  function update(fn, meta) {
    const s = get();
    fn(s);
    persist();
    listeners.forEach((l) => { try { l(s, meta || {}); } catch (e) { console.error(e); } });
    return s;
  }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function reset() {
    state = defaults();
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    persist();
    listeners.forEach((l) => l(state, { reset: true }));
  }

  /* ---------- domain helpers ---------- */
  const helpers = {
    /* wishlist hearts (plaza / product page) */
    isFav(s, pid) { return !!s.favorites[pid]; },
    selection(s, pid) {
      const p = D().byId[pid];
      const sel = s.selections[pid] || {};
      return { color: sel.color || p.colors[0].id, size: sel.size || p.defaultSize };
    },
    inWardrobe(s, pid) { return s.wardrobe.some((w) => w.p === pid); },
    order(s, id) { return s.orders.find((o) => o.id === (id || s.currentOrder)) || s.orders[0]; },
    addresses(s) { return s.addresses && s.addresses.length ? s.addresses : D().addresses; },
    address(s, id) { const all = helpers.addresses(s); return all.find((a) => a.id === id) || all.find((a) => a.isDefault) || all[0]; },
    favCount(s) { return Object.values(s.favorites).filter(Boolean).length + Object.keys(s.savedLooks).length; },
    statusLabel(o) { return D().orderStatus[o.status] || '处理中'; },
    /** which 我的订单 filter an order belongs to */
    inFilter(s, o, f) {
      if (f === 'all') return true;
      if (f === 'aftersale') return !!s.returns[o.id];
      return { unpaid: [-1], toship: [0], shipping: [1, 2], toreceive: [3] }[f].includes(o.status);
    },
    /** record a product view for 浏览记录 */
    viewed(s, pid) {
      const now = new Date();
      const t = `今天 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      s.history = [{ p: pid, t }].concat((s.history || []).filter((h) => h.p !== pid)).slice(0, 30);
    },
  };

  VT.store = { get, update, subscribe, reset, defaults, load, uid, h: helpers, avatars, KEY };
})();
