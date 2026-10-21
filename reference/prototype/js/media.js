/* ==========================================================================
   Personal media: avatar photos and video frames, the profile picture (头像),
   return evidence (售后凭证) and the photos sent to AI 造型师. They stay on
   this device in IndexedDB and never go into localStorage or over the network.
   The state keeps references only: { media: key, name, w, h }. VT.media.src(ref)
   gives an object URL: at once for anything put() in this session, and after
   init() (start-up) for what earlier sessions stored, when the app re-renders.
   Photos saved by earlier versions as data URLs are moved here.
   ========================================================================== */
(function () {
  const VT = (window.VT = window.VT || {});
  const DB = 'vt-prototype-media';
  const STORE = 'blobs';
  const urls = new Map(); // key → object URL
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); } // no IndexedDB (some private modes): media last for this page only
    });
    return dbp;
  }
  /** run one request in a transaction; resolves with its result (null when storage is unavailable) */
  function run(mode, fn) {
    return db().then((d) => new Promise((resolve) => {
      if (!d) { resolve(null); return; }
      let out = null;
      try {
        const t = d.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        if (req) req.onsuccess = () => { out = req.result; };
        t.oncomplete = () => resolve(out);
        t.onerror = t.onabort = () => resolve(null);
      } catch (e) { resolve(null); }
    }));
  }
  const newKey = () => 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  /** every media reference in an avatar's data: its photos, video frames and the two shortcuts */
  function refsOf(av) {
    if (!av) return [];
    const m = av.materials || {};
    const photos = m.photos ? Object.values(m.photos) : [];
    const frames = (m.video && m.video.frames) || [];
    return [av.fullbody, av.portrait].concat(photos, frames).filter(Boolean);
  }
  /** the live avatar and every stashed one (切换角色) */
  function avatarsOf(s) {
    return [s.avatar].concat((s.avatars || []).filter((a) => a.data && a.data.avatar).map((a) => a.data.avatar));
  }
  /** the account's own photos, shared by every avatar: 头像, 售后凭证 and the photos sent to AI 造型师 */
  function personalRefs(s) {
    const returns = Object.values(s.returns || {}).map((r) => r.photos || []);
    return [s.profile && s.profile.photo].concat(...returns, (s.chat || []).map((m) => m.img)).filter(Boolean);
  }
  /** photos earlier versions saved as data URLs: avatar photos as { src }, and until 21 Oct 2026 头像,
      售后凭证 and AI 造型师 photos as bare strings. keyFor(dataUrl) gives the key to refer to instead, or null */
  function relink(s, keyFor) {
    const old = (src) => (typeof src === 'string' && src.startsWith('data:') ? keyFor(src) : null);
    let key;
    avatarsOf(s).forEach((av) => ['fullbody', 'portrait'].forEach((k) => {
      const r = av[k];
      if (r && (key = old(r.src))) av[k] = { media: key, name: r.name, w: r.w, h: r.h };
    }));
    if (s.profile && (key = old(s.profile.photo))) s.profile.photo = { media: key };
    Object.values(s.returns || {}).forEach((r) => (r.photos || []).forEach((p, i) => { if ((key = old(p))) r.photos[i] = { media: key }; }));
    (s.chat || []).forEach((m) => { if ((key = old(m.img))) m.img = { media: key }; });
  }

  const media = {
    /** store a blob; resolves with its key. Its object URL is usable at once */
    async put(blob) {
      const key = newKey();
      urls.set(key, URL.createObjectURL(blob));
      await run('readwrite', (st) => st.put(blob, key));
      return key;
    },
    /** an object URL for a reference ({ media }, or an old { src } or data URL), or null while it isn't loaded */
    src(ref) {
      if (!ref) return null;
      if (typeof ref === 'string') return ref; // saved by an earlier version, until init() moves it
      if (ref.media) return urls.get(ref.media) || null;
      return ref.src || null;
    },
    async remove(keys) {
      const list = (keys || []).filter(Boolean);
      list.forEach((k) => { const u = urls.get(k); if (u) URL.revokeObjectURL(u); urls.delete(k); });
      await Promise.all(list.map((k) => run('readwrite', (st) => st.delete(k))));
    },
    /** the keys an avatar's data refers to */
    keysOf(av) { return refsOf(av).map((r) => r.media).filter(Boolean); },
    /** every key the saved state refers to */
    keysInState(s) { return [].concat(...avatarsOf(s).map((av) => media.keysOf(av)), personalRefs(s).map((r) => r.media)).filter(Boolean); },
    /** start-up: move old data-URL photos here, load what the state refers to, drop the rest */
    async init() {
      const found = [];
      relink(VT.store.get(), (src) => { found.push(src); return null; });
      const moved = new Map(); // data URL → a key for each place it is saved in (no shared blobs)
      for (const src of found) {
        try {
          const key = await media.put(await (await fetch(src)).blob());
          moved.set(src, (moved.get(src) || []).concat(key));
        } catch (e) { /* keep the old copy */ }
      }
      // in an update, on the state as it is now: the app loads its own copy while this waits
      if (moved.size) VT.store.update((s) => relink(s, (src) => (moved.get(src) || []).shift() || null));
      const keep = new Set(media.keysInState(VT.store.get()));
      const stored = (await run('readonly', (st) => st.getAllKeys())) || [];
      await Promise.all(stored.filter((k) => keep.has(k) && !urls.has(k)).map(async (k) => {
        const blob = await run('readonly', (st) => st.get(k));
        if (blob) urls.set(k, URL.createObjectURL(blob));
      }));
      // anything the state doesn't refer to, e.g. the drafts of an unfinished 创建数字分身 or 申请退换货,
      // but nothing this page has made since it opened
      await media.remove(stored.filter((k) => !keep.has(k) && !urls.has(k)));
      if (VT.liveApp && keep.size) VT.liveApp.refresh();
    },
  };

  VT.media = media;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => media.init());
  else media.init();
})();
