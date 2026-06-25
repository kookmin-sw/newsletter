// 뉴스레터 머리말(썸네일) SVG 생성기
// 카드 이미지 비율(3:2)에 정확히 맞고, 좌상단에 실제 로고를 data URI로 임베드한다.
// 사용법:
//   node scripts/gen-masthead.mjs <vol> <dateLabel> <subtitle> <outBase>
//   예) node scripts/gen-masthead.mjs 001 2026.04 "KMUCS 1호 뉴스레터" newsletter-001
//   → public/images/news/<outBase>-cover.svg 생성
//   → src/components/organisms/NewsletterBuilder/mastheadLogo.ts 갱신(빌더가 같은 로고 사용)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const vol = process.argv[2] ?? '001';
const dateLabel = process.argv[3] ?? '2026.04';
const subtitle = process.argv[4] ?? 'KMUCS 1호 뉴스레터';
const outBase = process.argv[5] ?? 'newsletter-001';

const logoB64 = readFileSync(resolve(root, 'public/images/newsletter-logo-sm.png')).toString('base64');
const logo = `data:image/png;base64,${logoB64}`;

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 400" font-family="'Helvetica Neue', 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif">
  <rect width="600" height="400" fill="#050505"/>
  <image x="36" y="40" width="200" height="24" preserveAspectRatio="xMinYMid meet" xlink:href="${logo}"/>
  <rect x="372" y="40" width="82" height="30" rx="15" fill="none" stroke="#9aa0a6"/>
  <text x="413" y="60" fill="#c4c8cc" font-size="14" text-anchor="middle">${esc(dateLabel)}</text>
  <rect x="464" y="40" width="90" height="30" rx="15" fill="#0056b3"/>
  <text x="509" y="60" fill="#ffffff" font-size="14" font-weight="600" text-anchor="middle">Vol. ${esc(vol)}</text>
  <line x1="36" y1="150" x2="564" y2="150" stroke="#ffffff" stroke-width="1"/>
  <text x="300" y="236" fill="#ffffff" font-size="68" font-weight="900" letter-spacing="2" text-anchor="middle">NEWS LETTER</text>
  <line x1="36" y1="266" x2="564" y2="266" stroke="#ffffff" stroke-width="1"/>
  <text x="36" y="312" fill="#ffffff" font-size="23" font-weight="700">${esc(subtitle)}</text>
</svg>
`;

const outSvg = resolve(root, `public/images/news/${outBase}-cover.svg`);
writeFileSync(outSvg, svg);

const tsConst = `// 자동 생성 (scripts/gen-masthead.mjs) — 직접 수정하지 마세요.\nexport const MASTHEAD_LOGO =\n  ${JSON.stringify(logo)};\n`;
const outTs = resolve(root, 'src/components/organisms/NewsletterBuilder/mastheadLogo.ts');
writeFileSync(outTs, tsConst);

console.log(`머리말 생성: ${outBase}-cover.svg  (${(svg.length / 1024).toFixed(1)}KB)`);
console.log(`로고 상수 갱신: mastheadLogo.ts`);
