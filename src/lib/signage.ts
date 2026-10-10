import { getCollection, z, type CollectionEntry } from 'astro:content';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import { validateManifest, type Manifest } from '@kmucs/signage-player';
import config from '@/content/config/signage.json';
import site from '@/content/config/site.json';
import { newsletterSummaries } from './newsletter-summaries.mjs';

const settingsSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  pollIntervalSeconds: z.number().min(15).max(3600),
  sessions: z.array(z.object({
    id: z.string(), newsletterId: z.string(), title: z.string(), issue: z.string(), dateLabel: z.string(),
    startsAt: z.string(), defaultDurationSeconds: z.number().min(5).max(600),
    transitionMilliseconds: z.number().min(0).max(2000),
    detailCount: z.union([z.literal(1), z.literal(2)]).optional(),
    items: z.array(z.object({ articleId: z.string(), durationSeconds: z.number().min(5).max(600).optional() }).strict()).min(1).max(100).optional(),
  }).strict()).min(1).max(20),
}).strict();

const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const qr = (url: string) => QRCode.toDataURL(url, { margin: 2, width: 240 });
let cached: Promise<Manifest> | undefined;

export function getSignageManifest(): Promise<Manifest> {
  // Content is fixed during a build. Development requests rebuild to reflect edited settings.
  if (import.meta.env.DEV) return buildManifest();
  return cached ??= buildManifest();
}

async function buildManifest(): Promise<Manifest> {
  const settings = settingsSchema.parse(config);
  const [articles, news] = await Promise.all([
    getCollection('articles', ({ data }) => !data.draft),
    getCollection('news', ({ data }) => !data.draft),
  ]);
  const sources = summarySources(news);
  const branding = {
    siteUrl: site.siteUrl, logo: '/images/newsletter-logo.png',
    fontRegular: '/fonts/KMU-Regular.ttf', fontBold: '/fonts/KMU-Bold.ttf', qr: await qr(site.siteUrl),
  };
  const paths = new Set([branding.logo, branding.fontRegular, branding.fontBold]);
  const sessions = await Promise.all(settings.sessions.map(async (s) => {
    const newsletter = news.find((n) => n.id === s.newsletterId);
    if (!newsletter) throw new Error(`사이니지: 뉴스레터 없음: ${s.newsletterId}`);
    const refs = s.items ?? (newsletter.data.articleIds ?? Object.keys(sources.byNewsletter[newsletter.id] ?? {})).map((articleId) => ({ articleId, durationSeconds: undefined }));
    if (!refs?.length) throw new Error(`사이니지: ${s.id}의 items 또는 뉴스레터 articleIds가 필요합니다.`);
    const selected = refs.map((ref) => {
      const article = articles.find((a) => a.id === ref.articleId);
      if (!article) throw new Error(`사이니지: 공개 기사를 찾을 수 없습니다: ${ref.articleId}`);
      return { ref, article, summary: sources.byNewsletter[newsletter.id]?.[article.id] ?? sources.latest[article.id] };
    }).filter(item => item.summary?.length);
    if (!selected.length) throw new Error(`사이니지: ${s.id}에 뉴스레터 요약이 있는 기사가 없습니다. 뉴스레터에 요약을 추가하세요.`);
    const items = await Promise.all(selected.map(async ({ ref, article, summary }) => {
      if (article.data.coverImage) paths.add(article.data.coverImage);
      return displayArticle(article, ref.durationSeconds ?? s.defaultDurationSeconds, summary);
    }));
    return { id: s.id, title: s.title, issue: s.issue, dateLabel: s.dateLabel, startsAt: s.startsAt, transitionMilliseconds: s.transitionMilliseconds, detailCount: s.detailCount, items };
  }));
  const assets = await Promise.all([...paths].sort().map(async (path) => {
    if (!/^\/(images|fonts)\/[a-zA-Z0-9_./-]+$/.test(path) || path.includes('..')) throw new Error(`사이니지: 로컬 이미지 경로만 허용: ${path}`);
    return { path, sha256: hash(await readFile(resolve('public', path.slice(1)))) };
  }));
  const payload = { schemaVersion: settings.schemaVersion, pollIntervalSeconds: settings.pollIntervalSeconds, branding, assets, sessions };
  return validateManifest({ ...payload, revision: hash(JSON.stringify(payload)) });
}

function summarySources(news: CollectionEntry<'news'>[]) {
  const byNewsletter: Record<string, Record<string, string[]>> = Object.create(null);
  const latest: Record<string, string[]> = Object.create(null);
  for (const newsletter of [...news].sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || b.id.localeCompare(a.id))) {
    const summaries = newsletter.data.format === 'html' ? newsletterSummaries(newsletter.body ?? '', site.siteUrl) : {};
    byNewsletter[newsletter.id] = summaries;
    for (const [id, summary] of Object.entries(summaries)) latest[id] ??= summary;
  }
  return { byNewsletter, latest };
}

async function displayArticle(article: CollectionEntry<'articles'>, durationSeconds: number, newsletterSummary: string[]) {
  const data = article.data;
  const excerpt = data.displayExcerpt ?? data.excerpt ?? data.subtitle ?? '';
  const articleUrl = new URL(`/articles/${article.id}/`, site.siteUrl).href;
  const categories: Record<string, string> = { notice: '공지', interview: '인터뷰', event: '행사', story: '이야기', column: '칼럼', news: '보도자료' };
  return {
    id: article.id, title: data.title, excerpt, summary: newsletterSummary,
    author: data.author, category: categories[data.category ?? 'news'], tags: data.tags.slice(0, 3),
    ...(data.coverImage ? { image: data.coverImage } : {}), url: articleUrl, qr: await qr(articleUrl), durationSeconds,
  };
}

export async function getSignageSetupData() {
  const current = await getSignageManifest();
  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  const news = await getCollection('news', ({ data }) => !data.draft);
  const sources = summarySources(news);
  const assets = new Map(current.assets.map(a => [a.path, a]));
  const available = [];
  const entries = [];
  for (const article of articles) {
    const summary = sources.latest[article.id];
    if (!summary?.length) continue;
    let error = '';
    try {
      const item = await displayArticle(article, 20, summary);
      const candidateAssets = new Map(assets);
      if (item.image && !candidateAssets.has(item.image)) {
        if (!/^\/images\/[a-zA-Z0-9_./-]+$/.test(item.image) || item.image.includes('..')) throw new Error('로컬 대표 이미지가 필요합니다.');
        candidateAssets.set(item.image, { path: item.image, sha256: hash(await readFile(resolve('public', item.image.slice(1)))) });
      }
      validateManifest({ ...current, assets: [...candidateAssets.values()], sessions: [{ ...current.sessions[0], items: [item] }] });
      for (const [path, asset] of candidateAssets) assets.set(path, asset);
      available.push(item);
    } catch (e) { error = e instanceof Error ? e.message : String(e); }
    entries.push({ id: article.id, title: article.data.title, date: article.data.publishedAt.toISOString().slice(0, 10),
      image: article.data.coverImage ?? '', error });
  }
  const sessions = [];
  for (let i = 0; i < available.length; i += 100) sessions.push({ ...current.sessions[0], id: `catalog-${i / 100}`, items: available.slice(i, i + 100) });
  const used = new Set([current.branding.logo, current.branding.fontRegular, current.branding.fontBold,
    ...available.flatMap(a => a.image ? [a.image] : [])]);
  const catalog = validateManifest({ ...current, assets: [...assets.values()].filter(a => used.has(a.path)), sessions });
  return { current, catalog, entries, configuration: settingsSchema.parse(config),
    summaries: sources.byNewsletter,
    newsletters: news.map(n => ({ id: n.id, title: n.data.title, articleIds: (n.data.articleIds ?? Object.keys(sources.byNewsletter[n.id] ?? {})).filter(id => sources.latest[id]?.length) })) };
}
