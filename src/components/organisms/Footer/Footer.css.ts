import { style } from '@vanilla-extract/css';
import { space } from '@/styles/tokens/spacing.css';
import { fontSize, fontWeight } from '@/styles/tokens/typography.css';
import { colors } from '@/styles/tokens/colors.css';

export const footer = style({
  backgroundColor: colors.neutral[900],
  color: colors.neutral[400],
  paddingBlock: space[8],
});

export const footerInner = style({
  maxWidth: '1200px',
  marginInline: 'auto',
  paddingInline: space[4],
  '@media': {
    '(min-width: 768px)': {
      paddingInline: space[6],
    },
    '(min-width: 1024px)': {
      paddingInline: space[8],
    },
  },
});

export const footerGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: space[8],
  '@media': {
    '(min-width: 640px)': {
      gridTemplateColumns: '1.6fr 1fr 1fr',
      gap: space[10],
    },
  },
});

export const footerLogoSection = style({
  display: 'flex',
  alignItems: 'center',
  gap: space[3],
  marginBottom: space[3],
});

export const footerLogo = style({
  height: '2.25rem',
  width: 'auto',
});

export const footerTitle = style({
  fontSize: fontSize.lg,
  fontWeight: fontWeight.bold,
  color: colors.neutral[0],
});

export const footerDescription = style({
  fontSize: fontSize.sm,
  lineHeight: '1.6',
  maxWidth: '340px',
});

export const footerColTitle = style({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.neutral[200],
  marginBottom: space[3],
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const footerLinkGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: space[2],
});

export const footerLink = style({
  fontSize: fontSize.sm,
  color: colors.neutral[400],
  textDecoration: 'none',
  transition: 'color 0.15s ease',
  ':hover': {
    color: colors.neutral[0],
  },
});

export const footerText = style({
  fontSize: fontSize.sm,
  color: colors.neutral[400],
});

export const footerBottom = style({
  marginTop: space[8],
  paddingTop: space[6],
  borderTop: `1px solid ${colors.neutral[800]}`,
  fontSize: fontSize.sm,
});
