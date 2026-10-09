import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';
import { space } from '@/styles/tokens/spacing.css';
import { fontSize, fontWeight, lineHeight } from '@/styles/tokens/typography.css';

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '16px',
  border: `1px solid ${vars.color.borderLight}`,
  backgroundColor: vars.color.background,
  overflow: 'hidden',
  transition: 'border-color 220ms ease, box-shadow 320ms ease, transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
  ':hover': {
    borderColor: vars.color.border,
    boxShadow: '0 12px 30px rgba(15,23,42,0.07)',
    transform: 'translateY(-3px)',
  },
  ':active': { transform: 'translateY(-1px) scale(0.99)', transitionDuration: '100ms' },
  ':focus-within': { outline: `2px solid ${vars.color.primary}`, outlineOffset: '4px' },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', ':hover': { transform: 'none' }, ':active': { transform: 'none' } } },
});

export const cardImage = style({
  width: '100%',
  aspectRatio: '16 / 10',
  objectFit: 'cover',
  backgroundColor: vars.color.surface,
  transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
  selectors: { [`${card}:hover &`]: { transform: 'scale(1.025)' } },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', selectors: { [`${card}:hover &`]: { transform: 'none' } } } },
});

export const cardImagePlaceholder = style({
  width: '100%',
  aspectRatio: '16 / 10',
  backgroundColor: vars.color.primaryLight,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.color.primary,
  fontSize: fontSize.lg,
});

export const cardBody = style({
  padding: space[5],
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
  flex: 1,
});

export const cardMeta = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: space[2],
  fontSize: '0.75rem',
  color: vars.color.textSecondary,
});

export const cardTitle = style({
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  lineHeight: lineHeight.heading,
  color: vars.color.text,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
});

export const cardExcerpt = style({
  fontSize: fontSize.sm,
  color: vars.color.textSecondary,
  lineHeight: lineHeight.body,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
});

export const cardLink = style({
  textDecoration: 'none',
  color: 'inherit',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  ':focus-visible': { outline: 'none' },
});

export const cardTags = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space[1],
  marginTop: 'auto',
});
