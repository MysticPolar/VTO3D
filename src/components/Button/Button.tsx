import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: 'dark' | 'light' | 'outline' | 'ghost';
  size?: 'xl' | 'lg' | 'sm';
  block?: boolean;
  type?: 'button' | 'submit';
}

/** The prototype's pill button (css/components.css .btn) */
export function Button({
  variant = 'dark',
  size,
  block,
  type = 'button',
  className,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        styles.btn,
        styles[`btn--${variant}`],
        size && styles[`btn--${size}`],
        block && styles['btn--block'],
        className,
      )}
      {...rest}
    />
  );
}
