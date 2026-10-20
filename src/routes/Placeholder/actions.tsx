import type { Area, Entry } from '@/app/nav/grammar';
import type { Nav } from '@/app/nav/NavContext';
import { Button } from '@/components/Button/Button';
import type { OverlayApi } from '@/components/Overlay/OverlayContext';
import { useSession } from '@/store/session';
import styles from './Placeholder.module.css';

export interface PlaceholderAction {
  label: string;
  run: () => void;
}

/** seed orders: one in transit, one with a return in progress */
const ORDER = 'VT20260715092418';
const RETURN_ORDER = 'VT20260702110846';

/** What each placeholder's buttons do: push the next screens of its flows, and the contextual
 * jumps, chain opens, drops and resets the real screens will use */
export function placeholderActions(
  entry: Entry,
  area: Area,
  nav: Nav,
  overlay: OverlayApi,
): PlaceholderAction[] {
  const push = (label: string, segment: string) => ({ label, run: () => nav.push(segment) });
  const product = push('商品详情', 'p/striped-shirt');
  switch (entry.screen) {
    case 'onboarding':
      return [push('开始体验', 'avatar')];
    case 'avatar':
      return area === 'welcome'
        ? [
            {
              label: '进入虚拟试衣间',
              run: () => {
                useSession.getState().setSetupDone(true);
                nav.resetTo('/home');
              },
            },
          ]
        : [];
    case 'fitting':
    case 'wardrobe':
    case 'stylist':
    case 'favorites':
    case 'history':
      return [product];
    case 'plaza':
      return [
        product,
        push('结算下单', 'checkout'),
        { label: '订单详情', run: () => nav.openPath(`/me/orders/o/${ORDER}`) },
        ...overlayDemos(nav, overlay),
      ];
    case 'product':
      return [
        push('结算下单', 'checkout'),
        push('同类商品', 'p/black-blazer'),
        { label: '加入衣橱', run: () => nav.jumpToTab('wardrobe') },
        { label: '试穿上身', run: () => nav.jumpToTab('home') },
      ];
    case 'checkout':
      return [
        push('收货地址', 'addresses'),
        // the real cashier is a layer, and 查看订单 leaves it for 订单详情 (HANDOFF §4.3)
        {
          label: '立即下单',
          run: () =>
            overlay.layer({
              label: 'Cashier',
              render: () => (
                <div className={styles.layer}>
                  <h2>Cashier</h2>
                  <Button
                    onClick={() => {
                      nav.drop('checkout');
                      nav.openPath(`/me/orders/o/${ORDER}`);
                    }}
                  >
                    查看订单
                  </Button>
                </div>
              ),
            }),
        },
      ];
    case 'profile':
      return [
        push('我的订单', 'orders'),
        push('我的形象', 'avatar'),
        push('我的资料', 'profile'),
        push('收货地址', 'addresses'),
        push('支付方式', 'payments'),
        push('消息通知', 'notifications'),
        push('设置', 'settings'),
        push('帮助与客服', 'help'),
        push('我的收藏', 'favorites'),
        push('浏览记录', 'history'),
      ];
    case 'orderlist':
      return [
        push('订单详情', `o/${ORDER}`),
        push('物流跟踪', `tracking/${ORDER}`),
        push('申请退换货', `returns/${RETURN_ORDER}`),
        product,
      ];
    case 'orders':
      return [
        push('物流跟踪', 'tracking'),
        push('申请退换货', 'returns'),
        push('帮助与客服', 'help'),
      ];
    case 'avatarhub':
      return [push('上传照片', 'upload')];
    case 'settings':
      return [
        push('隐私与安全', 'privacy'),
        push('收货地址', 'addresses'),
        push('我的资料', 'profile'),
        push('消息通知', 'notifications'),
        {
          label: '重新体验首次启动',
          run: () => {
            useSession.getState().setSetupDone(false);
            nav.resetTo('/welcome');
          },
        },
      ];
    default:
      return [];
  }
}

/** The overlay kinds, for the navigation tests (development labels, not app copy) */
function overlayDemos(nav: Nav, overlay: OverlayApi): PlaceholderAction[] {
  return [
    {
      label: 'Sheet',
      run: () =>
        overlay.sheet({
          title: 'Sheet',
          render: (sheet) => (
            <div className={styles.demo}>
              <Button variant="light" onClick={() => nav.push('p/striped-shirt')}>
                商品详情
              </Button>
              <Button variant="light" onClick={() => void overlay.dialog({ title: 'Dialog' })}>
                Dialog
              </Button>
              <Button variant="light" onClick={sheet.close}>
                关闭
              </Button>
            </div>
          ),
        }),
    },
    {
      label: 'Dialog',
      run: () =>
        void overlay
          .dialog({ title: 'Dialog', text: 'Placeholder' })
          .then((ok) => overlay.toast(ok ? 'OK' : 'Cancel')),
    },
    {
      label: 'Layer',
      run: () =>
        overlay.layer({
          label: 'Layer',
          render: (layer) => (
            <div className={styles.layer}>
              <h2>Layer</h2>
              <Button onClick={layer.close}>关闭</Button>
            </div>
          ),
        }),
    },
    {
      label: 'Busy',
      run: () => {
        const sheet = overlay.sheet({ title: 'Busy', render: () => <p>Busy</p> });
        sheet.setBusy(true);
        window.setTimeout(() => sheet.setBusy(false), 1500);
      },
    },
    { label: 'Toast', run: () => overlay.toast('Toast') },
  ];
}
