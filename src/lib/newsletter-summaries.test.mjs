import test from 'node:test';
import assert from 'node:assert/strict';
import { newsletterSummaries } from './newsletter-summaries.mjs';

const site = 'https://alumni.cs.kookmin.ac.kr';

test('요약이 없거나 빈 문단만 있는 기사는 요약 목록에 포함하지 않는다', () => {
  const result = newsletterSummaries(`
    <a href="/articles/title-only"><h2>제목만 있는 기사</h2></a>
    <a href="/articles/image-only"><img src="/images/example.png"></a>
    <a href="/articles/empty"><p> &nbsp; <br><br> </p></a>
    <a href="/articles/with-summary"><p>실제 요약.</p></a>`, site);
  assert.deepEqual(Object.keys(result), ['with-summary']);
});

test('뉴스레터 기사 링크의 요약만 읽고 문단·엔티티·원문을 보존한다', () => {
  const result = newsletterSummaries(`<p>머리말 제외</p><a href="/articles/example/"><h2>제목 제외</h2>
    <p>첫 <strong>문단</strong> &amp; &#x41;.<br><br>두 번째<br>문단.<script>악성 코드</script></p>
    <p>세 번째 문단.</p></a><a href="https://other.example/articles/foreign"><p>외부 링크 제외</p></a>`, site);
  assert.deepEqual({ ...result }, { example: ['첫 문단 & A.', '두 번째 문단.', '세 번째 문단.'] });
  assert.deepEqual(newsletterSummaries(`<a href="${site}/articles/example?from=mail"><p>요약</p></a>`, site).example, ['요약']);
  assert.throws(() => newsletterSummaries('<a href="/articles/example"><p>하나</p></a><a href="/articles/example"><p>둘</p></a>', site), /중복/);
});

test('긴 요약을 축약 없이 읽고 수정한 원문을 반영한다', () => {
  const paragraphs = ['첫 번째 문단의 원문입니다. '.repeat(12).trim(), '두 번째 문단입니다. '.repeat(15).trim(), '마지막 문단입니다. '.repeat(15).trim()];
  const html = `<a href="/articles/example"><p>${paragraphs.join('<br><br>')}</p></a>`;
  const summaries = newsletterSummaries(html, site);
  assert.ok(paragraphs.join('').length > 480);
  assert.deepEqual(summaries.example, paragraphs);
  const edited = newsletterSummaries(html.replace('첫 번째', '수정한 첫 번째'), site);
  assert.equal(edited.example[0], paragraphs[0].replace('첫 번째', '수정한 첫 번째'));
  assert.deepEqual(edited.example.slice(1), paragraphs.slice(1));
});
