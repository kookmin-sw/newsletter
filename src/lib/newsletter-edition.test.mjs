import test from 'node:test';
import assert from 'node:assert/strict';
import { newsletterSlug } from './newsletter-edition.mjs';
import { issueLabel } from '@kmucs/signage-player';

test('숫자 호수의 기존 주소와 표시를 유지한다', () => {
  assert.equal(newsletterSlug('003', '2026.06'), 'newsletter-003');
  assert.equal(issueLabel('003'), 'Vol. 003');
});

test('월호는 연도별 고유 주소와 Vol. 없는 표시를 사용한다', () => {
  assert.equal(newsletterSlug('9월호', '2026.09'), 'newsletter-2026-09');
  assert.equal(newsletterSlug('9월호', '2027.9'), 'newsletter-2027-09');
  assert.equal(newsletterSlug('12월호', '2026.12'), 'newsletter-2026-12');
  assert.equal(issueLabel('9월호'), '9월호');
  for (const [issue, date] of [['13월호', '2026.13'], ['9월호', '2026.08'], ['9월호', ''], ['', '2026.09'], ['../004', '2026.09'], ['$(id)', '2026.09']]) {
    assert.throws(() => newsletterSlug(issue, date));
  }
});
