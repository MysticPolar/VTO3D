/* 商家消息 — chats with stores (secondary screen from 购物广场's top-right icon).
   First row: the system notices; then one row per store chat, newest first.
   Threads are a scripted demo: the store answers with a preset reply chosen by keyword. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;

  const QUICK = ['什么时候发货？', '尺码怎么选？', '有优惠券吗？'];
  const REPLIES = [
    { k: ['发货', '什么时候', '多久', '到货', '快递'], text: '亲，现货商品下单后 48 小时内发货，一般 2–3 天送达～' },
    { k: ['尺码', '码', '大小', '身高', '体重', '合身'], text: '亲，可以参考商品页的「尺码表」；告诉我身高体重，也可以帮您推荐尺码哦～' },
    { k: ['优惠', '券', '便宜', '活动', '折扣', '打折'], text: '收藏店铺的顾客可领取 ¥30 新品券，下单时自动抵扣（演示数据）～' },
    { k: ['退', '换'], text: '支持 7 天无理由退换，签收后可在「我的订单」中申请～' },
    { k: ['面料', '起球', '洗', '材质'], text: '面料正常穿着不易起球，建议冷水轻柔手洗或干洗～' },
  ];
  const FALLBACK = '收到～客服稍后为您详细解答（演示回复）。';
  const reply = (text) => { const r = REPLIES.find((x) => x.k.some((k) => text.includes(k))); return r ? r.text : FALLBACK; };
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  const unread = (s) => Object.values(s.storeChats || {}).reduce((n, c) => n + (c.unread || 0), 0);
  /** store ids with at least one message, newest first */
  function threadIds(s) {
    const all = s.storeChats || {};
    return Object.keys(all).filter((id) => D().storeById[id] && all[id].msgs && all[id].msgs.length)
      .sort((a, b) => (all[b].at || 0) - (all[a].at || 0));
  }

  /** keep 商家消息 or the 购物广场 badge in step after a chat changes */
  function sync(app) {
    const el = app.screenEl();
    if (el && el.dataset.screen === 'messages') app.refresh();
    else VT.plaza.syncBadge(app);
  }

  VT.screens.messages = {
    title: '商家消息',
    render(app) {
      const s = app.s;
      const ids = threadIds(s);
      const row = (id) => {
        const st = D().storeById[id];
        const c = s.storeChats[id];
        const last = c.msgs[c.msgs.length - 1];
        return `<li><button type="button" class="msg-row" data-act="open" data-store="${id}">
          <span class="msg-face">${VT.plaza.logo(st, 'st-logo--msg')}${c.unread ? `<span class="msg-dot" aria-hidden="true">${c.unread}</span>` : ''}</span>
          <span class="msg-main"><span class="msg-top"><b>${VT.esc(st.full)}</b><i>${VT.esc(last.t)}</i></span><em>${last.me ? '我：' : ''}${VT.esc(last.text)}</em></span>
          ${c.unread ? `<span class="sr-only">，${c.unread} 条未读</span>` : ''}
        </button></li>`;
      };
      return `
        ${VT.ui.subHead('商家消息')}
        <div class="scroll sub-scroll msg-scroll" data-keep-scroll="msg">
          <button type="button" class="msg-row msg-sys" data-act="notices">
            <span class="msg-face"><span class="msg-ic" aria-hidden="true">${I('bell', { size: 20, stroke: 1.7 })}</span></span>
            <span class="msg-main"><span class="msg-top"><b>消息通知</b><i>10 分钟前</i></span><em>心愿单降价提醒、订单物流与 AI 造型师推荐</em></span>
          </button>
          <h2 class="msg-h">商家</h2>
          ${ids.length ? `<ul class="msg-list">${ids.map(row).join('')}</ul>`
            : `<div class="ol-empty msg-empty">${I('chat-dots', { size: 32, stroke: 1.3 })}<p>还没有和商家的聊天</p><button type="button" class="btn btn--ghost btn--sm" data-act="back">去购物广场逛逛</button></div>`}
          <p class="sheet-note">演示对话，回复为预设内容</p>
        </div>`;
    },
    actions: {
      open(app, el) { open(app, el.dataset.store); },
      notices(app) { VT.plaza.notices(app); },
    },
  };

  /** chat thread with one store (also opened by 联系商家 on the store sheet) */
  function open(app, id) {
    const st = D().storeById[id];
    if (!st) return null;
    VT.store.update((s) => { const c = (s.storeChats || {})[id]; if (c) c.unread = 0; });
    sync(app);
    const greet = `您好，欢迎光临 ${st.full}，请问有什么可以帮您？`;
    const bubble = (m) => `<div class="b ${m.me ? 'me' : 'them'}">${VT.esc(m.text)}</div>`;
    const msgs = ((app.s.storeChats || {})[id] || { msgs: [] }).msgs;
    const ov = app.sheet({
      title: st.full,
      full: true,
      html: `<div class="mchat js-thread">${msgs.length ? msgs.map(bubble).join('') : bubble({ me: false, text: greet })}</div>
        <div class="or-quick">${QUICK.map((q) => `<button type="button" class="chip" data-act="q" data-q="${q}">${q}</button>`).join('')}</div>
        <div class="mchat-input"><input type="text" placeholder="输入消息…" aria-label="输入消息" data-enter="send" class="js-msg"><button type="button" class="btn btn--dark" data-act="send">发送</button></div>
        <p class="sheet-note">演示对话，回复为预设内容</p>`,
      actions: {
        q: (el) => say(el.dataset.q),
        send: () => { const i = ov.querySelector('.js-msg'); const v = i.value.trim(); if (!v) return; i.value = ''; say(v); },
      },
    });
    const th = ov.querySelector('.js-thread');
    const down = () => { th.parentElement.scrollTop = th.parentElement.scrollHeight; };
    const isOpen = () => !ov._closing && document.body.contains(th);
    down();

    function push(m) {
      VT.store.update((s) => {
        const all = s.storeChats || (s.storeChats = {});
        const c = all[id] || (all[id] = { unread: 0, at: 0, msgs: [] });
        if (!c.msgs.length) c.msgs.push({ me: false, text: greet, t: m.t }); // keep the greeting the user answered
        c.msgs.push(m);
        c.at = Date.now();
        if (!m.me && !isOpen()) c.unread = (c.unread || 0) + 1; // the reply arrived after the chat was closed
      });
    }
    function say(text) {
      push({ me: true, text, t: now() });
      th.insertAdjacentHTML('beforeend', bubble({ me: true, text }));
      down();
      sync(app);
      app.later(() => {
        const r = { me: false, text: reply(text), t: now() };
        push(r);
        if (isOpen()) { th.insertAdjacentHTML('beforeend', bubble(r)); down(); }
        sync(app);
      }, 900);
    }
    return ov;
  }

  VT.storeChat = { open, unread };
})();
