/* ==========================================================================
   Personal media: avatar photos and video frames. They stay on this device in
   IndexedDB and never go into localStorage or over the network. The state
   keeps references only: { media: key, name, w, h }. VT.media.src(ref) gives
   an object URL: at once for anything put() in this session, and after init()
   (start-up) for what earlier sessions stored, when the app re-renders.
   Avatar photos saved by earlier versions as data URLs are moved here.
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

  const media = {
    /** store a blob; resolves with its key. Its object URL is usable at once */
    async put(blob) {
      const key = newKey();
      urls.set(key, URL.createObjectURL(blob));
      await run('readwrite', (st) => st.put(blob, key));
      return key;
    },
    /** an object URL for a reference ({ media } or an old { src }), or null while it isn't loaded */
    src(ref) {
      if (!ref) return null;
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
    keysInState(s) { return [].concat(...avatarsOf(s).map((av) => media.keysOf(av))); },
    /** start-up: move old data-URL photos here, load what the state refers to, drop the rest */
    async init() {
      const s = VT.store.get();
      let moved = false;
      for (const av of avatarsOf(s)) {
        for (const k of ['fullbody', 'portrait']) {
          const r = av[k];
          if (!r || !r.src || !String(r.src).startsWith('data:')) continue;
          try {
            const blob = await (await fetch(r.src)).blob();
            av[k] = { media: await media.put(blob), name: r.name, w: r.w, h: r.h };
            moved = true;
          } catch (e) { /* keep the old copy */ }
        }
      }
      if (moved) VT.store.update(() => {});
      const keep = new Set(media.keysInState(VT.store.get()));
      const stored = (await run('readonly', (st) => st.getAllKeys())) || [];
      await Promise.all(stored.filter((k) => keep.has(k) && !urls.has(k)).map(async (k) => {
        const blob = await run('readonly', (st) => st.get(k));
        if (blob) urls.set(k, URL.createObjectURL(blob));
      }));
      // anything no avatar refers to: abandoned drafts of an unfinished 创建数字分身
      await media.remove(stored.filter((k) => !keep.has(k)));
      if (VT.liveApp && keep.size) VT.liveApp.refresh();
    },
  };

  VT.media = media;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => media.init());
  else media.init();
})();
