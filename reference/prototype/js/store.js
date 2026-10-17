/* ==========================================================================
   Demo state + localStorage persistence.
   Persisted: first-launch flag, avatar, favorites, wardrobe, outfit, cart,
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
    return {
      v: 2,
      setupDone: false, // onboarding + avatar creation finished (first launch only)
      avatar: { status: 'none', fullbody: null, portrait: null, generatedAt: null },
      favorites: Object.fromEntries(d.seedFavorites.map((p) => [p, true])),
      wardrobe: d.seedWardrobe.map((w, i) => ({ uid: 'w' + (i + 1), p: w.p, fav: w.fav, source: w.source, addedAt: 0 })),
      fit: { cat: 'upper', outfit: {} },
      tryQueue: [],
      cart: null,
      checkout: { address: 'a1', shipping: 'standard', payment: 'alipay', agree: true },
      orders: clone(d.seedOrders),
      currentOrder: d.seedOrder.id,
      savedLooks: {},
      chat: clone(d.chatSeed),
      plaza: { cat: 'all', q: '' },
      wardrobeCat: 'all',
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
    };
  }

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

  VT.store = { get, update, subscribe, reset, defaults, load, uid, h: helpers, KEY };
})();
