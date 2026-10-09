import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@/styles/theme.css';
import { fontSize, fontWeight, fontFamily } from '@/styles/tokens/typography.css';
import { space } from '@/styles/tokens/spacing.css';

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    fontFamily: fontFamily.body,
    fontWeight: fontWeight.medium,
    lineHeight: 1,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, border-color 180ms ease, color 180ms ease',
    ':active': { transform: 'scale(0.97)', transitionDuration: '90ms' },
    '@media': {
      '(hover: hover) and (pointer: fine)': { ':hover': { transform: 'translateY(-2px)' } },
      '(prefers-reduced-motion: reduce)': { transition: 'none', ':hover': { transform: 'none' }, ':active': { transform: 'none' } },
    },
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    ':focus-visible': {
      outline: `2px solid ${vars.color.focus}`,
      outlineOffset: '2px',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    },
  },
  variants: {
    variant: {
      primary: {
        backgroundColor: vars.color.primary,
        color: vars.color.textInverse,
        ':hover': {
          backgroundColor: vars.color.primaryHover,
        },
      },
      secondary: {
        backgroundColor: 'transparent',
        color: vars.color.text,
        border: `1px solid ${vars.color.border}`,
        ':hover': {
          backgroundColor: vars.color.primaryLight,
        },
      },
      'ghost-light': {
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)',
        ':hover': {
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderColor: 'rgba(255,255,255,0.4)',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: vars.color.text,
        ':hover': {
          backgroundColor: vars.color.surface,
        },
      },
      link: {
        backgroundColor: 'transparent',
        color: vars.color.primary,
        padding: '0 !important',
        ':hover': {
          textDecoration: 'underline',
        },
      },
    },
    size: {
      sm: {
        fontSize: fontSize.sm,
        padding: `${space[2]} ${space[3]}`,
        height: '2rem',
      },
      md: {
        fontSize: fontSize.base,
        padding: `${space[2]} ${space[5]}`,
        height: '2.75rem',
      },
      lg: {
        fontSize: fontSize.lg,
        padding: `${space[3]} ${space[6]}`,
        height: '3rem',
      },
    },
    fullWidth: {
      true: { width: '100%' },
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
  },
});
