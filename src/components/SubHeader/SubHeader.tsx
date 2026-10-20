import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useNav } from '@/app/nav/NavContext';
import { IconButton } from '@/components/IconButton/IconButton';
import styles from './SubHeader.module.css';

/** The back button of secondary screens (js/ui.js `backBtn`) */
export function BackButton({ light, className }: { light?: boolean; className?: string }) {
  const nav = useNav();
  return (
    <IconButton
      icon="back"
      size={23}
      stroke={2.1}
      label="返回"
      className={clsx(styles['back-btn'], light && styles['is-light'], className)}
      onClick={() => nav.back()}
    />
  );
}

/** The header of secondary screens: back button, centred title, optional right action
 * (js/ui.js `subHead`) */
export function SubHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className={styles['sub-head']}>
      <BackButton />
      <h1 className={styles['sub-title']}>{title}</h1>
      {right}
    </header>
  );
}
