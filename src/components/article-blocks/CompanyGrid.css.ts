import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@/styles/theme.css';

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 16,
  listStyle: 'none',
});
globalStyle(`.article-content ul.${grid}`, { padding: 0 });

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 16,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 12,
  background: '#fff',
  height: '100%',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  ':hover': { transform: 'translateY(-4px)', boxShadow: '0 6px 18px #0000000d', borderColor: vars.color.primary },
  ':focus-visible': { outline: `2px solid ${vars.color.primary}`, outlineOffset: 3, transform: 'translateY(-4px)' },
  ':active': { transform: 'translateY(-1px)' },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } },
});
globalStyle(`.article-content a.${card}`, {
  color: vars.color.text,
  textDecoration: 'none',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
globalStyle(`.${card}:hover, .${card}:focus-visible`, {
  '@media': { '(prefers-reduced-motion: reduce)': { transform: 'none' } },
});

export const logoArea = style({
  width: '100%',
  height: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
});
export const logoImage = style({ width: '100%', height: '100%', objectFit: 'contain' });
export const companyName = style({ fontSize: '1rem', fontWeight: 600, textAlign: 'center' });
export const visitLabel = style({ fontSize: '0.75rem', color: vars.color.primary, marginTop: 6 });
