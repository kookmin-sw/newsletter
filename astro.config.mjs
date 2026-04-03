import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

const isDev = process.argv.includes('dev');

// base path는 src/lib/path.ts의 BASE와 동기화할 것
export default defineConfig({
  site: 'https://alumni.cs.kookmin.ac.kr',
  base: '/',
  output: 'static',
  integrations: [
    react(),
    mdx(),
    sitemap(),
  ],
  vite: {
    plugins: [
      vanillaExtractPlugin(isDev ? { unstable_mode: 'transform' } : {}),
    ],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },
});
