import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Astro Content Collections 설정
 * MDX 기사를 빌드 타임에 타입 안전하게 처리
 */

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    excerpt: z.string().optional(),
    publishedAt: z.string().transform((s) => new Date(s)),
    updatedAt: z.string().transform((s) => new Date(s)).optional(),
    author: z.string(),
    authorRole: z.string().optional(),
    coverImage: z.string().optional(),
    thumbnail: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z
      .enum(['notice', 'interview', 'event', 'story', 'column', 'news'])
      .optional(),
    draft: z.boolean().default(false),
    externalUrl: z.string().url().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    excerpt: z.string().optional(),
    publishedAt: z.string().transform((s) => new Date(s)),
    updatedAt: z.string().transform((s) => new Date(s)).optional(),
    author: z.string(),
    authorRole: z.string().optional(),
    coverImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    format: z.enum(['html']).optional(),
  }),
});

export const collections = { articles, news };
