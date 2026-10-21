/* ==========================================================================
   Garments — the one clothing model of the app. 首页's rail, 个人衣橱, AI 造型师,
   购物广场 and 我的 read and change the same records, only through VT.garments.

   Every person (切换角色) has their own records; the product behind one (image, store,
   price) is shared. A record:
     uid, avatarId
     p, merchantId         a catalog product (p is its productId) and the store selling it
     custom {src,name,cat} or a photo of a garment (cat: top bottom dress outer shoes bag acc)
     source                how it entered the app, kept for good:
                           'manual'         already there, or entered by hand
                           'shopping_plaza' 加入衣橱 / 试穿 from a product, or a purchase
                           'photo_upload'   拍照 / 相册 on 首页, 添加衣物 in 个人衣橱
     isOwned               the person physically owns it. Only a confirmation sets it: the
                           user's 标记为已拥有, or 确认收货 of their order. Never the source,
                           saving, a heart, a try-on or a checkout. It is the ✓ (VT.ui.ownMark).
     isSavedToWardrobe     in the person's wardrobe: state `wardrobe` (persisted), the
                           个人衣橱 grid and the counts on 我的
     isTemporary           this fitting session only (sessionStorage): photos taken on 首页
                           and products tried on before they're saved. 首页 lists them;
                           加入衣橱 moves the same record into the wardrobe.
     fav, color, size, addedAt, fromUpload (a photo saved before this model)
   One product has at most one record per person. The API contract calls p / custom
   productId / upload.
   ========================================================================== */
(function () {
  const VT = (window.VT = window.VT || {});
  const D = () => VT.data;
  const SOURCE = { manual: 'manual', plaza: 'shopping_plaza', upload: 'photo_upload' };
  /** the 首页 menu category of each garment category (a product can be listed under more, data.fitCatsAll) */
  const FIT_OF = { top: 'upper', bottom: 'lower', dress: 'dress', outer: 'outer', shoes: 'shoes', bag: 'bag', acc: 'acc' };
  const CAT_OF = Object.fromEntries(Object.entries(FIT_OF).map(([cat, fit]) => [fit, cat]));

  function make(o) {
    const temp = !!o.isTemporary;
    const g = {
      uid: o.uid || VT.store.uid(o.custom ? 'u' : 'w'), avatarId: o.avatarId, source: o.source,
      isOwned: !!o.isOwned, isSavedToWardrobe: !temp, isTemporary: temp,
      fav: !!o.fav, addedAt: o.addedAt == null ? Date.now() : o.addedAt,
    };
    if (o.custom) g.custom = o.custom;
    else { g.p = o.p; g.merchantId = D().storeOf(D().byId[o.p]).id; }
    if (o.color) g.color = o.color;
    if (o.size) g.size = o.size;
    return g;
  }

  /** the demo wardrobes (data.js): `own` garments are owned, the others were added from 购物广场 */
  function seed(avatarId, list, uidOf) {
    return list.map((w, i) => make({ uid: uidOf(i), avatarId, p: w.p, fav: w.fav, addedAt: 0, isOwned: !!w.own, source: w.own ? SOURCE.manual : SOURCE.plaza }));
  }

  /* records saved before this model: source owned · collected · purchased · uploaded */
  const LEGACY = { owned: [SOURCE.manual, true], collected: [SOURCE.plaza, false], purchased: [SOURCE.plaza, false], uploaded: [SOURCE.upload, false] };
  function upgrade(list, avatarId, orders) {
    (list || []).forEach((g) => {
      if (!('isOwned' in g)) {
        const [source, owned] = LEGACY[g.source] || (g.custom ? LEGACY.uploaded : LEGACY.collected);
        // a purchase counts as owned once its order was received (已完成)
        g.isOwned = owned || (g.source === 'purchased' && orders.some((o) => o.p === g.p && o.status === 4));
        g.source = source;
        g.isSavedToWardrobe = true;
        g.isTemporary = false;
      }
      if (!g.avatarId) g.avatarId = avatarId;
      if (g.p && !g.merchantId && D().byId[g.p]) g.merchantId = D().storeOf(D().byId[g.p]).id;
    });
  }
  function migrate(s) {
    upgrade(s.wardrobe, s.activeAvatar, s.orders || []);
    (s.avatars || []).forEach((a) => { if (a.data) upgrade(a.data.wardrobe, a.id, s.orders || []); });
  }

  /* ---------- temporary garments: this browser session only ---------- */
  const TEMP_KEY = 'vt-garments-temp-v1';
  const OLD_UPLOADS = 'vt-fit-uploads-v1'; // 首页 我的上传 before this model: one list for everyone
  let tempList = null;

  function temps() {
    if (tempList) return tempList;
    let list = [], moved = false;
    try { list = JSON.parse(window.sessionStorage.getItem(TEMP_KEY)) || []; } catch (e) { list = []; }
    try {
      const old = JSON.parse(window.sessionStorage.getItem(OLD_UPLOADS) || 'null');
      if (old && old.length) {
        const s = VT.store.get();
        const kept = new Set(allSaved(s).map((g) => g.fromUpload).filter(Boolean)); // photos already 加入衣橱
        old.filter((u) => !kept.has(u.id)).forEach((u) => list.push(make({
          uid: u.id, avatarId: s.activeAvatar, custom: { src: u.src, name: u.name, cat: CAT_OF[u.cat] || 'top' },
          source: SOURCE.upload, isTemporary: true, addedAt: u.at,
        })));
        moved = true;
      }
      window.sessionStorage.removeItem(OLD_UPLOADS);
    } catch (e) { /* storage unavailable */ }
    tempList = list;
    if (moved) writeTemps();
    return tempList;
  }
  function writeTemps() {
    try { window.sessionStorage.setItem(TEMP_KEY, JSON.stringify(tempList)); } catch (e) { console.info('[garments] session storage unavailable:', e && e.name); }
  }
  function dropTemp(uid) { tempList = temps().filter((g) => g.uid !== uid); writeTemps(); }

  /* ---------- reading ---------- */
  const saved = (s) => s.wardrobe;
  /** the active person's session garments; a product saved meanwhile (e.g. 确认收货 for someone else) is listed once */
  const temp = (s) => temps().filter((g) => g.avatarId === s.activeAvatar && !(g.p && s.wardrobe.some((w) => w.p === g.p)));
  /** the wardrobes of every person, the active one's live */
  const allSaved = (s) => s.wardrobe.concat(...s.avatars.filter((a) => a.data).map((a) => a.data.wardrobe || []));
  /** what the active person can try on: this session's garments (newest first), then the wardrobe in its own order */
  const all = (s) => temp(s).concat(saved(s));
  const find = (s, uid) => saved(s).find((g) => g.uid === uid) || temp(s).find((g) => g.uid === uid) || null;
  const ofProduct = (s, pid) => saved(s).find((g) => g.p === pid) || temp(s).find((g) => g.p === pid) || null;
  /** the active person owns this product (购物广场 cards, 商品详情, AI 造型师) */
  const ownsProduct = (s, pid) => saved(s).some((g) => g.p === pid && g.isOwned);

  /** the user-facing group: ✓ 已拥有, or not confirmed as owned (from 购物广场 / a photo / unclassified) */
  function group(g) {
    if (g.isOwned) return 'owned';
    if (g.source === SOURCE.plaza) return 'shopping_plaza';
    if (g.source === SOURCE.upload) return 'photo_upload';
    return 'unclassified';
  }

  const product = (g) => (g.p ? D().byId[g.p] : null);
  const catOf = (g) => (g.custom ? g.custom.cat : (product(g) || {}).cat);
  const nameOf = (g) => (g.custom ? g.custom.name : (product(g) || {}).name);
  /** listed under a 首页 category by its garment category, or by that category's own list */
  function inFitCat(g, fit) {
    if (FIT_OF[catOf(g)] === fit) return true;
    const c = g.p && D().fitCatsAll.find((x) => x.id === fit);
    return !!(c && c.items.includes(g.p));
  }
  /** the 首页 category a garment opens in: the first list naming it (上装 only for tops and outer layers) */
  function fitCatOf(g) {
    const p = product(g);
    const c = p && D().fitCatsAll.find((x) => x.items.includes(p.id) && (x.id !== 'upper' || ['top', 'outer'].includes(p.cat)));
    return c ? c.id : FIT_OF[catOf(g)];
  }
  /** what the outfit stores: the product id, or up:<uid> for a photo */
  const ref = (g) => (g.custom ? 'up:' + g.uid : g.p);
  function fromRef(s, r) {
    if (typeof r !== 'string') return null;
    if (!r.startsWith('up:')) return ofProduct(s, r);
    const id = r.slice(3);
    return temp(s).find((g) => g.uid === id) || saved(s).find((g) => g.custom && (g.uid === id || g.fromUpload === id)) || null;
  }

  /* ---------- changes: every one lands in the shared records, so each screen shows it next time it draws ---------- */
  function change(fn) {
    let out = null;
    VT.store.update((s) => { out = fn(s); }, { garments: true });
    return out;
  }

  /** 标记为已拥有 / 取消已拥有标记 (个人衣橱): the source stays as it is */
  function setOwned(uid, on) {
    return change((s) => {
      const g = s.wardrobe.find((x) => x.uid === uid);
      if (g) g.isOwned = !!on;
      return g;
    });
  }

  /** a temporary record joins the wardrobe as it is (same uid: the outfit keeps wearing it) */
  function promote(s, t, extra) {
    dropTemp(t.uid);
    Object.assign(t, { isSavedToWardrobe: true, isTemporary: false }, extra || {});
    s.wardrobe.unshift(t);
    return t;
  }

  /** 加入衣橱 from 商品详情: one record per product. An existing one keeps its ownership; a tried-on one is saved. */
  function addProduct(pid, choice) {
    let isNew = false;
    const g = change((s) => {
      let x = s.wardrobe.find((w) => w.p === pid);
      if (!x) {
        const t = temp(s).find((w) => w.p === pid);
        x = t ? promote(s, t) : make({ avatarId: s.activeAvatar, p: pid, source: SOURCE.plaza });
        if (!t) s.wardrobe.unshift(x);
        isNew = true;
      }
      if (choice) { x.color = choice.color; x.size = choice.size; }
      return x;
    });
    return { g, isNew };
  }

  /** 试穿 of products that aren't the person's yet: temporary 购物广场 garments, so 首页 lists them */
  function adopt(s, pids) {
    let added = false;
    pids.forEach((pid) => {
      if (!D().byId[pid] || ofProduct(s, pid)) return;
      temps().unshift(make({ avatarId: s.activeAvatar, p: pid, source: SOURCE.plaza, isTemporary: true }));
      added = true;
    });
    if (added) writeTemps();
    return added;
  }

  /** a garment photo: temporary (首页 拍照 / 相册) until 加入衣橱, or saved at once (个人衣橱 添加衣物) */
  function addPhoto(s, o, opts) {
    const g = make({ avatarId: s.activeAvatar, custom: { src: o.src, name: o.name, cat: o.cat }, source: SOURCE.upload, isTemporary: !(opts && opts.save) });
    if (g.isTemporary) { temps().unshift(g); writeTemps(); } else s.wardrobe.unshift(g);
    return g;
  }

  /** 加入衣橱 on 首页 */
  function keep(uid) {
    return change((s) => {
      const t = temp(s).find((g) => g.uid === uid);
      if (!t) return null;
      const twin = t.p && s.wardrobe.find((g) => g.p === t.p);
      if (twin) { dropTemp(uid); return twin; }
      return promote(s, t);
    });
  }

  /** a purchase (inside the checkout's update): the product joins the wardrobe, not owned until 确认收货 */
  function purchase(s, pid, color, size) {
    if (s.wardrobe.some((g) => g.p === pid)) return;
    const t = temp(s).find((g) => g.p === pid);
    if (t) promote(s, t, { color, size });
    else s.wardrobe.unshift(make({ avatarId: s.activeAvatar, p: pid, source: SOURCE.plaza, color, size }));
  }

  /** 确认收货 (inside the order's update): whoever it was bought for now owns it. A record deleted meanwhile comes back. */
  function received(s, order) {
    const self = s.avatars.find((a) => a.self) || s.avatars[0];
    const rec = s.avatars.find((a) => a.id === order.avatarId) || self;
    const live = rec.id === s.activeAvatar;
    const list = live ? s.wardrobe : rec.data && rec.data.wardrobe;
    if (!list || !D().byId[order.p]) return;
    let g = list.find((x) => x.p === order.p);
    if (!g && live) {
      const t = temp(s).find((x) => x.p === order.p);
      if (t) g = promote(s, t, { color: order.color, size: order.size });
    }
    if (!g) { g = make({ avatarId: rec.id, p: order.p, source: SOURCE.plaza, color: order.color, size: order.size }); list.unshift(g); }
    g.isOwned = true;
  }

  /** a removed person's session garments go too; a reset clears them all */
  function forget(avatarId) { tempList = temps().filter((g) => g.avatarId !== avatarId); writeTemps(); }
  function clearTemp() { tempList = []; writeTemps(); }

  VT.garments = {
    SOURCE, FIT_OF, CAT_OF,
    make, seed, migrate,
    saved, temp, all, find, ofProduct, ownsProduct, group, product, catOf, nameOf, inFitCat, fitCatOf, ref, fromRef,
    setOwned, addProduct, adopt, addPhoto, keep, purchase, received, forget, clearTemp,
  };
})();
