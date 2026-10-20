import type { ScreenRegistry } from '@/app/nav/TabHost';
import { Placeholder } from './Placeholder/Placeholder';

const placeholder = (title: string) => ({ title, component: Placeholder });

/**
 * Every screen of HANDOFF §8, with the prototype's title (its `aria-label`). Phase 1 shows a
 * placeholder for each; the phases that build the screens replace them here.
 */
export const SCREENS: ScreenRegistry = {
  fitting: placeholder('虚拟试衣间'),
  plaza: placeholder('购物广场'),
  wardrobe: placeholder('个人衣橱'),
  stylist: placeholder('AI 造型师'),
  profile: placeholder('我的'),
  onboarding: placeholder('启动页'),
  avatar: placeholder('上传照片，创建数字分身'),
  product: placeholder('商品详情'),
  checkout: placeholder('结算下单'),
  orderlist: placeholder('我的订单'),
  orders: placeholder('订单详情'),
  tracking: placeholder('物流跟踪'),
  returns: placeholder('申请退换货'),
  avatarhub: placeholder('我的形象'),
  editprofile: placeholder('我的资料'),
  addresses: placeholder('收货地址'),
  payments: placeholder('支付方式'),
  notifications: placeholder('消息通知'),
  settings: placeholder('设置'),
  privacy: placeholder('隐私与安全'),
  help: placeholder('帮助与客服'),
  favorites: placeholder('我的收藏'),
  history: placeholder('浏览记录'),
};
