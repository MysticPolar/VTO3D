/* 我的 — My Profile (primary tab 5)
   Hub for the account: profile header, digital avatar, orders, addresses,
   payment, notifications, help and settings. Every row opens a secondary
   screen with a back button. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const H = () => VT.store.h;

  /** center-crop a picked photo to a small square JPEG (keeps localStorage light) */
  function squarePhoto(file, size) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) { reject(new Error('type')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const n = size || 320;
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const cv = document.createElement('canvas');
        cv.width = n; cv.height = n;
        cv.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, n, n);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  async function changePhoto(app, el) {
    const f = el.files && el.files[0];
    if (!f) return;
    try {
      const src = await squarePhoto(f);
      VT.store.update((s) => { s.profile.photo = src; });
      app.refresh();
      app.toast('头像已更新', { icon: 'check' });
    } catch (e) {
      app.toast(e.message === 'type' ? '请选择图片文件（JPG / PNG 等）' : '无法读取这张图片，请换一张');
    }
  }

  function avatarThumb(s) {
    const src = s.avatar.portrait ? s.avatar.portrait.src : 'assets/people/chat-user.webp';
    return `<span class="me-ava-thumb">${VT.ui.img(src, '')}</span>`;
  }

  VT.screens.profile = {
    title: '我的',
    render(app) {
      const s = app.s;
      const row = (to, icon, label, extra) => VT.ui.row({ act: 'nav', attrs: `data-to="${to}"`, icon, label, extra, cls: 'me-row' });
      return `
        ${VT.ui.statusBar('dark')}
        <div class="scroll me-scroll" data-keep-scroll="me">
          <div class="me-band" aria-hidden="true"></div>
          <header class="me-head">
            <label class="me-photo" title="更换头像">
              ${VT.ui.img(VT.ui.profilePhoto(s), '我的头像')}
              <input class="sr-only" type="file" accept="image/*" data-change="photo" aria-label="更换头像">
              <span class="me-photo-cam" aria-hidden="true">${I('camera', { size: 11, stroke: 2 })}</span>
            </label>
            <button type="button" class="me-id" data-act="nav" data-to="editprofile" aria-label="编辑个人资料：${VT.esc(s.profile.name)}">
              <h1 class="me-name">${VT.esc(s.profile.name)}</h1>
              <p class="me-bio">${VT.esc(s.profile.bio || '编辑个性签名')}</p>
            </button>
            ${VT.ui.iconBtn('settings', '设置', 'nav', { attrs: 'data-to="settings"', size: 26, stroke: 1.6, cls: 'me-gear' })}
          </header>
          <section class="me-card me-stats" aria-label="我的数据">
            <button type="button" data-act="tab" data-to="wardrobe"><b>${s.wardrobe.length}</b><span>我的衣橱</span></button>
            <button type="button" data-act="nav" data-to="favorites"><b>${H().favCount(s)}</b><span>我的收藏</span></button>
            <button type="button" data-act="nav" data-to="history"><b>${(s.history || []).length}</b><span>浏览记录</span></button>
          </section>
          <section class="me-card me-orders" aria-labelledby="me-orders-h">
            <div class="me-orders-h"><h2 id="me-orders-h">我的订单</h2><button type="button" class="me-all" data-act="orders" data-f="all">查看全部${I('chevron-right', { size: 15, stroke: 1.8 })}</button></div>
            <div class="me-oicons">${D().orderFilters.filter((f) => f.id !== 'all').map((f) => {
              const n = s.orders.filter((o) => H().inFilter(s, o, f.id)).length;
              return `<button type="button" data-act="orders" data-f="${f.id}" aria-label="${f.label}${n ? `，${n} 个订单` : ''}">${I(f.icon, { size: 30, stroke: 1.45 })}<span>${f.label}</span></button>`;
            }).join('')}</div>
          </section>
          <section class="me-card me-list" aria-label="账户与设置">
            ${row('editprofile', 'person', '我的资料')}
            ${row('avatarhub', 'figure', '我的形象', avatarThumb(s))}
            ${row('addresses', 'pin', '收货地址')}
            ${row('payments', 'card', '支付方式')}
            ${row('notifications', 'bell', '消息通知')}
            ${row('help', 'question', '帮助与客服')}
            ${row('settings', 'settings', '设置')}
          </section>
        </div>
        ${VT.ui.tabBar('profile')}`;
    },
    actions: {
      orders(app, el) { app.go('orderlist', { filter: el.dataset.f }); },
      photo: changePhoto,
    },
  };

  VT.profile = { squarePhoto, changePhoto };
})();
