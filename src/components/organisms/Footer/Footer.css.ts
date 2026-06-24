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
  maxWidth: '720px',
  marginInline: 'auto',
  paddingInline: space[4],
  textAlign: 'center',
  '@media': {
    '(min-width: 768px)': {
      paddingInline: space[6],
    },
  },
});

export const footerLogoSection = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  maxWidth: '460px',
  marginInline: 'auto',
});

export const footerLinks = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  columnGap: space[5],
  rowGap: space[2],
  marginTop: space[5],
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
  paddingTop: space[5],
  borderTop: `1px solid ${colors.neutral[800]}`,
  fontSize: fontSize.sm,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: space[1],
  '@media': {
    '(min-width: 768px)': {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: space[4],
    },
  },
});
