import {
  createTheme,
  createThemeContract,
  style,
  globalStyle,
} from '@vanilla-extract/css';
import { colors } from './tokens/colors.css';
import { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './tokens/typography.css';
import { space, radius, shadow, contentWidth } from './tokens/spacing.css';

/**
 * Theme Contract — 다크모드 확장 가능하도록 contract 기반 설계
 */
export const vars = createThemeContract({
  color: {
    background: null,
    backgroundAlt: null,
    surface: null,
    border: null,
    borderLight: null,
    text: null,
    textSecondary: null,
    textTertiary: null,
    textInverse: null,
    primary: null,
    primaryHover: null,
    primaryLight: null,
    focus: null,
    accent: null,
    accentLight: null,
  },
  font: {
    body: null,
    display: null,
    mono: null,
  },
});

/**
 * Light Theme (기본)
 */
export const lightTheme = createTheme(vars, {
  color: {
    background: colors.semantic.background,
    backgroundAlt: colors.semantic.backgroundAlt,
    surface: colors.semantic.surface,
    border: colors.semantic.border,
    borderLight: colors.semantic.borderLight,
    text: colors.semantic.text,
    textSecondary: colors.semantic.textSecondary,
    textTertiary: colors.semantic.textTertiary,
    textInverse: colors.semantic.textInverse,
    primary: colors.kmuBlue[500],
    primaryHover: colors.kmuBlue[600],
    primaryLight: colors.kmuBlue[50],
    focus: colors.kmuBlue[400],
    accent: colors.accent.gold,
    accentLight: colors.accent.goldLight,
  },
  font: {
    body: fontFamily.body,
    display: fontFamily.display,
    mono: fontFamily.mono,
  },
});

/**
 * 글로벌 리셋 및 기본 스타일
 */
globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
});

globalStyle('html', {
  fontSize: '16px',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility',
  WebkitTextSizeAdjust: '100%',
  scrollBehavior: 'smooth',
  scrollPaddingTop: '6rem',
  '@media': { '(prefers-reduced-motion: reduce)': { scrollBehavior: 'auto' } },
});

globalStyle('body', {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.regular,
  lineHeight: lineHeight.body,
  letterSpacing: letterSpacing.normal,
  color: colors.semantic.text,
  backgroundColor: colors.semantic.background,
  wordBreak: 'keep-all',
  overflowWrap: 'break-word',
});

globalStyle('img', {
  maxWidth: '100%',
  height: 'auto',
  display: 'block',
});

globalStyle('a', {
  color: 'inherit',
  textDecoration: 'none',
});

globalStyle(':focus-visible', {
  outline: `2px solid ${colors.kmuBlue[400]}`,
  outlineOffset: '2px',
});

/**
 * 유틸리티 스타일
 */
export const container = style({
  width: '100%',
  maxWidth: contentWidth.full,
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

export const narrowContainer = style({
  width: '100%',
  maxWidth: contentWidth.narrow,
  marginInline: 'auto',
  paddingInline: space[4],
  '@media': {
    '(min-width: 768px)': {
      paddingInline: space[6],
    },
  },
});

export const section = style({
  paddingBlock: space[16],
  '@media': {
    '(max-width: 768px)': {
      paddingBlock: space[10],
    },
  },
});
