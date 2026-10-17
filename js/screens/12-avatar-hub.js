/* 我的形象 — digital avatar management (secondary, from 我的)
   View the current avatar, replace photos, regenerate, edit body data and
   avatar preferences. Generation itself is simulated (see 02-avatar.js). */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);
  const esc = (x) => VT.esc(x);

  function md(ts) { const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

  VT.screens.avatarhub = {
    title: '我的形象',
    render(app) {
      const s = app.s;
      const a = s.avatar;
      const ready = a.status === 'ready';
      const b = s.body;
      const shot = (slot, label, sample) => {
        const up = a[slot];
        return `<figure class="ah-shot">${VT.ui.img(up ? up.src : sample, up ? `我上传的${label}` : `示例${label}`)}<figcaption>${label}<em>${up ? '已上传' : '示例'}</em></figcaption></figure>`;
      };
      return `
        ${VT.ui.subHead('我的形象')}
        <div class="scroll sub-scroll ah-scroll" data-keep-scroll="ah">
          <section class="ah-hero">
            <div class="ah-plate">${VT.ui.img('assets/people/avatar-base.webp', '我的数字分身：穿白色吊带背心与蓝色牛仔裤的全身形象', 'ah-fig')}</div>
            <div class="ah-info">
              <span class="ah-chip ${ready ? 'is-ok' : ''}">${ready ? I('check', { size: 12, stroke: 2.6 }) : ''}${ready ? '已生成' : '示例形象'}</span>
              <h2>我的数字分身</h2>
              <p>${ready && a.generatedAt ? `更新于 ${md(a.generatedAt)}` : ready ? '使用示例照片生成' : '尚未用你的照片生成'}</p>
              <p class="ah-note">2D 形象预览 · 演示版</p>
              <button type="button" class="btn btn--dark btn--sm" data-act="tab" data-to="fitting">${I('dress', { size: 16 })}去试衣间</button>
            </div>
          </section>
          <section class="set-group"><h2 class="set-h">生成照片</h2>
            <div class="set-card ah-shots">
              ${shot('fullbody', '全身照', 'assets/people/upload-fullbody.webp')}
              ${shot('portrait', '生活照', 'assets/people/upload-portrait.webp')}
            </div>
            <div class="ah-acts">
              <button type="button" class="btn btn--ghost btn--lg" data-act="photos">${I('upload', { size: 18 })}更换照片</button>
              <button type="button" class="btn btn--dark btn--lg" data-act="regen">${I('refresh', { size: 18 })}重新生成</button>
            </div>
          </section>
          <section class="set-group"><h2 class="set-h">身材数据</h2>
            <div class="set-card">
              ${VT.ui.row({ act: 'body', icon: 'ruler', label: '身高 / 体重', value: `${esc(b.height)} cm · ${esc(b.weight)} kg` })}
              ${VT.ui.row({ act: 'body', icon: 'tshirt', label: '常穿尺码', value: `${esc(b.size)} · 鞋码 ${esc(b.shoe)}` })}
            </div>
            <p class="set-note">用于合身度参考和尺码推荐</p>
          </section>
          <section class="set-group"><h2 class="set-h">形象偏好</h2>
            <div class="set-card">
              ${VT.ui.toggleRow('试穿时显示尺码建议', 'avatarPrefs.sizeTips', s.avatarPrefs.sizeTips, '根据身材数据提示偏大或偏小')}
              ${VT.ui.toggleRow('AI 造型师使用我的形象', 'avatarPrefs.stylistUse', s.avatarPrefs.stylistUse, '推荐造型时用数字分身预览上身效果')}
            </div>
            <p class="set-note">照片只保存在本机，可在「设置 → 隐私与安全」中清除</p>
          </section>
        </div>`;
    },
    actions: {
      photos(app) { app.go('avatar', { from: 'profile' }); },
      regen(app) { VT.avatarGen.run(app); },
      toggle(app, el) {
        const [grp, key] = el.dataset.key.split('.');
        let on = false;
        VT.store.update((s) => { s[grp][key] = !s[grp][key]; on = s[grp][key]; });
        el.classList.toggle('is-on', on);
        el.setAttribute('aria-checked', on);
      },
      body(app) {
        const b = app.s.body;
        const sizes = ['XS', 'S', 'M', 'L', 'XL'];
        let size = b.size;
        const ov = app.sheet({
          title: '身材数据',
          html: `
            <div class="ah-fields">
              <label class="field"><span class="field-label">身高（cm）</span><span class="field-row"><input type="number" inputmode="numeric" min="130" max="210" class="js-h" value="${esc(b.height)}" aria-label="身高（厘米）"></span></label>
              <label class="field"><span class="field-label">体重（kg）</span><span class="field-row"><input type="number" inputmode="numeric" min="30" max="150" class="js-w" value="${esc(b.weight)}" aria-label="体重（公斤）"></span></label>
            </div>
            <span class="field-label">常穿尺码</span>
            <div class="ad-tags">${sizes.map((z) => `<button type="button" class="chip ${z === size ? 'is-on' : ''}" data-act="size" data-v="${z}">${z}</button>`).join('')}</div>
            <label class="field"><span class="field-label">鞋码</span><span class="field-row"><input type="number" inputmode="numeric" min="33" max="46" class="js-shoe" value="${esc(b.shoe)}" aria-label="鞋码"></span></label>
            <button type="button" class="btn btn--dark btn--lg btn--block" data-act="save">保存</button>`,
          actions: {
            size: (el) => { size = el.dataset.v; ov.querySelectorAll('.ad-tags .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.v === size)); },
            save: () => {
              const h = +ov.querySelector('.js-h').value, w = +ov.querySelector('.js-w').value, shoe = +ov.querySelector('.js-shoe').value;
              if (!(h >= 130 && h <= 210)) { app.toast('身高请填写 130–210 cm'); return; }
              if (!(w >= 30 && w <= 150)) { app.toast('体重请填写 30–150 kg'); return; }
              if (!(shoe >= 33 && shoe <= 46)) { app.toast('鞋码请填写 33–46'); return; }
              VT.store.update((s) => { s.body = { height: h, weight: w, size, shoe: String(shoe) }; });
              app.closeOverlay(ov);
              app.refresh();
              app.toast('身材数据已更新', { icon: 'check' });
            },
          },
        });
      },
    },
  };
})();
