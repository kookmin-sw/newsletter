import { style, globalStyle, keyframes } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';
import { space, zIndex } from '@/styles/tokens/spacing.css';

const drawerEnter = keyframes({ from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'translateX(0)' } });

export const header = style({ position: 'sticky', top: 0, zIndex: zIndex.sticky, backgroundColor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${vars.color.borderLight}` });
export const headerInner = style({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '5rem',
  maxWidth: '1200px', marginInline: 'auto', paddingInline: space[4],
  '@media': { '(min-width: 768px)': { paddingInline: space[6] }, '(min-width: 1024px)': { paddingInline: space[8] } },
});
export const logo = style({ display: 'flex', alignItems: 'center', gap: space[3], color: vars.color.text, fontWeight: 650, fontSize: '1.0625rem', letterSpacing: '-0.025em', whiteSpace: 'nowrap' });
export const logoImage = style({ height: '2.5rem', width: '2.5rem' });
export const brandText = style({ display: 'flex', flexDirection: 'column', gap: '2px' });
export const brandTitle = style({ fontSize: '1.0625rem', fontWeight: 700, lineHeight: '1.3' });
export const brandSubtitle = style({ fontSize: '0.6875rem', fontWeight: 500, color: vars.color.textSecondary, letterSpacing: '-0.01em', lineHeight: '1.5' });
export const nav = style({
  display: 'none', alignItems: 'center', gap: space[8],
  '@media': { '(min-width: 900px)': { display: 'flex' } },
});
export const navLink = style({
  position: 'relative', display: 'inline-flex', alignItems: 'center',
  height: '5rem', paddingInline: space[1],
  fontSize: '0.9375rem', fontWeight: 500, color: vars.color.textSecondary,
  transition: 'color 180ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
  ':active': { transform: 'translateY(1px)' },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', ':active': { transform: 'none' } } },
  ':hover': { color: vars.color.primary },
  ':focus-visible': { outline: `2px solid ${vars.color.primary}`, outlineOffset: '-8px', borderRadius: '4px' },
  '::after': {
    content: '""', position: 'absolute', bottom: '18px', left: space[1], right: space[1],
    height: '2px', borderRadius: '2px', backgroundColor: vars.color.primary, opacity: 0, transform: 'scaleX(0.5)',
    transition: 'opacity 180ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
});
export const navLinkActive = style({
  color: vars.color.primary, fontWeight: 600,
  '::after': { opacity: 1, transform: 'scaleX(1)' },
});
export const mobileMenuButton = style({
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
  border: `1px solid ${vars.color.borderLight}`, background: '#F3F4F6', cursor: 'pointer', borderRadius: '12px', color: vars.color.text,
  '@media': { '(min-width: 900px)': { display: 'none' } },
});
export const mobileDialog = style({ position: 'fixed', inset: 0, width: '100%', maxWidth: 'none', height: '100%', maxHeight: 'none', border: 0, background: 'transparent', padding: 0 });
globalStyle(`${mobileDialog}::backdrop`, { backgroundColor: 'rgba(15,23,42,0.45)' });
export const mobileNav = style({ position: 'absolute', inset: '0 0 0 auto', width: '360px', maxWidth: '86vw', background: '#fff', padding: space[6], boxShadow: '-16px 0 64px rgba(15,23,42,0.12)', overflowY: 'auto' });
export const mobileNavHeader = style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[2], paddingBottom: space[6], marginBottom: space[3], borderBottom: `1px solid ${vars.color.borderLight}` });
export const mobileNavTitle = style({ fontWeight: 600, fontSize: '1rem', color: vars.color.text });
export const mobileNavClose = style({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', border: 0, background: vars.color.surface, color: vars.color.text, cursor: 'pointer', borderRadius: '50%' });
export const mobileNavLink = style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${space[4]} ${space[4]}`, minHeight: '60px', fontSize: '1.0625rem', fontWeight: 500, color: vars.color.text, borderRadius: '12px', marginBottom: space[2], ':hover': { backgroundColor: vars.color.surface } });
export const mobileNavLinkActive = style({ color: vars.color.text, backgroundColor: '#F0F2F5', fontWeight: 650 });

globalStyle(`${navLink}:hover::after`, { opacity: 0.4, transform: 'scaleX(1)' });
globalStyle(`${navLinkActive}:hover::after`, { opacity: 1 });
globalStyle(`${mobileDialog}[open] > div`, {
  animation: `${drawerEnter} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});
globalStyle(`${navLink}::after`, {
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
