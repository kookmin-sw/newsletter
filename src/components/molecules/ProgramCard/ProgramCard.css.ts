import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';
import { space, radius } from '@/styles/tokens/spacing.css';
import { fontSize, fontWeight, lineHeight } from '@/styles/tokens/typography.css';

export const programCard = style({
  padding: space[6],
  borderRadius: '16px',
  border: `1px solid ${vars.color.borderLight}`,
  backgroundColor: vars.color.background,
});

export const programCardLink = style({
  transition: 'border-color 220ms ease, box-shadow 320ms ease, transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
  ':hover': { transform: 'translateY(-3px)', borderColor: vars.color.primary, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' },
  ':active': { transform: 'scale(0.99)', transitionDuration: '100ms' },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', ':hover': { transform: 'none' }, ':active': { transform: 'none' } } },
});

export const programTitle = style({
  fontSize: fontSize.xl,
  fontWeight: fontWeight.semibold,
  color: vars.color.text,
  marginBottom: space[2],
});

export const programDescription = style({
  fontSize: fontSize.sm,
  color: vars.color.textSecondary,
  lineHeight: lineHeight.body,
  marginBottom: space[3],
  wordBreak: 'keep-all',
});

export const programBadgeRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: space[2],
  marginBottom: space[2],
});

export const programSchedule = style({
  fontSize: fontSize.sm,
  color: vars.color.textTertiary,
  display: 'flex',
  alignItems: 'center',
  gap: space[1],
});

export const programStatus = style({
  display: 'inline-block',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  padding: `${space[1]} ${space[2]}`,
  borderRadius: radius.full,
});
