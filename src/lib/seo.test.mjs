import test from 'node:test';
import assert from 'node:assert/strict';
import { isIndexablePath, pagePath } from './seo.mjs';

test('index articles, editions and navigation, exclude filters and utilities', () => {
  for (const path of ['/', '/about/', '/articles/', '/articles/2026-icar-interview/', '/news/newsletter-003/']) {
    assert.equal(isIndexablePath(path), true, path);
  }
  for (const path of ['/articles/tags/AI/', '/news/tags/Vol.003/', '/tools', '/tools/newsletter/', '/signage/', '/signage/manifest.json', '/404.html']) {
    assert.equal(isIndexablePath(path), false, path);
  }
  assert.equal(isIndexablePath('/articles/tools-for-learning/'), true);
});

test('page links match GitHub Pages directory URLs, keeping assets and fragments', () => {
  for (const [input, expected] of [
    ['/', '/'], ['/articles', '/articles/'], ['/articles/', '/articles/'],
    ['/articles/tags/Vol.003', '/articles/tags/Vol.003/'],
    ['/articles/2026-icar-interview#team', '/articles/2026-icar-interview/#team'],
    ['/news?year=2026', '/news/?year=2026'], ['#main-content', '#main-content'],
    ['/images/logo.svg', '/images/logo.svg'], ['/sitemap-index.xml', '/sitemap-index.xml'],
  ]) assert.equal(pagePath(input), expected, input);
});
