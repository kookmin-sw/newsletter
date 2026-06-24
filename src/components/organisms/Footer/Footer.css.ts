import { style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';
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
  gap: space[6],
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: '1fr auto',
      alignItems: 'start',
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
  height: '2.5rem',
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
  maxWidth: '360px',
});

export const footerLinkGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: space[2],
});

export const footerLinkTitle = style({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.neutral[200],
  marginBottom: space[2],
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
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

export const footerBottom = style({
  marginTop: space[6],
  paddingTop: space[6],
  borderTop: `1px solid ${colors.neutral[800]}`,
  fontSize: fontSize.sm,
  display: 'flex',
  flexDirection: 'column',
  gap: space[2],
  '@media': {
    '(min-width: 768px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  },
});
