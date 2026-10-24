import type { ReactNode } from 'react';
import styles from './kit.module.css';

/** A stroked 24px icon in the design's line style. */
export const Icon = ({ children, size = 22 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={styles.iconSvg} aria-hidden="true">{children}</svg>
);

export const BackIcon = () => <Icon><path d="m15 18-6-6 6-6" /></Icon>;
export const ChevronIcon = ({ size = 18 }: { size?: number }) => <Icon size={size}><path d="m9 18 6-6-6-6" /></Icon>;
export const CloseIcon = () => <Icon><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>;
export const ResetIcon = () => <Icon><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Icon>;
export const MoonIcon = ({ size = 18 }: { size?: number }) => <Icon size={size}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></Icon>;
export const BookIcon = ({ size = 18 }: { size?: number }) => <Icon size={size}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></Icon>;
export const UserIcon = ({ size = 18 }: { size?: number }) => <Icon size={size}><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></Icon>;
export const BoltIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></Icon>
);
export const SwordsIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}>
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" x2="19" y1="19" y2="13" /><line x1="16" x2="20" y1="16" y2="20" />
    <line x1="19" x2="21" y1="21" y2="19" /><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" /><line x1="5" x2="9" y1="14" y2="18" />
    <line x1="7" x2="4" y1="17" y2="20" /><line x1="3" x2="5" y1="19" y2="21" />
  </Icon>
);
export const LockIcon = ({ size = 13 }: { size?: number }) => <Icon size={size}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>;
export const ShareIcon = () => <Icon size={18}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></Icon>;
