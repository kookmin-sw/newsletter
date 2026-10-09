import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';
import { space } from '@/styles/tokens/spacing.css';

export const sectionHeaderWrapper = style({
  marginBottom: space[8],
});

export const sectionLabel = style({
  display: 'inline-block',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: vars.color.primary,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: space[3],
});

export const sectionDescription = style({
  marginTop: space[3],
  maxWidth: '640px',
  fontSize: '1rem',
});

export const sectionDivider = style({
  width: '3rem',
  height: '3px',
  backgroundColor: vars.color.primary,
  border: 'none',
  marginTop: space[4],
});

export const sectionHeaderCenter = style({
  textAlign: 'center',
});

globalStyle(`${sectionHeaderCenter} ${sectionDescription}`, {
  marginInline: 'auto',
});

globalStyle(`${sectionHeaderCenter} ${sectionDivider}`, {
  marginInline: 'auto',
});
