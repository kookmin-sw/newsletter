import { style, globalStyle } from '@vanilla-extract/css';
import { space } from '@/styles/tokens/spacing.css';
import { fontSize, fontWeight } from '@/styles/tokens/typography.css';
import { colors } from '@/styles/tokens/colors.css';

export const footer = style({
  backgroundColor: '#F7F8FA',
  borderTop: `1px solid ${colors.neutral[200]}`,
  color: colors.neutral[700],
  paddingBlock: space[6],
  '@media': { '(min-width: 900px)': { paddingBlock: space[8] } },
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
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: space[4],
  '@media': {
    '(min-width: 900px)': {
      gridTemplateColumns: '1.5fr 1fr 1.2fr',
      gap: space[10],
    },
  },
});

export const footerBrand = style({
  gridColumn: '1 / -1',
  '@media': { '(min-width: 900px)': { gridColumn: 'auto' } },
});
export const footerDescriptionExtra = style({
  display: 'none',
  '@media': { '(min-width: 900px)': { display: 'inline' } },
});

export const footerLogoSection = style({
  display: 'flex',
  alignItems: 'center',
  gap: space[3],
  marginBottom: space[2],
});

export const footerLogo = style({
  height: '2.25rem',
  width: 'auto',
});

export const footerTitle = style({
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: colors.neutral[900],
});

export const footerDescription = style({
  fontSize: fontSize.sm,
  lineHeight: '1.6',
  maxWidth: '340px',
});

export const footerColTitle = style({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.neutral[800],
  marginBottom: space[2],
  letterSpacing: '-0.01em',
});

export const footerLinkGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: space[1],
});

export const footerLink = style({
  fontSize: fontSize.sm,
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  minHeight: '24px',
  width: 'fit-content',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  color: colors.neutral[700],
  textDecoration: 'none',
  transition: 'color 0.15s ease',
  ':hover': {
    color: colors.neutral[900],
  },
});

export const footerText = style({
  display: 'none',
  '@media': { '(min-width: 900px)': { display: 'inline' } },
  fontSize: fontSize.sm,
  color: colors.neutral[700],
});

export const footerBottom = style({
  marginTop: space[4],
  paddingTop: space[4],
  borderTop: `1px solid ${colors.neutral[200]}`,
  fontSize: fontSize.sm,
});

export const footerSites = style({
  display: 'none',
  '@media': { '(min-width: 900px)': { display: 'block' } },
});
export const footerSiteLinks = style({ whiteSpace: 'nowrap' });
export const footerContact = style({
  display: 'flex', alignItems: 'baseline', gap: space[4],
  '@media': { '(min-width: 900px)': { display: 'block' } },
});
globalStyle(`${footerContact} > div:first-child`, { marginBottom: 0, '@media': { '(min-width: 900px)': { marginBottom: space[2] } } });
