import clsx from 'clsx';
import type { MouseEvent } from 'react';
import type { TabArea } from '@/app/nav/grammar';
import { useNav } from '@/app/nav/NavContext';
import { useScreen } from '@/app/nav/Screen';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { prefersReducedMotion } from '@/lib/motion';
import styles from './TabBar.module.css';

/** The five tabs, in order (js/data.js `tabs`); `id` is the prototype's screen id */
const TABS: { area: TabArea; id: string; label: string; icon: IconName; iconOn: IconName }[] = [
  { area: 'home', id: 'fitting', label: '首页', icon: 'home', iconOn: 'home-filled' },
  { area: 'plaza', id: 'plaza', label: '购物广场', icon: 'bag', iconOn: 'bag-filled' },
  {
    area: 'wardrobe',
    id: 'wardrobe',
    label: '个人衣橱',
    icon: 'wardrobe',
    iconOn: 'closet-filled',
  },
  { area: 'stylist', id: 'stylist', label: 'AI造型师', icon: 'sparkle', iconOn: 'sparkle-filled' },
  { area: 'me', id: 'profile', label: '我的', icon: 'person', iconOn: 'person-filled' },
];

/**
 * The one bottom navigation (HANDOFF §4.3), drawn inside each tab root so it moves with the
 * root during push and pop. A tab switch is instant and brings back that tab's stack; tapping
 * the active tab scrolls its main scroll area back to the top.
 */
export function TabBar() {
  const { area } = useScreen();
  const nav = useNav();

  const select = (tab: TabArea, e: MouseEvent<HTMLButtonElement>) => {
    if (tab !== area) {
      nav.switchTab(tab);
      return;
    }
    e.currentTarget
      .closest('[data-screen]')
      ?.querySelector('[data-main-scroll]')
      ?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <nav className={styles.tabbar} aria-label="主导航">
      {TABS.map((t) => {
        const on = t.area === area;
        return (
          <button
            key={t.area}
            type="button"
            className={clsx(styles.tab, on && styles['is-on'])}
            data-to={t.id}
            aria-current={on ? 'page' : undefined}
            onClick={(e) => select(t.area, e)}
          >
            <Icon name={on ? t.iconOn : t.icon} size={28} stroke={1.55} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
