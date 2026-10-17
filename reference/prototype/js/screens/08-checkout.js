/* 结算下单 — Checkout (secondary; 购物广场 → 商品详情 → here). Simulated, no real payment. */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const D = () => VT.data;
  const COUPON = 20;
  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function cartOf(s) { return s.cart || { p: 'striped-shirt', color: 'blue', size: 'M', qty: 1 }; }

  function eta(app, days) {
    if (app.preview) return '7月18日 (周五)';
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getMonth() + 1}月${d.getDate()}日 (${WEEK[d.getDay()]})`;
  }

  function totals(s) {
    const c = cartOf(s);
    const p = D().byId[c.p];
    const ship = D().shippingOptions.find((x) => x.id === s.checkout.shipping) || D().shippingOptions[0];
    const goods = p.price * c.qty;
    return { goods, ship: ship.price, coupon: COUPON, total: Math.max(0, goods + ship.price - COUPON) };
  }

  function lineTitle(p, color) { return (color.short || '') + p.cardName; }

  VT.screens.checkout = {
    title: '结算下单',
    render(app) {
      const s = app.s;
      const c = cartOf(s);
      const p = D().byId[c.p];
      const color = p.colors.find((x) => x.id === c.color) || p.colors[0];
      const addr = VT.store.h.address(s, s.checkout.address);
      const ship = D().shippingOptions.find((x) => x.id === s.checkout.shipping) || D().shippingOptions[0];
      const t = totals(s);
      return `
        ${VT.ui.statusBar('dark')}
        <header class="co-head">${VT.ui.backBtn()}<h1 class="co-title">结算下单</h1></header>
        <div class="scroll co-scroll" data-keep-scroll="co">
          <section class="co-card co-item" aria-label="商品">
            <button type="button" class="co-item-img" data-act="nav" data-to="product" data-pid="${p.id}" aria-label="查看商品详情">${VT.ui.img(p.img.checkout || p.img.card, p.name)}</button>
            <div class="co-item-main">
              <button type="button" class="co-item-link" data-act="nav" data-to="product" data-pid="${p.id}"><h2>${lineTitle(p, color)}</h2><p class="co-tags">${p.coTags || p.tags.replace(' · ', '  ')}</p>${VT.ui.price(p.price, 'co-price')}<span class="co-chev">${I('chevron-right', { size: 20, stroke: 1.7 })}</span></button>
              <div class="co-chips">
                <button type="button" class="co-chip" data-act="edit">颜色：${color.short}</button>
                <button type="button" class="co-chip" data-act="edit">尺码：${c.size}</button>
                <button type="button" class="co-chip" data-act="edit">数量：${c.qty}</button>
              </div>
            </div>
          </section>
          <button type="button" class="co-card co-row co-addr" data-act="address">
            <span class="co-ic">${I('pin', { size: 21, stroke: 1.6 })}</span>
            <span class="co-main"><b class="co-h">收货地址</b><span class="co-l1">${addr.name}<i></i>${addr.phone}</span><span class="co-l2">${addr.addr}</span></span>
            <span class="co-chev co-chev--row">${I('chevron-right', { size: 20, stroke: 1.7 })}</span>
          </button>
          <button type="button" class="co-card co-row co-ship" data-act="shipping">
            <span class="co-ic">${I('truck', { size: 22, stroke: 1.6 })}</span>
            <span class="co-main"><b class="co-h">配送方式</b><span class="co-l1 co-l1--ship"><span>${ship.name}</span><em>${ship.price ? ship.note : '免费配送'}</em></span><span class="co-l2 co-eta">预计 ${eta(app, ship.eta)} 送达</span></span>
            <span class="co-chev co-chev--row">${I('chevron-right', { size: 20, stroke: 1.7 })}</span>
          </button>
          <section class="co-card co-pay" aria-labelledby="co-pay-h">
            <div class="co-pay-h"><span class="co-ic">${I('card', { size: 21, stroke: 1.6 })}</span><b class="co-h" id="co-pay-h">支付方式</b></div>
            <div role="radiogroup" aria-labelledby="co-pay-h" class="co-pays">
              ${D().payments.map((m) => `<button type="button" role="radio" aria-checked="${m.id === s.checkout.payment}" class="co-pm ${m.id === s.checkout.payment ? 'is-on' : ''}" data-act="pay" data-pay="${m.id}">
                <span class="co-pm-logo">${m.logo ? VT.ui.img(m.logo, '') : I(m.icon, { size: 27, stroke: 2 })}</span><span class="co-pm-name">${m.name}</span><span class="radio ${m.id === s.checkout.payment ? 'is-on' : ''}"></span></button>`).join('')}
            </div>
          </section>
          <section class="co-card co-amt" aria-label="订单金额">
            <div class="co-amt-h"><span class="co-ic">${I('doc', { size: 21, stroke: 1.6 })}</span><b class="co-h">订单金额</b></div>
            <dl class="co-amt-list">
              <div><dt>商品金额</dt><dd>${VT.ui.yuan(t.goods)}</dd></div>
              <div><dt>运费</dt><dd>${VT.ui.yuan(t.ship)}</dd></div>
              <div><dt>优惠券</dt><dd>- ${VT.ui.yuan(t.coupon)}</dd></div>
              <div class="co-paid"><dt>实付款</dt><dd>${VT.ui.price(t.total)}</dd></div>
            </dl>
          </section>
        </div>
        <div class="co-foot">
          <div class="co-agree">
            <button type="button" class="co-check ${s.checkout.agree ? 'is-on' : ''}" data-act="agree" role="checkbox" aria-checked="${s.checkout.agree}" aria-label="我已阅读并同意用户协议和隐私政策">${s.checkout.agree ? I('check', { size: 10, stroke: 3 }) : ''}</button>
            <span>我已阅读并同意 <button type="button" class="co-link" data-act="doc" data-doc="terms">《用户协议》</button>和 <button type="button" class="co-link" data-act="doc" data-doc="privacy">《隐私政策》</button></span>
          </div>
          <button type="button" class="btn btn--dark co-submit" data-act="submit">立即下单</button>
        </div>`;
    },
    actions: {
      pay(app, el) {
        VT.store.update((s) => { s.checkout.payment = el.dataset.pay; });
        app.screenEl().querySelectorAll('.co-pm').forEach((b) => {
          const on = b.dataset.pay === el.dataset.pay;
          b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on);
          b.querySelector('.radio').classList.toggle('is-on', on);
        });
      },
      agree(app) { VT.store.update((s) => { s.checkout.agree = !s.checkout.agree; }); app.refresh(); },
      doc(app, el) {
        const terms = el.dataset.doc === 'terms';
        app.sheet({
          title: terms ? '用户协议' : '隐私政策',
          html: `<div class="co-doc">${terms
            ? '<p>本页面为交互原型的演示文本。</p><p>1. 下单即表示你同意按页面展示价格购买所选商品。</p><p>2. 支持 7 天无理由退换（定制商品除外）。</p><p>3. 数字分身与试穿效果仅供参考，请以实物为准。</p>'
            : '<p>本页面为交互原型的演示文本。</p><p>1. 你上传的照片仅用于生成数字分身，演示原型中照片只保存在你的浏览器本地。</p><p>2. 摄像头画面仅在本机显示，不会上传。</p><p>3. 你可以随时在原型菜单中「重置演示数据」清除所有本地记录。</p>'}</div>`,
        });
      },
      edit(app) {
        const s = app.s;
        const c = Object.assign({}, cartOf(s));
        const p = D().byId[c.p];
        const ov = app.sheet({
          title: '修改规格',
          html: `<div class="mini">${VT.ui.img(p.img.checkout || p.img.card, p.name)}<span class="mini-main"><span class="mini-title">${p.name}</span><span class="mini-sub js-sum"></span></span>${VT.ui.price(p.price)}</div>
            <h4 class="co-sh-h">颜色</h4><div class="co-sh-opts">${p.colors.map((x) => `<button type="button" class="chip ${x.id === c.color ? 'is-on' : ''}" data-act="c" data-v="${x.id}">${x.name}</button>`).join('')}</div>
            <h4 class="co-sh-h">尺码</h4><div class="co-sh-opts">${p.sizes.map((z) => `<button type="button" class="chip ${z === c.size ? 'is-on' : ''}" data-act="z" data-v="${z}">${z}</button>`).join('')}</div>
            <h4 class="co-sh-h">数量</h4><div class="qty"><button type="button" data-act="minus" aria-label="减少">${I('minus', { size: 18 })}</button><output class="js-q" aria-live="polite">${c.qty}</output><button type="button" data-act="plus" aria-label="增加">${I('plus', { size: 18 })}</button></div>
            <button type="button" class="btn btn--dark btn--lg btn--block" style="margin-top:20px" data-act="ok">确定</button>`,
          actions: {
            c: (el) => { c.color = el.dataset.v; sync(); },
            z: (el) => { c.size = el.dataset.v; sync(); },
            minus: () => { c.qty = Math.max(1, c.qty - 1); sync(); },
            plus: () => { c.qty = Math.min(9, c.qty + 1); sync(); },
            ok: () => { VT.store.update((st) => { st.cart = c; st.selections[c.p] = { color: c.color, size: c.size }; }); app.closeOverlay(ov); app.refresh(); },
          },
        });
        function sync() {
          ov.querySelectorAll('[data-act="c"]').forEach((b) => b.classList.toggle('is-on', b.dataset.v === c.color));
          ov.querySelectorAll('[data-act="z"]').forEach((b) => b.classList.toggle('is-on', b.dataset.v === c.size));
          ov.querySelector('.js-q').textContent = c.qty;
          ov.querySelector('[data-act="minus"]').disabled = c.qty <= 1;
          ov.querySelector('.js-sum').textContent = `${p.colors.find((x) => x.id === c.color).name} / ${c.size} × ${c.qty}`;
        }
        sync();
      },
      address(app) {
        const s = app.s;
        const list = VT.store.h.addresses(s);
        const cur = VT.store.h.address(s, s.checkout.address);
        const ov = app.sheet({
          title: '选择收货地址',
          html: `<div class="opt-list">${list.map((a) => `<button type="button" class="opt ${a.id === cur.id ? 'is-on' : ''}" data-act="pick" data-id="${a.id}"><span class="opt-main"><span class="opt-title">${VT.esc(a.name)}　${VT.esc(a.phone)}<span class="badge-demo" style="margin-left:8px">${VT.esc(a.tag || '地址')}</span></span><span class="opt-sub">${VT.esc(a.addr)}</span></span><span class="radio"></span></button>`).join('')}</div>
            <button type="button" class="btn btn--ghost btn--lg btn--block" style="margin-top:14px" data-act="manage">${I('pin', { size: 18 })}管理收货地址</button>`,
          actions: {
            pick: (el) => { VT.store.update((st) => { st.checkout.address = el.dataset.id; }); app.closeOverlay(ov); app.refresh(); },
            manage: () => app.go('addresses'),
          },
        });
      },
      shipping(app) {
        const s = app.s;
        const ov = app.sheet({
          title: '配送方式',
          html: `<div class="opt-list">${D().shippingOptions.map((o) => `<button type="button" class="opt ${o.id === s.checkout.shipping ? 'is-on' : ''}" data-act="pick" data-id="${o.id}"><span class="opt-main"><span class="opt-title">${o.name}</span><span class="opt-sub">${o.price ? '运费 ¥' + o.price : '免费配送'} · 预计 ${eta(app, o.eta)} 送达</span></span><span class="radio"></span></button>`).join('')}</div>`,
          actions: { pick: (el) => { VT.store.update((st) => { st.checkout.shipping = el.dataset.id; }); app.closeOverlay(ov); app.refresh(); } },
        });
      },
      submit(app) {
        const s = app.s;
        if (!s.checkout.agree) {
          const a = app.screenEl().querySelector('.co-agree');
          a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
          app.toast('请先阅读并同意《用户协议》和《隐私政策》');
          return;
        }
        pay(app);
      },
    },
  };

  /* ---------- simulated payment ---------- */
  /**
   * payLayer(app, { payment, amount, onPaid, onView, onShop, cancelMsg, shopLabel })
   * mock cashier shared by checkout and 我的订单 (去支付). onPaid() runs once the
   * demo payment "succeeds"; the success state then offers 查看订单 / 继续逛逛.
   */
  function payLayer(app, o) {
    const m = D().payments.find((x) => x.id === o.payment) || D().payments[0];
    const ov = app.layer({
      cls: 'co-paylayer', label: '支付',
      html: `<div class="ov-scrim"></div><div class="co-paybox" data-state="open">
          <div class="co-pay-s co-pay-open"><span class="spinner spinner--dark"></span><p>正在调起${m.name}…</p></div>
          <div class="co-pay-s co-pay-confirm">
            <div class="co-pay-brand">${m.logo ? VT.ui.img(m.logo, '') : I('card-bold', { size: 26 })}<span>${m.name} · 模拟收银台</span></div>
            <p class="co-pay-amt">${VT.ui.price(o.amount)}</p>
            <p class="co-pay-note">演示原型不会产生真实扣款</p>
            <button type="button" class="btn btn--dark btn--lg btn--block" data-act="confirm">确认支付</button>
            <button type="button" class="btn btn--ghost btn--lg btn--block" data-act="cancel">取消</button>
          </div>
          <div class="co-pay-s co-pay-busy"><span class="spinner spinner--dark"></span><p>支付处理中…</p></div>
          <div class="co-pay-s co-pay-ok">
            <span class="co-pay-check">${I('check', { size: 30, stroke: 2.6 })}</span>
            <h3>支付成功</h3>
            <p>实付 ${VT.ui.yuan(o.amount)} · 演示订单，未产生真实扣款</p>
            <button type="button" class="btn btn--dark btn--lg btn--block" data-act="view">查看订单</button>
            <button type="button" class="btn btn--ghost btn--lg btn--block" data-act="shop">${o.shopLabel || '继续逛逛'}</button>
          </div>
        </div>`,
      actions: {
        cancel: () => { app.closeOverlay(ov); app.toast(o.cancelMsg || '已取消支付'); },
        confirm: () => {
          box.dataset.state = 'busy';
          app.later(() => { o.onPaid(); box.dataset.state = 'ok'; const b = ov.querySelector('[data-act="view"]'); if (b) b.focus(); }, VT.reducedMotion() ? 200 : 900);
        },
        view: () => o.onView(),
        shop: () => (o.onShop ? o.onShop() : app.closeOverlay(ov)),
      },
    });
    const box = ov.querySelector('.co-paybox');
    app.later(() => { box.dataset.state = 'confirm'; const b = ov.querySelector('[data-act="confirm"]'); if (b) b.focus(); }, VT.reducedMotion() ? 150 : 900);
    return ov;
  }

  function pay(app) {
    const s = app.s;
    let oid = null;
    payLayer(app, {
      payment: s.checkout.payment, amount: totals(s).total, cancelMsg: '已取消支付，订单未提交',
      onPaid: () => { oid = createOrder(app); },
      // the order now lives under 我的 → 我的订单 → 订单详情
      onView: () => { app.drop('checkout'); app.open('orders', { oid }, { anim: 'fade' }); },
      onShop: () => { app.drop('checkout'); app.go('plaza'); },
    });
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function createOrder(app) {
    const s = VT.store.get();
    const c = cartOf(s);
    const p = D().byId[c.p];
    const color = p.colors.find((x) => x.id === c.color) || p.colors[0];
    const ship = D().shippingOptions.find((x) => x.id === s.checkout.shipping) || D().shippingOptions[0];
    const t = totals(s);
    const now = new Date();
    const due = new Date(now.getTime() + ship.eta * 864e5);
    const md = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
    const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const id = `VT${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const order = {
      id, shop: p.brand + ' 官方旗舰店', p: p.id, title: lineTitle(p, color), color: color.id, colorLabel: color.short, size: c.size, qty: c.qty, price: p.price,
      paid: t.total, coupon: t.coupon, shipping: t.ship, payment: s.checkout.payment, address: s.checkout.address,
      status: 0, progress: 1, eta: md(due),
      steps: [{ label: '已下单', time: `${md(now)} ${hm(now)}` }, { label: '已发货', time: '待发货' }, { label: '运输中', time: '—' }, { label: '预计送达', time: md(due) }],
      logistics: [{ t: `${md(now)} ${hm(now)}`, s: '订单已提交并完成支付（演示），等待商家发货' }],
      created: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${hm(now)}:${pad(now.getSeconds())}`,
      carrier: '待分配', isNew: true,
    };
    VT.store.update((st) => {
      st.orders.unshift(order);
      st.currentOrder = id;
      st.cart = null;
      if (!st.wardrobe.some((w) => w.p === p.id)) st.wardrobe.unshift({ uid: VT.store.uid('w'), p: p.id, fav: false, source: 'purchased', color: color.id, size: c.size, addedAt: Date.now() });
      else st.wardrobe.forEach((w) => { if (w.p === p.id && w.source !== 'owned') w.source = 'purchased'; });
    });
    return id;
  }

  VT.pay = payLayer;
})();
