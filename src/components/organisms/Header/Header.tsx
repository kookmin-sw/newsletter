import { useState, useEffect, useRef } from 'react';
import { url, asset } from '@/lib/path';
import * as styles from './Header.css';

interface NavItem { label: string; href: string; external?: boolean }
interface HeaderProps { navigation: NavItem[]; currentPath?: string }

export function Header({ navigation, currentPath = '/' }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const path = currentPath.replace(/\/$/, '') || '/';
  const isActive = (href: string) => {
    const target = href.replace(/\/$/, '') || '/';
    return path === target || (target !== '/' && path.startsWith(`${target}/`));
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) { dialog.close(); return; }
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.close();
    };
  }, [isOpen]);

  return <>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a href={url('/')} className={styles.logo}>
          <img src={asset('/images/logo.svg')} alt="" className={styles.logoImage} width="36" height="36" />
          <span className={styles.brandText}><span className={styles.brandTitle}>KMU-CS Alumni</span><span className={styles.brandSubtitle}>국민대학교 소프트웨어융합대학</span></span>
        </a>
        <nav className={styles.nav} aria-label="주요 내비게이션">
          {navigation.map((item) => <a key={item.href} href={item.href}
            className={`${styles.navLink}${isActive(item.href) ? ` ${styles.navLinkActive}` : ''}`}
            aria-current={isActive(item.href) ? 'page' : undefined}
            {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.label}</a>)}
        </nav>
        <button ref={menuButtonRef} type="button" className={styles.mobileMenuButton}
          onClick={() => setIsOpen(true)} aria-expanded={isOpen} aria-controls="mobile-menu" aria-label="메뉴 열기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </button>
      </div>
    </header>
    <dialog ref={dialogRef} id="mobile-menu" className={styles.mobileDialog} aria-labelledby="mobile-menu-title"
      onCancel={() => setIsOpen(false)}
      onClose={() => { setIsOpen(false); menuButtonRef.current?.focus(); }}
      onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <div className={styles.mobileNav}>
        <div className={styles.mobileNavHeader}>
          <div className={styles.brandText}><span id="mobile-menu-title" className={styles.mobileNavTitle}>KMU-CS Alumni</span><span className={styles.brandSubtitle}>국민대학교 소프트웨어융합대학</span></div>
          <button type="button" className={styles.mobileNavClose} onClick={() => setIsOpen(false)} aria-label="메뉴 닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <nav aria-label="모바일 내비게이션">
          {navigation.map((item) => <a key={item.href} href={item.href} onClick={() => setIsOpen(false)}
            className={`${styles.mobileNavLink}${isActive(item.href) ? ` ${styles.mobileNavLinkActive}` : ''}`}
            aria-current={isActive(item.href) ? 'page' : undefined}
            {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.label}<span aria-hidden="true">{item.external ? '↗' : '→'}</span></a>)}
        </nav>
      </div>
    </dialog>
  </>;
}
