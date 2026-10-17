/* ==========================================================================
   Video try-on — MVP camera preview (navigator.mediaDevices.getUserMedia).
   Shows the live camera feed only. No real-time AI garment replacement and
   no video call are simulated; the UI says so.
   ========================================================================== */
(function () {
  const VT = window.VT;
  const I = (n, o) => VT.icon(n, o);

  // Chrome reports whether the hosting page allows the camera at all
  function blockedByHost() {
    const p = document.permissionsPolicy || document.featurePolicy;
    try { if (p && p.allowsFeature) return !p.allowsFeature('camera'); } catch (e) { /* ignore */ }
    return false;
  }

  function errorCopy(err) {
    const name = err && err.name;
    const denied = name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError';
    if (blockedByHost() || (denied && VT.framed)) {
      return { t: '当前页面无法使用摄像头', s: '在线预览嵌在受限页面中，浏览器不允许调用摄像头。下载项目后用 localhost 或 HTTPS 打开，即可体验视频试衣。', retry: false };
    }
    if (denied) {
      return { t: '没有获得摄像头权限', s: '请在浏览器地址栏左侧的「网站设置」中允许使用摄像头，然后点击重试。' };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      return { t: '未检测到可用的摄像头', s: '请确认设备已连接摄像头，或换一台带摄像头的设备打开原型。' };
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return { t: '摄像头正被占用', s: '摄像头可能正被其他应用使用，请关闭后重试。' };
    }
    if (name === 'Unsupported') {
      return { t: '当前环境不支持摄像头', s: '摄像头需要在 HTTPS 或 localhost 环境下使用，请用 README 中的本地服务器方式打开原型。' };
    }
    return { t: '无法开启摄像头', s: '请稍后重试。' };
  }

  function open(app) {
    let stream = null;
    let facing = 'user';
    let devices = [];
    let devIndex = 0;

    const ov = app.layer({
      cls: 'cam', label: '视频试衣',
      html: `
        <div class="cam-view">
          <video class="cam-video" playsinline muted autoplay aria-label="摄像头实时画面"></video>
          <div class="cam-top">
            <button type="button" class="cam-btn" data-act="close" aria-label="关闭视频试衣">${I('close', { size: 22, stroke: 2 })}</button>
            <span class="cam-title"><i class="cam-rec" aria-hidden="true"></i>视频试衣 · 预览</span>
            <button type="button" class="cam-btn" data-act="switch" aria-label="切换前后摄像头" hidden>${I('switch-camera', { size: 22, stroke: 1.8 })}</button>
          </div>
          <div class="cam-panel" data-state="intro">
            <div class="cam-intro">
              <span class="cam-ic">${I('video-filled', { size: 28 })}</span>
              <h2>开启视频试衣</h2>
              <p>开启摄像头后，你可以在镜头前实时预览自己。<br>画面只在本机显示，不会上传或保存。</p>
              <button type="button" class="btn btn--light btn--lg btn--block" data-act="start">允许使用摄像头</button>
              <button type="button" class="btn cam-cancel btn--lg btn--block" data-act="close">暂不开启</button>
            </div>
            <div class="cam-wait"><span class="spinner"></span><p>正在请求摄像头权限…</p></div>
            <div class="cam-err">
              <span class="cam-ic">${I('info', { size: 28, stroke: 1.6 })}</span>
              <h2 class="cam-err-t"></h2>
              <p class="cam-err-s"></p>
              <button type="button" class="btn btn--light btn--lg btn--block" data-act="start">重试</button>
              <button type="button" class="btn cam-cancel btn--lg btn--block" data-act="close">返回试衣间</button>
            </div>
          </div>
          <p class="cam-foot">实时 AI 换装需接入试衣模型服务，当前原型仅提供摄像头预览</p>
        </div>`,
      actions: {
        close: () => app.closeOverlay(ov),
        start: () => start(),
        switch: () => switchCam(),
      },
      onClose: stop,
    });

    const video = ov.querySelector('.cam-video');
    const panel = ov.querySelector('.cam-panel');
    const swBtn = ov.querySelector('[data-act="switch"]');
    const setState = (st) => { panel.dataset.state = st; ov.querySelector('.cam-view').dataset.state = st; };
    setTimeout(() => { const b = ov.querySelector('[data-act="start"]'); if (b) b.focus({ preventScroll: true }); }, 60);

    function stop() {
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      if (video) video.srcObject = null;
    }

    async function start(constraintsOverride) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        fail({ name: 'Unsupported' });
        return;
      }
      if (blockedByHost()) { fail({ name: 'NotAllowedError', message: 'camera blocked by the hosting page' }); return; }
      setState('wait');
      stop();
      const video_ = constraintsOverride || { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } };
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: video_, audio: false });
        if (!document.body.contains(ov)) { stop(); return; }
        video.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        const settings = track && track.getSettings ? track.getSettings() : {};
        video.classList.toggle('is-mirror', (settings.facingMode || facing) !== 'environment');
        await video.play().catch(() => {});
        setState('live');
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          devices = all.filter((d) => d.kind === 'videoinput');
          swBtn.hidden = devices.length < 2;
        } catch (e) { swBtn.hidden = true; }
      } catch (err) {
        fail(err);
      }
    }

    function fail(err) {
      const c = errorCopy(err);
      ov.querySelector('.cam-err-t').textContent = c.t;
      ov.querySelector('.cam-err-s').textContent = c.s;
      ov.querySelector('.cam-err [data-act="start"]').hidden = c.retry === false;
      setState('error');
      console.info('[camera]', err && err.name, err && err.message);
    }

    function switchCam() {
      if (devices.length > 1) {
        devIndex = (devIndex + 1) % devices.length;
        facing = facing === 'user' ? 'environment' : 'user';
        start({ deviceId: { exact: devices[devIndex].deviceId } });
        app.toast('已切换摄像头');
      }
    }
    return ov;
  }

  VT.camera = { open };
})();
