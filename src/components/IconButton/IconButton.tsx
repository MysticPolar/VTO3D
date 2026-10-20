import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from '@/components/Icon/Icon';
import styles from './IconButton.module.css';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-label'> {
  icon: IconName;
  /** the Chinese aria-label */
  label: string;
  size?: number;
  stroke?: number;
}

/** A 44 × 44 round icon button (css/components.css .icon-btn) */
export function IconButton({ icon, label, size = 24, stroke, className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={clsx(styles['icon-btn'], className)}
      aria-label={label}
      {...rest}
    >
      <Icon name={icon} size={size} stroke={stroke} />
    </button>
  );
}
