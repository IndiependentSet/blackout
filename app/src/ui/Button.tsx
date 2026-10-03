import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'paper' | 'accent' | 'mint' | 'muted' | 'glass';
export type ButtonSize = 'mini' | 'chip' | 'nav' | 'md' | 'lg' | 'xl';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

/** The chunky sticker button. Colour and size are variants; one-off layout goes through `className`/`style`. */
export function Button({ variant = 'primary', size = 'md', block, className, type = 'button', ...rest }: Props) {
  return <button type={type} className={cx(styles.btn, styles[variant], styles[size], block && styles.block, className)} {...rest} />;
}
