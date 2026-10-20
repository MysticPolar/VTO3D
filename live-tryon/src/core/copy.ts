/**
 * Every string the live try-on layer shows, in one place.
 *
 * VERBATIM strings are copied from the prototype (reference/prototype/js/camera.js unless noted)
 * and must stay as they are (CLAUDE.md golden rule 2).
 *
 * DRAFT strings are new: the prototype's layer is a camera preview with no AI, so it has no words
 * for connecting to a model, garments being applied, sessions ending or sending video abroad. They
 * are proposals for the Mobile UI/UX session to settle in the prototype first (PROPOSALS.md), and
 * they replace two prototype lines that live try-on makes untrue:
 *   「画面只在本机显示，不会上传或保存。」 (the video does leave the device)
 *   「实时 AI 换装需接入试衣模型服务，当前原型仅提供摄像头预览」 (it is no longer only a preview)
 */
import type { ServiceErrorCode } from './protocol.js';

export const VERBATIM = {
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
  /** 首页 (03-fitting.js:1, :41, :78-79, :120) */
  roomTitle: '虚拟试衣间',
  categoriesLabel: '服装分类',
  railLabel: '可试穿单品',
  tryLabel: (name: string) => `试穿${name}`,
  tried: (name: string) => `已试穿：${name}`,
} as const;

export const DRAFT = {
  /** replaces 「视频试衣 · 预览」 */
  pill: 'AI 视频试衣',
  /** replaces the 首页 camera button's 「开启视频试衣（摄像头预览）」 */
  openLabel: '开启 AI 视频试衣',
  /** replaces 「开启摄像头后，你可以在镜头前实时预览自己。」/「画面只在本机显示，不会上传或保存。」 */
  introBody: [
    '开启摄像头后，AI 会实时为你换上所选单品。',
    '画面仅用于实时生成试穿效果，本应用不保存你的视频。',
  ],
  /** PIPL: separate, explicit consent to sending face video abroad; never pre-ticked */
  consent: '我同意将摄像头画面实时传送至境外（美国）的 AI 服务商 Decart 处理，用于视频试衣',
  consentNeeded: '请先勾选同意，再开启摄像头',
  accessCodeLabel: '测试访问码',
  accessCodePlaceholder: '请输入访问码',
  accessCodeNeeded: '请先输入测试访问码',
  connecting: '正在连接 AI 试衣…',
  waitingCapacity: '试衣服务繁忙，正在排队…',
  queued: (position: number) => `正在排队，前面还有 ${position} 人`,
  reconnecting: '网络不稳定，正在重新连接…',
  applying: (name: string) => `正在换上「${name}」…`,
  garmentFailed: '这件单品暂时无法实时试穿，请换一件试试',
  /** China's AI-content labelling rules: a visible mark on generated video */
  aiLabel: 'AI生成',
  /** replaces 「实时 AI 换装需接入试衣模型服务，当前原型仅提供摄像头预览」 */
  foot: '画面由 AI 实时生成，仅供试穿参考，颜色与版型以实物为准',
  restart: '重新开始',
  resume: '继续试衣',
} as const;

export interface PanelCopy {
  title: string;
  body: string;
  /** null hides the primary button (retrying cannot help) */
  primary: string | null;
  secondary: string;
}

/** Why the layer shows a panel instead of video */
export type Problem =
  | { kind: 'camera'; name: string }
  | { kind: 'unsupported' }
  | {
      kind: 'service';
      code:
        ServiceErrorCode | 'network' | 'unavailable' | 'moderation' | 'session_limit' | 'credits';
    }
  | { kind: 'ended'; reason: 'timeout' | 'hidden' | 'remote' };

const panel = (
  title: string,
  body: string,
  primary: string | null = VERBATIM.retry,
): PanelCopy => ({
  title,
  body,
  primary,
  secondary: VERBATIM.backToRoom,
});

/**
 * Camera errors, VERBATIM (camera.js `errorCopy`). The prototype's embedded-preview case
 * (「当前页面无法使用摄像头」) is dropped, as HANDOFF §9.10 says for the web build.
 */
function cameraCopy(name: string): PanelCopy {
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return panel(
      '没有获得摄像头权限',
      '请在浏览器地址栏左侧的「网站设置」中允许使用摄像头，然后点击重试。',
    );
  }
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  ) {
    return panel(
      '未检测到可用的摄像头',
      '请确认设备已连接摄像头，或换一台带摄像头的设备打开原型。',
    );
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return panel('摄像头正被占用', '摄像头可能正被其他应用使用，请关闭后重试。');
  }
  if (name === 'Unsupported') {
    return panel(
      '当前环境不支持摄像头',
      '摄像头需要在 HTTPS 或 localhost 环境下使用，请用 README 中的本地服务器方式打开原型。',
    );
  }
  return panel('无法开启摄像头', '请稍后重试。');
}

/** DRAFT: everything that can go wrong after the camera works */
function serviceCopy(code: Extract<Problem, { kind: 'service' }>['code']): PanelCopy {
  switch (code) {
    case 'access_code_required':
    case 'access_code_invalid':
      return panel('访问码不正确', '请输入正确的测试访问码后重试。');
    case 'busy':
    case 'session_limit':
      return panel('试衣服务繁忙', '当前使用人数较多，请稍后重试。');
    case 'rate_limited':
      return panel('操作太频繁', '请稍等一分钟后重试。');
    case 'budget_exhausted':
      return panel('今日试衣额度已用完', '请明天再来试试。', null);
    case 'network':
      return panel('网络连接失败', '实时试衣需要稳定的网络，请检查网络后重试。');
    case 'moderation':
      return panel('试衣已停止', '画面内容未通过审核，请调整画面后重试。');
    default:
      return panel('试衣服务暂时不可用', '请稍后重试。');
  }
}

export function panelCopy(problem: Problem, maxSessionSeconds: number): PanelCopy {
  switch (problem.kind) {
    case 'camera':
      return cameraCopy(problem.name);
    case 'unsupported':
      return panel('当前浏览器不支持实时试衣', '请使用最新版的 Safari、Chrome 或微信打开。', null);
    case 'service':
      return serviceCopy(problem.code);
    case 'ended':
      if (problem.reason === 'timeout') {
        const limit =
          maxSessionSeconds % 60 === 0
            ? `${maxSessionSeconds / 60} 分钟`
            : `${maxSessionSeconds} 秒`;
        return panel('本次试衣已结束', `每次实时试衣最长 ${limit}，可以重新开始。`, DRAFT.restart);
      }
      if (problem.reason === 'hidden') {
        return panel('试衣已暂停', '离开页面时摄像头会自动关闭。', DRAFT.resume);
      }
      return panel('试衣已断开', 'AI 试衣服务结束了本次连接，请稍后重试。');
  }
}
