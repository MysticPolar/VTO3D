/* ==========================================================================
   Shared UI building blocks (render-to-string helpers).
   Screens compose these so headers, tab bars, cards and buttons stay
   identical wherever they repeat.
   ========================================================================== */
(function () {
  const VT = (window.VT = window.VT || {});
  const I = (n, o) => VT.icon(n, o);

  // true when the prototype runs embedded in another page (e.g. an online
  // preview); such frames usually block the camera and the native share sheet
  VT.framed = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
  const yuan = (n) => '¥' + (Math.round(n * 100) / 100).toLocaleString('zh-CN');

  const ui = {
    esc, nl2br, yuan,

    statusBar(theme) {
      return `<div class="sb sb--${theme || 'dark'}" aria-hidden="true"><span class="sb-time">9:41</span><span class="sb-icons">${VT.statusGlyphs}</span></div>`;
    },

    /** round icon button used in headers */
    iconBtn(icon, label, act, extra) {
      const e = extra || {};
      return `<button class="icon-btn ${e.cls || ''}" type="button" aria-label="${esc(label)}" data-act="${act}"${e.attrs ? ' ' + e.attrs : ''}>${I(icon, { size: e.size || 24, stroke: e.stroke })}</button>`;
    },

    backBtn(theme) {
      return `<button class="icon-btn back-btn ${theme === 'light' ? 'is-light' : ''}" type="button" aria-label="返回" data-act="back">${I('back', { size: 23, stroke: 2.1 })}</button>`;
    },

    /** price like ¥259 with small currency sign */
    price(n, cls) {
      return `<span class="price ${cls || ''}"><span class="price-cur">¥</span>${esc(Math.round(n))}</span>`;
    },

    swatchStyle(hex) {
      if (hex === 'stripe') return 'background:repeating-linear-gradient(90deg,#8FA6CF 0 2.2px,#E9EEF7 2.2px 4.2px)';
      if (hex === 'stripe-grey') return 'background:repeating-linear-gradient(90deg,#AEB3BE 0 1.6px,#E7E7EA 1.6px 3.2px)';
      return `background:${hex}`;
    },

    dots(p) {
      const d = p.dots || p.colors.map((c) => c.hex).slice(0, 4);
      const more = p.dotsMore || 0;
      return `<span class="dots" aria-label="${p.colors.length} 种颜色">${d.map((h) => `<i style="${ui.swatchStyle(h)}"></i>`).join('')}${more ? `<em>+${more}</em>` : ''}</span>`;
    },

    heart(pid, on, opts) {
      const o = opts || {};
      return `<button class="heart-btn ${on ? 'is-on' : ''} ${o.cls || ''}" type="button" data-act="${o.act || 'fav'}" data-pid="${pid}" aria-pressed="${on ? 'true' : 'false'}" aria-label="${on ? '取消收藏' : '收藏'}">${I(on ? 'heart-filled' : 'heart', { size: o.size || 24, stroke: o.stroke || 1.6 })}</button>`;
    },

    /** ✓ 已拥有: the active person owns this garment (VT.garments). Only ownership, never a selection.
        It sits in a thumbnail's top-right corner (`own-mark--l`: top-left, where a heart has that corner). */
    ownMark(on, cls) {
      return on ? `<span class="own-mark ${cls || ''}" aria-hidden="true">${I('check', { size: 10, stroke: 2.4 })}</span>` : '';
    },

    img(src, alt, cls, extra) {
      return `<img class="${cls || ''}" src="${esc(src)}" alt="${esc(alt || '')}" decoding="async" draggable="false"${extra ? ' ' + extra : ''}>`;
    },

    /** the one persistent bottom navigation, shared by the five primary screens */
    tabBar(active) {
      return `<nav class="tabbar" aria-label="主导航">${VT.data.tabs.map((t) => {
        const on = t.id === active;
        return `<button type="button" class="tab ${on ? 'is-on' : ''}" data-act="tab" data-to="${t.id}" ${on ? 'aria-current="page"' : ''}>${I(on ? t.iconOn : t.icon, { size: 28, stroke: 1.55 })}<span>${t.label}</span></button>`;
      }).join('')}</nav>`;
    },

    /** header for secondary screens: back button + centred title (+ optional right action) */
    subHead(title, right) {
      return `${ui.statusBar('dark')}<header class="sub-head">${ui.backBtn()}<h1 class="sub-title">${esc(title)}</h1>${right || ''}</header>`;
    },

    /** settings-style list row; o: { act, icon, label, value, sub, attrs, chevron, extra, cls } */
    row(o) {
      const tag = o.act || o.attrs ? 'button' : 'div';
      return `<${tag} ${tag === 'button' ? 'type="button"' : ''} class="set-row ${o.cls || ''}" ${o.act ? `data-act="${o.act}"` : ''} ${o.attrs || ''}>
        ${o.icon ? `<span class="set-ic">${I(o.icon, { size: 24, stroke: 1.6 })}</span>` : ''}
        <span class="set-main"><span class="set-label">${o.label}</span>${o.sub ? `<span class="set-sub">${o.sub}</span>` : ''}</span>
        ${o.value != null ? `<span class="set-value">${o.value}</span>` : ''}${o.extra || ''}
        ${o.chevron === false || tag === 'div' ? '' : `<span class="set-chev">${I('chevron-right', { size: 18, stroke: 1.7 })}</span>`}
      </${tag}>`;
    },

    /** on/off switch row bound to a state path, e.g. key="notify.order" */
    toggleRow(label, key, on, sub, opts) {
      const o = opts || {};
      return `<div class="set-row set-row--toggle ${o.cls || ''}"><span class="set-main"><span class="set-label" id="lb-${key.replace('.', '-')}">${label}</span>${sub ? `<span class="set-sub">${sub}</span>` : ''}</span>
        <button type="button" role="switch" class="switch ${on ? 'is-on' : ''}" aria-checked="${on}" aria-labelledby="lb-${key.replace('.', '-')}" data-act="${o.act || 'toggle'}" data-key="${key}" ${o.disabled ? 'disabled' : ''}><i></i></button></div>`;
    },

    /** profile picture: uploaded photo, else 本人's 生活照 (never another avatar's: 切换角色 doesn't switch the account), else the demo portrait */
    profilePhoto(s) {
      const self = s.avatars && s.avatars.find((a) => a.self);
      const a = self && self.id !== s.activeAvatar ? self.data && self.data.avatar : s.avatar;
      return VT.media.src(s.profile && s.profile.photo) || (a && VT.media.src(a.portrait)) || 'assets/people/chat-user.webp';
    },
  };

  VT.ui = ui;
  VT.esc = esc;
})();
