import test from 'node:test';
import assert from 'node:assert/strict';
import { signageUrl } from './analytics-links.mjs';
test('signage QR keeps the article destination and identifies the issue', () => {
  const url = new URL(signageUrl('https://example.org/articles/2026-test/', 'newsletter-003'));
  assert.equal(url.pathname, '/articles/2026-test/');
  assert.equal(url.searchParams.get('utm_source'), 'campus_display');
  assert.equal(url.searchParams.get('utm_medium'), 'qr');
  assert.equal(url.searchParams.get('utm_campaign'), 'newsletter-003');
  assert.equal(new URL(signageUrl('https://example.org/')).searchParams.has('utm_campaign'), false);
});
