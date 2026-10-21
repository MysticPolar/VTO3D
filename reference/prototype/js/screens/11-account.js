/* Account & settings — secondary screens reached from 我的:
   我的资料 (editprofile) · 收货地址 (addresses) · 支付方式 (payments)
   消息通知 (notifications) · 隐私与安全 (privacy) · 设置 (settings) · 帮助与客服 (help)
   Everything is stored locally; nothing is sent anywhere. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const H = () => VT.store.h;
  const esc = (x) => VT.esc(x);
  const mask = (p) => String(p || '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');

  /* on/off switches: data-key="group.key" flips s[group][key] */
  function toggle(app, el) {
    const [grp, key] = el.dataset.key.split('.');
    let on = false;
    VT.store.update((s) => { s[grp][key] = !s[grp][key]; on = s[grp][key]; });
    el.classList.toggle('is-on', on);
    el.setAttribute('aria-checked', on);
  }

  const group = (title, rows, note) => `<section class="set-group">${title ? `<h2 class="set-h">${title}</h2>` : ''}<div class="set-card">${rows.join('')}</div>${note ? `<p class="set-note">${note}</p>` : ''}</section>`;

  /* ================= 我的资料 ================= */
  let draft = null;
  // a copy of the profile; its photo is only one picked here (js/media.js), null until then
  const freshDraft = (s) => Object.assign(JSON.parse(JSON.stringify(s.profile)), { photo: null });
  /** a photo picked here and not saved leaves the device with the draft */
  function dropPhoto() {
    if (draft && draft.photo) VT.media.remove([draft.photo.media]);
  }

  VT.screens.editprofile = {
    title: '我的资料',
    render(app) {
      const s = app.s;
      const d = draft || (draft = freshDraft(s));
      const photo = VT.media.src(d.photo) || VT.ui.profilePhoto(s);
      return `
        ${VT.ui.subHead('我的资料')}
        <div class="scroll sub-scroll" data-keep-scroll="ep">
          <div class="ep-photo">
            <label class="ep-photo-btn" title="更换头像">${VT.ui.img(photo, '我的头像')}<input class="sr-only" type="file" accept="image/*" data-change="photo" aria-label="更换头像"><span class="ep-cam" aria-hidden="true">${I('camera', { size: 15, stroke: 1.9 })}</span></label>
            <p>点击更换头像</p>
          </div>
          <section class="set-group"><div class="set-card">
            <label class="set-row set-row--field"><span class="set-label">昵称</span><input type="text" maxlength="12" value="${esc(d.name)}" data-input="field" data-k="name" data-keep-value="ep-name" aria-label="昵称"></label>
            <label class="set-row set-row--field"><span class="set-label">个性签名</span><input type="text" maxlength="20" value="${esc(d.bio)}" placeholder="写一句介绍自己" data-input="field" data-k="bio" data-keep-value="ep-bio" aria-label="个性签名"></label>
            <div class="set-row"><span class="set-label" id="ep-g">性别</span><div class="seg" role="radiogroup" aria-labelledby="ep-g">${['女', '男', '保密'].map((g) => `<button type="button" role="radio" class="${d.gender === g ? 'is-on' : ''}" aria-checked="${d.gender === g}" data-act="gender" data-v="${g}">${g}</button>`).join('')}</div></div>
            <label class="set-row set-row--field"><span class="set-label">生日</span><input type="date" value="${esc(d.birthday)}" data-input="field" data-k="birthday" aria-label="生日"></label>
            ${VT.ui.row({ label: '手机号', value: `${esc(s.profile.phone)}<em class="set-tag">已绑定</em>` })}
          </div></section>
          <button type="button" class="btn btn--dark btn--lg btn--block sub-save" data-act="save">保存</button>
        </div>`;
    },
    actions: {
      back(app) { dropPhoto(); draft = null; app.back(); },
      field(app, el) { draft[el.dataset.k] = el.value; },
      gender(app, el) { draft.gender = el.dataset.v; app.refresh(); },
      async photo(app, el) {
        const f = el.files && el.files[0];
        if (!f) return;
        try {
          const photo = await VT.profile.squarePhoto(f);
          if (!draft) { VT.media.remove([photo.media]); return; } // the screen was left meanwhile
          dropPhoto(); // one picked before
          draft.photo = photo;
          app.refresh();
        }
        catch (e) { app.toast('无法读取这张图片，请换一张'); }
      },
      save(app) {
        const name = (draft.name || '').trim();
        if (!name) { app.toast('昵称不能为空'); return; }
        const photo = draft.photo;
        let old = null;
        VT.store.update((s) => { old = s.profile.photo; s.profile = Object.assign(s.profile, draft, { name, bio: (draft.bio || '').trim(), photo: photo || s.profile.photo }); });
        if (photo && old) VT.media.remove([old.media]); // the photo it replaces
        draft = null;
        app.back();
        app.toast('资料已保存', { icon: 'check' });
      },
    },
  };

  /* ================= 收货地址 ================= */
  function addressForm(app, a) {
    const isNew = !a;
    const v = a || { name: '', phone: '', region: '', addr: '', tag: '家', isDefault: false };
    let tag = v.tag || '家';
    let isDefault = !!v.isDefault;
    const ov = app.sheet({
      title: isNew ? '新增收货地址' : '编辑收货地址',
      html: `
        <label class="field"><span class="field-label">收货人</span><span class="field-row"><input type="text" maxlength="12" class="js-name" value="${esc(v.name)}" placeholder="姓名" aria-label="收货人"></span></label>
        <label class="field"><span class="field-label">手机号</span><span class="field-row"><input type="tel" inputmode="numeric" maxlength="11" class="js-phone" value="${isNew ? '' : ''}" placeholder="${isNew ? '11 位手机号' : esc(v.phone) + '（不修改可留空）'}" aria-label="手机号"></span></label>
        <label class="field"><span class="field-label">详细地址</span><span class="field-row"><input type="text" maxlength="48" class="js-addr" value="${esc(v.addr)}" placeholder="省市区 + 街道门牌" aria-label="详细地址"></span></label>
        <span class="field-label">标签</span>
        <div class="ad-tags">${['家', '公司', '学校'].map((t) => `<button type="button" class="chip ${t === tag ? 'is-on' : ''}" data-act="tag" data-v="${t}">${t}</button>`).join('')}</div>
        <div class="set-row set-row--toggle ad-def"><span class="set-main"><span class="set-label" id="ad-def">设为默认地址</span></span><button type="button" role="switch" class="switch ${isDefault ? 'is-on' : ''}" aria-checked="${isDefault}" aria-labelledby="ad-def" data-act="def"><i></i></button></div>
        <button type="button" class="btn btn--dark btn--lg btn--block" data-act="save">保存地址</button>
        <p class="sheet-note">演示原型：地址只保存在本机浏览器</p>`,
      actions: {
        tag: (el) => { tag = el.dataset.v; ov.querySelectorAll('.ad-tags .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.v === tag)); },
        def: (el) => { isDefault = !isDefault; el.classList.toggle('is-on', isDefault); el.setAttribute('aria-checked', isDefault); },
        save: () => {
          const name = ov.querySelector('.js-name').value.trim();
          const phoneIn = ov.querySelector('.js-phone').value.trim();
          const addr = ov.querySelector('.js-addr').value.trim();
          if (!name) { app.toast('请填写收货人'); return; }
          if (isNew || phoneIn) { if (!/^1\d{10}$/.test(phoneIn)) { app.toast('请输入 11 位手机号'); return; } }
          if (addr.length < 6) { app.toast('请填写完整的详细地址'); return; }
          VT.store.update((s) => {
            if (!s.addresses || !s.addresses.length) s.addresses = JSON.parse(JSON.stringify(D().addresses));
            let rec = isNew ? null : s.addresses.find((x) => x.id === a.id);
            if (!rec) { rec = { id: VT.store.uid('a') }; s.addresses.push(rec); }
            Object.assign(rec, { name, addr, tag, phone: phoneIn ? mask(phoneIn) : rec.phone });
            if (isDefault || s.addresses.length === 1) { s.addresses.forEach((x) => { x.isDefault = x === rec; }); s.checkout.address = rec.id; }
            else rec.isDefault = false;
            if (!s.addresses.some((x) => x.isDefault)) s.addresses[0].isDefault = true;
          });
          app.closeOverlay(ov);
          app.refresh();
          app.toast(isNew ? '地址已添加' : '地址已更新', { icon: 'check' });
        },
      },
    });
  }

  VT.screens.addresses = {
    title: '收货地址',
    render(app) {
      const s = app.s;
      const list = H().addresses(s);
      return `
        ${VT.ui.subHead('收货地址')}
        <div class="scroll sub-scroll" data-keep-scroll="ad">
          <ul class="ad-list">${list.map((a) => `
            <li class="set-card ad-card">
              <div class="ad-main"><b>${esc(a.name)}</b><span>${esc(a.phone)}</span>${a.tag ? `<em class="set-tag">${esc(a.tag)}</em>` : ''}${a.isDefault ? '<em class="set-tag set-tag--dark">默认</em>' : ''}</div>
              <p class="ad-addr">${esc(a.addr)}</p>
              <div class="ad-acts">
                <button type="button" class="ad-def-btn" role="radio" aria-checked="${!!a.isDefault}" data-act="setdef" data-id="${a.id}"><span class="radio ${a.isDefault ? 'is-on' : ''}"></span>${a.isDefault ? '默认地址' : '设为默认'}</button>
                <span><button type="button" class="co-link" data-act="edit" data-id="${a.id}">编辑</button><button type="button" class="co-link" data-act="del" data-id="${a.id}">删除</button></span>
              </div>
            </li>`).join('')}</ul>
          ${list.length ? '' : `<div class="ol-empty">${I('pin', { size: 32, stroke: 1.3 })}<p>还没有收货地址</p></div>`}
        </div>
        <div class="sub-foot"><button type="button" class="btn btn--dark btn--lg btn--block" data-act="add">${I('plus', { size: 18, stroke: 2 })}新增收货地址</button></div>`;
    },
    actions: {
      add(app) { addressForm(app, null); },
      edit(app, el) { addressForm(app, H().addresses(app.s).find((a) => a.id === el.dataset.id)); },
      setdef(app, el) {
        VT.store.update((s) => { s.addresses.forEach((a) => { a.isDefault = a.id === el.dataset.id; }); s.checkout.address = el.dataset.id; });
        app.refresh();
        app.toast('已设为默认地址');
      },
      async del(app, el) {
        const ok = await app.dialog({ title: '删除这个地址？', ok: '删除' });
        if (!ok) return;
        VT.store.update((s) => {
          s.addresses = s.addresses.filter((a) => a.id !== el.dataset.id);
          if (s.addresses.length && !s.addresses.some((a) => a.isDefault)) s.addresses[0].isDefault = true;
          if (s.checkout.address === el.dataset.id) s.checkout.address = s.addresses[0] ? s.addresses[0].id : null;
        });
        app.refresh();
        app.toast('地址已删除');
      },
    },
  };

  /* ================= 支付方式 ================= */
  VT.screens.payments = {
    title: '支付方式',
    render(app) {
      const s = app.s;
      const methods = D().payments.filter((m) => m.logo);
      return `
        ${VT.ui.subHead('支付方式')}
        <div class="scroll sub-scroll" data-keep-scroll="pm">
          <section class="set-group"><h2 class="set-h">默认支付方式</h2>
            <div class="set-card" role="radiogroup" aria-label="默认支付方式">${methods.map((m) => `
              <button type="button" role="radio" class="set-row pm-row" aria-checked="${m.id === s.checkout.payment}" data-act="pick" data-id="${m.id}">
                <span class="pm-logo">${VT.ui.img(m.logo, '')}</span><span class="set-main"><span class="set-label">${m.name}</span><span class="set-sub">${m.id === 'unionpay' ? '招商银行储蓄卡（尾号 6688）' : '已绑定 · 138****8888'}</span></span>
                <span class="radio ${m.id === s.checkout.payment ? 'is-on' : ''}"></span>
              </button>`).join('')}
            </div>
            <p class="set-note">结算时默认选中，可在下单时临时更换</p>
          </section>
          ${group('', [VT.ui.toggleRow('小额免密支付', 'prefs.quickPay', !!s.prefs.quickPay, '单笔 ¥300 以内无需输入密码（演示）')])}
          <button type="button" class="btn btn--ghost btn--lg btn--block" data-act="addcard">${I('card', { size: 19 })}添加银行卡</button>
        </div>`;
    },
    actions: {
      toggle,
      pick(app, el) { VT.store.update((s) => { s.checkout.payment = el.dataset.id; }); app.refresh(); app.toast('已设为默认支付方式'); },
      addcard(app) { app.toast('演示版不绑定真实银行卡'); },
    },
  };

  /* ================= 消息通知 ================= */
  VT.screens.notifications = {
    title: '消息通知',
    render(app) {
      const n = app.s.notify;
      return `
        ${VT.ui.subHead('消息通知')}
        <div class="scroll sub-scroll" data-keep-scroll="nt">
          ${group('推送通知', [
            VT.ui.toggleRow('订单与物流', 'notify.order', n.order, '发货、派送、签收与售后进度'),
            VT.ui.toggleRow('降价与到货提醒', 'notify.price', n.price, '收藏的单品降价或补货时提醒我'),
            VT.ui.toggleRow('上新推荐', 'notify.newin', n.newin, '关注品牌的新品与穿搭灵感'),
            VT.ui.toggleRow('AI 造型师建议', 'notify.stylist', n.stylist, '根据天气与日程推荐每日穿搭'),
            VT.ui.toggleRow('系统通知', 'notify.system', n.system, '账户安全与版本更新'),
          ])}
          ${group('', [VT.ui.toggleRow('夜间免打扰', 'notify.quiet', n.quiet, '22:00 – 08:00 不推送通知')], '演示原型不会发送真实推送')}
        </div>`;
    },
    actions: { toggle },
  };

  /* ================= 隐私与安全 ================= */
  VT.screens.privacy = {
    title: '隐私与安全',
    render(app) {
      const s = app.s;
      return `
        ${VT.ui.subHead('隐私与安全')}
        <div class="scroll sub-scroll" data-keep-scroll="pv">
          ${group('账号安全', [
            VT.ui.row({ icon: 'phone', label: '登录手机号', value: esc(s.profile.phone) }),
            VT.ui.row({ act: 'toast', attrs: 'data-msg="演示版暂不支持修改密码"', icon: 'lock', label: '登录密码', value: '已设置' }),
          ])}
          ${group('隐私', [
            VT.ui.toggleRow('个性化推荐', 'privacy.personalized', s.privacy.personalized, '根据浏览与试穿记录推荐单品'),
            VT.ui.toggleRow('允许 AI 造型师读取衣橱', 'privacy.wardrobeAI', s.privacy.wardrobeAI, '用你已有的衣服生成搭配建议'),
            VT.ui.row({ icon: 'shield', label: '照片仅保存在本机', sub: '演示原型不会上传任何照片', value: '已开启' }),
          ])}
          ${group('我的数据', [
            VT.ui.row({ act: 'clearphotos', icon: 'image', label: '清除已上传的照片', sub: '数字分身照片、头像与凭证照片' }),
            VT.ui.row({ act: 'toast', attrs: 'data-msg="演示版暂不支持导出数据"', icon: 'download', label: '导出我的数据' }),
            VT.ui.row({ act: 'close', icon: 'logout', label: '注销账号' }),
          ])}
        </div>`;
    },
    actions: {
      toggle,
      async clearphotos(app) {
        const ok = await app.dialog({ title: '清除已上传的照片？', text: '将删除本机保存的全身照、生活照、头像和售后凭证照片。\n数字分身会使用示例形象。', ok: '清除' });
        if (!ok) return;
        VT.media.remove(VT.media.keysInState(VT.store.get())); // the photos and video frames on this device
        VT.orders.clearDraftPhotos(); // and those of an unsent 申请退换货
        VT.store.update((s) => {
          s.avatar.fullbody = null; s.avatar.portrait = null; s.avatar.materials = null; s.profile.photo = null;
          // every digital avatar's photos, not only the active one's (切换角色)
          s.avatars.forEach((a) => { if (a.data) { a.data.avatar.fullbody = null; a.data.avatar.portrait = null; a.data.avatar.materials = null; } });
          Object.values(s.returns).forEach((r) => { r.photos = []; });
          s.chat = s.chat.filter((m) => !m.img); // the photos sent to AI 造型师
        });
        app.toast('已清除本机照片', { icon: 'check' });
      },
      async close(app) {
        await app.dialog({ title: '注销账号', text: '演示原型不会注销真实账号。\n如需清空演示数据，请使用「设置 → 重置演示数据」。', ok: '知道了', cancel: false });
      },
    },
  };

  /* ================= 设置 ================= */
  function cacheSize() {
    try { const raw = window.localStorage.getItem(VT.store.KEY) || ''; return (raw.length / 1024 / 1024 * 2).toFixed(1) + ' MB'; } catch (e) { return '0.0 MB'; }
  }

  VT.screens.settings = {
    title: '设置',
    render(app) {
      const s = app.s;
      return `
        ${VT.ui.subHead('设置')}
        <div class="scroll sub-scroll" data-keep-scroll="st">
          ${group('账号', [
            VT.ui.row({ act: 'nav', attrs: 'data-to="editprofile"', icon: 'person', label: '个人资料' }),
            VT.ui.row({ act: 'nav', attrs: 'data-to="privacy"', icon: 'shield', label: '隐私与安全' }),
            VT.ui.row({ act: 'nav', attrs: 'data-to="notifications"', icon: 'bell', label: '消息通知' }),
            VT.ui.row({ act: 'nav', attrs: 'data-to="addresses"', icon: 'pin', label: '收货地址' }),
          ])}
          ${group('通用', [
            VT.ui.row({ act: 'toast', attrs: 'data-msg="演示版仅支持简体中文"', icon: 'globe', label: '语言', value: '简体中文' }),
            VT.ui.row({ act: 'sizestd', icon: 'ruler', label: '尺码标准', value: esc(s.prefs.sizeStd) }),
            VT.ui.row({ act: 'cache', icon: 'trash', label: '清除缓存', value: cacheSize() }),
          ])}
          ${group('原型演示', [
            VT.ui.row({ act: 'replay', icon: 'refresh', label: '重新体验首次启动', sub: '回到启动页和数字分身创建' }),
            VT.ui.row({ act: 'reset', icon: 'reset', label: '重置演示数据', sub: '衣橱、收藏、订单与照片恢复初始状态' }),
          ])}
          ${group('关于', [
            VT.ui.row({ act: 'about', icon: 'info', label: '关于全新的购物体验', value: '原型 v2.0' }),
          ])}
          <button type="button" class="btn btn--lg btn--block set-logout" data-act="${s.loggedIn ? 'logout' : 'login'}">${s.loggedIn ? '退出登录' : '登录 / 注册'}</button>
        </div>`;
    },
    actions: {
      sizestd(app) {
        const opts = ['中国码', '国际码（S / M / L）', '欧码（EU）'];
        const ov = app.sheet({
          title: '尺码标准',
          html: `<div class="opt-list">${opts.map((o) => `<button type="button" class="opt ${o === app.s.prefs.sizeStd ? 'is-on' : ''}" data-act="pick" data-v="${o}"><span class="opt-main"><span class="opt-title">${o}</span></span><span class="radio"></span></button>`).join('')}</div>
            <p class="sheet-note">商品详情与尺码指南会优先显示所选标准（演示）</p>`,
          actions: { pick: (el) => { VT.store.update((s) => { s.prefs.sizeStd = el.dataset.v; }); app.closeOverlay(ov); app.refresh(); } },
        });
      },
      async cache(app) {
        const ok = await app.dialog({ title: '清除缓存？', text: '清除图片与页面缓存，不会影响你的衣橱、订单和收藏。', ok: '清除' });
        if (ok) app.toast('缓存已清除', { icon: 'check' });
      },
      async replay(app) {
        const ok = await app.dialog({ title: '重新体验首次启动？', text: '将回到启动页，你的衣橱、订单和收藏会保留。', ok: '开始' });
        if (!ok) return;
        // the first launch is 本人's, whichever digital avatar was active
        VT.store.avatars.switchTo(VT.store.get().avatars.find((a) => a.self).id);
        VT.store.update((s) => { s.setupDone = false; });
        app.launch();
      },
      async reset(app) {
        const ok = await app.dialog({ title: '重置演示数据？', text: '衣橱新增、收藏、订单、聊天与上传的照片\n将恢复为初始演示状态。', ok: '重置' });
        if (!ok) return;
        VT.store.reset();
        app.s = VT.store.get();
        app.launch();
        app.toast('演示数据已重置');
      },
      about(app) {
        app.sheet({
          title: '关于',
          html: `<p class="sheet-lead">全新的购物体验 · 虚拟试衣 · 个人衣橱 · 智能购物</p>
            <dl class="kv"><dt>版本</dt><dd>交互原型 v2.0</dd><dt>说明</dt><dd>数字分身生成、AI 造型师、支付与物流为演示模拟；照片上传与摄像头预览使用真实浏览器能力。</dd></dl>`,
        });
      },
      async logout(app) {
        const ok = await app.dialog({ title: '退出登录？', text: '演示数据会保留在本机。', ok: '退出' });
        if (!ok) return;
        VT.store.update((s) => { s.loggedIn = false; });
        app.refresh();
        app.toast('已退出登录');
      },
      login(app) { VT.login(app, () => app.refresh()); },
    },
  };

  /* ================= 帮助与客服 ================= */
  VT.screens.help = {
    title: '帮助与客服',
    render() {
      return `
        ${VT.ui.subHead('帮助与客服')}
        <div class="scroll sub-scroll" data-keep-scroll="hp">
          <section class="set-group"><h2 class="set-h">常见问题</h2>
            <div class="set-card faq">${D().faqs.map(([q, a], i) => `<div class="faq-i"><button type="button" class="faq-q" data-act="faq" aria-expanded="false" aria-controls="faq-a-${i}">${q}${I('chevron-down', { size: 18 })}</button><div class="faq-a" id="faq-a-${i}" hidden>${a}</div></div>`).join('')}</div>
          </section>
          ${group('', [
            VT.ui.row({ act: 'service', icon: 'headset', label: '联系在线客服', sub: '9:00 – 22:00 · 平均 1 分钟回复' }),
            VT.ui.row({ act: 'feedback', icon: 'edit', label: '意见反馈', sub: '告诉我们你的建议' }),
          ])}
        </div>`;
    },
    actions: {
      faq(app, el) {
        const a = el.nextElementSibling;
        const open = a.hidden;
        a.hidden = !open;
        el.setAttribute('aria-expanded', open);
        el.classList.toggle('is-open', open);
      },
      service(app) { VT.openChat(app, 'service'); },
      feedback(app) {
        const ov = app.sheet({
          title: '意见反馈',
          html: `<textarea class="field-area js-fb" maxlength="200" placeholder="请描述你的问题或建议" aria-label="反馈内容"></textarea>
            <button type="button" class="btn btn--dark btn--lg btn--block" style="margin-top:14px" data-act="send">提交</button>
            <p class="sheet-note">演示原型：反馈不会被发送</p>`,
          actions: {
            send: () => {
              if (!ov.querySelector('.js-fb').value.trim()) { app.toast('请先写下你的反馈'); return; }
              app.closeOverlay(ov);
              app.toast('感谢反馈！', { icon: 'check' });
            },
          },
        });
      },
    },
  };
})();
