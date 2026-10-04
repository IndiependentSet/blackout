import type { InputHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Field.module.css';

/** A text input in the sticker style. */
export function Field({ compact, code, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { compact?: boolean; code?: boolean }) {
  return <input className={cx(styles.field, compact && styles.compact, code && styles.code, className)} {...rest} />;
}
