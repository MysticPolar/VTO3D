import { describe, expect, it } from 'vitest';
import { panelCopy, VERBATIM } from './copy.js';

describe('camera panels', () => {
  it('match the prototype’s errorCopy word for word', () => {
    expect(panelCopy({ kind: 'camera', name: 'NotAllowedError' }, 120)).toEqual({
      title: '没有获得摄像头权限',
      body: '请在浏览器地址栏左侧的「网站设置」中允许使用摄像头，然后点击重试。',
      primary: '重试',
      secondary: '返回试衣间',
    });
    expect(panelCopy({ kind: 'camera', name: 'NotFoundError' }, 120).body).toBe(
      '请确认设备已连接摄像头，或换一台带摄像头的设备打开原型。',
    );
    expect(panelCopy({ kind: 'camera', name: 'NotReadableError' }, 120).body).toBe(
      '摄像头可能正被其他应用使用，请关闭后重试。',
    );
    expect(panelCopy({ kind: 'camera', name: 'Unsupported' }, 120).body).toBe(
      '摄像头需要在 HTTPS 或 localhost 环境下使用，请用 README 中的本地服务器方式打开原型。',
    );
    expect(panelCopy({ kind: 'camera', name: 'Whatever' }, 120)).toMatchObject({
      title: '无法开启摄像头',
      body: '请稍后重试。',
    });
  });

  it('keeps the prototype’s labels', () => {
    expect(VERBATIM).toMatchObject({
      layerLabel: '视频试衣',
      videoLabel: '摄像头实时画面',
      closeLabel: '关闭视频试衣',
      switchLabel: '切换前后摄像头',
      introTitle: '开启视频试衣',
      allow: '允许使用摄像头',
      notNow: '暂不开启',
      waitCamera: '正在请求摄像头权限…',
      retry: '重试',
      backToRoom: '返回试衣间',
      switched: '已切换摄像头',
    });
    expect(VERBATIM.tried('黑色西装外套')).toBe('已试穿：黑色西装外套');
  });
});

describe('session panels', () => {
  it('say how long a session may run', () => {
    expect(panelCopy({ kind: 'ended', reason: 'timeout' }, 120).body).toBe(
      '每次实时试衣最长 2 分钟，可以重新开始。',
    );
    expect(panelCopy({ kind: 'ended', reason: 'timeout' }, 45).body).toBe(
      '每次实时试衣最长 45 秒，可以重新开始。',
    );
    expect(panelCopy({ kind: 'ended', reason: 'timeout' }, 120).primary).toBe('重新开始');
  });

  it('hide retry where retrying cannot help', () => {
    expect(panelCopy({ kind: 'service', code: 'budget_exhausted' }, 120).primary).toBeNull();
    expect(panelCopy({ kind: 'unsupported' }, 120).primary).toBeNull();
    expect(panelCopy({ kind: 'service', code: 'busy' }, 120).primary).toBe('重试');
  });

  it('always offer the way back', () => {
    for (const code of [
      'network',
      'moderation',
      'credits',
      'access_code_invalid',
      'unavailable',
    ] as const) {
      expect(panelCopy({ kind: 'service', code }, 120).secondary).toBe('返回试衣间');
    }
  });
});
