import { style } from '@vanilla-extract/css';
import { space } from '@/styles/tokens/spacing.css';
import { fontFamily } from '@/styles/tokens/typography.css';

export const hero = style({
  position: 'relative', backgroundColor: '#122033', color: '#fff', overflow: 'hidden',
  paddingBlock: '4.5rem 1.5rem',
  '@media': { '(max-width: 768px)': { paddingBlock: '3rem 1rem' } },
});
export const heroBackground = style({ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #122033, #233e5b)' });
export const carouselContainer = style({ position: 'absolute', inset: 0 });
export const carouselSlide = style({
  position: 'absolute', inset: 0, transition: 'opacity 950ms cubic-bezier(0.22, 1, 0.36, 1)',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
export const carouselImage = style({ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' });
export const carouselOverlay = style({
  position: 'absolute', inset: 0,
  background: 'linear-gradient(90deg, rgba(9,20,34,0.92) 0%, rgba(9,20,34,0.72) 44%, rgba(9,20,34,0.18) 100%), linear-gradient(0deg, rgba(9,20,34,0.75), transparent 35%)',
  '@media': { '(max-width: 768px)': { background: 'linear-gradient(90deg, rgba(9,20,34,0.88), rgba(9,20,34,0.6))' } },
});
export const heroContent = style({
  position: 'relative', maxWidth: '1200px', marginInline: 'auto', paddingInline: space[4],
  '@media': { '(min-width: 768px)': { paddingInline: space[6] }, '(min-width: 1024px)': { paddingInline: space[8] } },
});
export const heroLabel = style({ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', color: '#D5E0EF', marginBottom: space[5] });
export const heroTitle = style({
  fontFamily: fontFamily.display, fontSize: 'clamp(2rem, 3.8vw, 3.25rem)', fontWeight: 700,
  lineHeight: 1.25, letterSpacing: '-0.04em', maxWidth: '680px', wordBreak: 'keep-all', textWrap: 'balance',
});
export const heroSubtitle = style({
  fontSize: '1.0625rem', lineHeight: 1.75, color: '#DFE6EF', maxWidth: '530px', marginTop: space[5], wordBreak: 'keep-all',
  '@media': { '(max-width: 768px)': { fontSize: '1rem' } },
});
export const heroActions = style({ display: 'flex', gap: space[3], marginTop: space[6], flexWrap: 'wrap' });
export const heroStat = style({ display: 'flex', gap: space[8], marginTop: space[8], flexWrap: 'wrap' });
export const heroStatItem = style({ display: 'flex', alignItems: 'baseline', gap: space[2] });
export const heroStatValue = style({ fontSize: '1.5rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' });
export const heroStatLabel = style({ fontSize: '0.8125rem', color: '#CDD7E4' });
export const carouselFooter = style({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[6],
  marginTop: space[10], paddingTop: space[5], borderTop: '1px solid rgba(255,255,255,0.2)',
  '@media': { '(max-width: 768px)': { flexDirection: 'column', alignItems: 'stretch', gap: space[3] } },
});
export const carouselCaption = style({
  display: 'flex', alignItems: 'center', gap: space[3], maxWidth: '720px', fontSize: '0.875rem',
  lineHeight: 1.6, color: '#fff', textDecoration: 'none',
  ':hover': { textDecoration: 'underline', textUnderlineOffset: '4px' },
});
export const carouselControls = style({ display: 'flex', alignItems: 'center', gap: space[2], flexShrink: 0 });
export const carouselControl = style({
  width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(9,20,34,0.2)', color: '#fff', cursor: 'pointer', fontSize: '1rem',
  transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease',
  ':hover': { background: 'rgba(255,255,255,0.15)', transform: 'scale(1.06)' },
  ':active': { transform: 'scale(0.94)', transitionDuration: '90ms' },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', ':hover': { transform: 'none' }, ':active': { transform: 'none' } } },
});
export const carouselCount = style({ paddingInline: space[2], fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums', color: '#E4EAF2' });
