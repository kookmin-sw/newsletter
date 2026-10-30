import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'parse5';
import { isIndexablePath } from '../src/lib/seo.mjs';

const site = 'https://alumni.cs.kookmin.ac.kr';
const sitemap = await readFile(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert(urls.length > 0, 'Sitemap is empty');
const listed = new Set(urls);
assert.equal(listed.size, urls.length, 'Duplicate sitemap URLs');
for (const href of urls) {
  const url = new URL(href);
  assert.equal(url.origin, site);
  assert(isIndexablePath(url.pathname), `Non-search page in sitemap: ${href}`);
  assert(url.pathname.endsWith('/'), `Redirecting sitemap URL: ${href}`);
}

function elements(node, name) {
  return [ ...(node.nodeName === name ? [node] : []), ...(node.childNodes ?? []).flatMap(child => elements(child, name)) ];
}
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
let pages = 0;
async function check(directory, parts = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) await check(new URL(`${entry.name}/`, directory), [...parts, entry.name]);
    else if (entry.name === 'index.html' || entry.name === '404.html') {
      const path = entry.name === '404.html' ? '/404.html' : `/${parts.join('/')}${parts.length ? '/' : ''}`;
      const document = parse(await readFile(new URL(entry.name, directory), 'utf8'));
      const noindex = elements(document, 'meta').some(node => attr(node, 'name') === 'robots' && /\bnoindex\b/.test(attr(node, 'content') ?? ''));
      assert.equal(noindex, !isIndexablePath(path), `Indexing policy mismatch: ${path}`);
      if (isIndexablePath(path)) {
        assert(listed.has(new URL(path, site).href), `Missing from sitemap: ${path}`);
        const canonical = elements(document, 'link').filter(node => attr(node, 'rel') === 'canonical');
        assert.equal(canonical.length, 1, `Canonical count: ${path}`);
        assert.equal(attr(canonical[0], 'href'), new URL(path, site).href, `Canonical mismatch: ${path}`);
      }
      if (/^\/(?:articles|news)\/(?:tags\/.*)?$/.test(path)) {
        assert.equal(elements(document, 'h1').length, 1, `Missing page heading: ${path}`);
      }
      if (/^\/news\/newsletter-[a-z0-9-]+\/$/.test(path)) {
        const slug = path.split('/').filter(Boolean).at(-1);
        const source = await readFile(new URL(`../src/content/news/${slug}.md`, import.meta.url), 'utf8');
        const field = name => JSON.parse(source.match(new RegExp(`^${name}: (.*)$`, 'm'))[1]);
        const meta = name => elements(document, 'meta').find(node => attr(node, 'property') === name || attr(node, 'name') === name);
        assert.equal(attr(meta('description'), 'content'), field('excerpt'), `Edition description: ${path}`);
        assert.equal(attr(meta('og:image'), 'content'), new URL(field('ogImage'), site).href, `Edition image: ${path}`);
      }
      if (/^\/(?:articles|news)\/$/.test(path)) {
        const articleLinks = elements(document, 'a').map(node => attr(node, 'href')).filter(href => href?.startsWith(path) && !href.includes('/tags/'));
        assert(articleLinks.length > 0, `No crawlable article links: ${path}`);
        for (const href of articleLinks) assert(href.endsWith('/'), `Redirecting article link: ${href}`);
      }
      pages++;
    }
  }
}
await check(new URL('../dist/', import.meta.url));
console.log(`SEO verified: ${pages} HTML pages, ${urls.length} canonical sitemap URLs.`);
