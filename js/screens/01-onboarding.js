/* 启动页 / Onboarding — first-launch flow only (secondary screen) */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);

  /** demo login sheet (启动页 and 设置); after() runs once logged in */
  function openLogin(app, after) {
    const ov = app.sheet({
      title: '登录',
      cls: 'sheet-login',
      html: `
        <p class="sheet-lead">登录后可同步你的数字分身、衣橱与订单。</p>
        <label class="field"><span class="field-label">手机号</span>
          <span class="field-row"><span class="field-prefix">+86</span><input type="tel" inputmode="numeric" maxlength="11" placeholder="请输入手机号" value="13800138888" data-focus-key="phone" aria-label="手机号"></span></label>
        <label class="field"><span class="field-label">验证码</span>
          <span class="field-row"><input type="text" inputmode="numeric" maxlength="6" placeholder="6 位验证码" aria-label="验证码" class="js-code"><button type="button" class="field-btn" data-act="code">获取验证码</button></span></label>
        <button type="button" class="btn btn--dark btn--lg btn--block" data-act="do-login">登录</button>
        <p class="sheet-note">演示原型：不会发送短信，也不会创建真实账号。</p>`,
      actions: {
        code(el) {
          const input = ov.querySelector('.js-code');
          input.value = '246810';
          el.disabled = true;
          let n = 59;
          el.textContent = `${n}s 后重发`;
          const t = setInterval(() => {
            n -= 1;
            if (!document.body.contains(el)) { clearInterval(t); return; }
            if (n <= 0) { clearInterval(t); el.disabled = false; el.textContent = '重新获取'; } else el.textContent = `${n}s 后重发`;
          }, 1000);
          app.toast('演示验证码已自动填入');
        },
        'do-login'() {
          VT.store.update((s) => { s.loggedIn = true; });
          app.closeOverlay(ov);
          app.toast('登录成功（演示账号）', { icon: 'check' });
          if (after) app.later(after, 500);
        },
      },
    });
    return ov;
  }

  VT.screens.onboarding = {
    title: '启动页',
    render() {
      return `
      <div class="onb">
        ${VT.ui.img('assets/people/onboarding-scene.webp', '身穿米白针织衫与阔腿裤的模特站在暖色调的服装店内', 'onb-bg', 'fetchpriority="high"')}
        <div class="onb-shade" aria-hidden="true"></div>
        <div class="onb-copy">
          <h1 class="onb-title"><span>全新的</span><span>购物体验<i class="onb-dot" aria-hidden="true"></i></span></h1>
          <p class="onb-tagline">更智能，更个性化的<br>时尚购物方式。</p>
          <ul class="onb-features">
            <li><span class="onb-ic">${I('dress-hanger', { size: 26, stroke: 1.5 })}</span><div><strong>虚拟试衣</strong><span>真实上身效果</span></div></li>
            <li><span class="onb-ic">${I('hanger', { size: 27, stroke: 1.5 })}</span><div><strong>个人衣橱</strong><span>统一管理搭配</span></div></li>
            <li><span class="onb-ic">${I('bag-line-handle', { size: 25, stroke: 1.5 })}</span><div><strong>智能推荐</strong><span>发现你的风格</span></div></li>
          </ul>
        </div>
        <div class="onb-actions">
          <button type="button" class="btn btn--dark btn--xl onb-start" data-act="start">开始体验<span class="btn-arrow">${I('arrow-right', { size: 22, stroke: 1.6 })}</span></button>
          <button type="button" class="btn btn--outline btn--xl onb-login" data-act="login">登录</button>
        </div>
      </div>`;
    },
    actions: {
      start(app) {
        const s = VT.store.get();
        if (s.avatar.status === 'ready') app.enterMain();
        else app.go('avatar', { from: 'launch' });
      },
      login(app) {
        // a returning account already has a digital avatar: go straight to 首页
        openLogin(app, () => {
          VT.store.update((s) => { if (s.avatar.status !== 'ready') { s.avatar.status = 'ready'; s.avatar.demo = true; } });
          app.enterMain();
        });
      },
    },
  };

  VT.login = openLogin;
})();
