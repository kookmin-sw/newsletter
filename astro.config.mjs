import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { rehypeImages } from './src/lib/rehype-images.mjs';
import { isIndexablePath } from './src/lib/seo.mjs';
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
    sitemap({
      filter: (page) => isIndexablePath(new URL(page).pathname),
      // public/ 정적 페이지는 Astro가 모르므로 직접 등록
      customPages: ['https://alumni.cs.kookmin.ac.kr/2026_Alumni_event/'],
    }),
  ],
  vite: {
    plugins: [
      vanillaExtractPlugin(isDev ? { unstable_mode: 'transform' } : {}),
    ],
  },
  markdown: {
    rehypePlugins: [rehypeImages],
    shikiConfig: {
      theme: 'github-light',
    },
  },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },
});
