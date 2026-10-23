import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './kit.module.css';

type Kind =
  /** star gold: the one thing to do next */
  | 'primary'
  /** text only, for the quieter second choice */
  | 'ghost'
  /** a ringed button (Dim all, Duel a random stargazer) */
  | 'outline'
  /** the duel's mint */
  | 'mint'
  /** a soft translucent chip (Challenge, name suggestions) */
  | 'soft';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
  /** full width */
  block?: boolean;
  /** `xs` is for the admin pages' dense panels */
  size?: 'lg' | 'md' | 'sm' | 'xs';
  tone?: 'mint' | 'soft';
}

/** Stargazer's pill button. */
export function Button({ kind = 'primary', block = false, size = 'lg', tone, className, ...rest }: Props) {
  return (
    <button {...rest}
      className={cx(styles.btn, styles['btn-' + kind], styles['btn-' + size], block && styles.btnBlock, tone && styles['btnTone-' + tone], className)} />
  );
}
