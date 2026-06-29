import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { MASTHEAD_LOGO } from './mastheadLogo';

interface ArticleRef {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  tags: string[];
  author: string;
}

interface Section {
  id: number;
  category: string;
  author: string;
  title: string;
  desc: string;
  href: string;
  image: string;
  tags: string[];
}

interface SeedSection {
  category?: string;
  author?: string;
  title?: string;
  desc?: string;
  href?: string;
  image?: string;
  tags?: string[];
}

interface NewsletterBuilderProps {
  articles?: ArticleRef[];
  initialSections?: SeedSection[];
}

const DEFAULT_LOGO = '/images/newsletter-logo.png';
const DEFAULT_BASE = 'https://alumni.cs.kookmin.ac.kr';
const W = 800;

const C = { blue: '#1A5BC4', ink: '#212529', sub: '#495057', muted: '#868E96', line: '#E9ECEF', surface: '#F8F9FA' };
const label: CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: C.sub, marginBottom: '0.3rem' };
const input: CSSProperties = {
  width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #DEE2E6', borderRadius: '0.5rem',
  fontSize: '0.9rem', fontFamily: 'inherit', color: C.ink, background: '#fff', boxSizing: 'border-box',
};

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Meta { vol: string; dateLabel: string; subtitle: string; baseUrl: string; logo: string; publishedAt: string; }

/** 최종 발송본과 동일한 다크 테이블형 이메일 HTML (800px) */
function buildEmailHtml(meta: Meta, sections: Section[]): string {
  const base = (meta.baseUrl || '').replace(/\/$/, '');
  const abs = (u: string) => (!u ? '' : /^https?:/.test(u) ? u : base + (u.startsWith('/') ? u : '/' + u));

  const sectionBlocks = sections.map((s) => {
    const img = abs(s.image);
    const imgHtml = img
      ? `<img src="${esc(img)}" alt="${esc(s.title)}" width="100%" height="380" style="display: block; width: 100%; height: 380px; background-color: #333; object-fit: cover;" />`
      : '';
    const author = s.author
      ? `<span style="background-color: #333; color: #fff; font-size: 14px; padding: 4px 10px; border-radius: 4px; display: inline-block;">${esc(s.author)}</span>`
      : '';
    const desc = s.desc
      ? `<p style="margin: 0 0 25px 0; font-size: 16px; color: #aaaaaa; line-height: 1.6;">${esc(s.desc).replace(/\n/g, '<br>')}</p>`
      : '';
    const tags = (s.tags || [])
      .map((t) => `<span style="display: inline-block; white-space: nowrap; border: 1px solid #555; color: #aaa; font-size: 14px; padding: 5px 10px; border-radius: 4px; margin-right: 6px; margin-bottom: 6px;">#${esc(t)}</span>`)
      .join('');
    const button = s.href
      ? `<span style="display: inline-block; border: 1px solid #fff; color: #fff; padding: 8px 16px; font-size: 15px; border-radius: 4px;">관련기사 보기</span>`
      : '';
    const inner = `${imgHtml}
            <div style="padding: 25px;">
              <div style="margin-bottom: 12px;">
                <span style="background-color: #0056b3; color: #fff; font-size: 14px; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-right: 6px;">${esc(s.category || '보도자료')}</span>
                ${author}
              </div>
              <h2 style="margin: 0 0 15px 0; font-size: 24px; line-height: 1.4; color: #ffffff;">${esc(s.title)}</h2>
              ${desc}
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" valign="top">${tags}</td>
                  <td align="right" valign="top" style="white-space: nowrap; padding-left: 12px;">${button}</td>
                </tr>
              </table>
            </div>`;
    const body = s.href
      ? `<a href="${esc(abs(s.href))}" style="display: block; text-decoration: none; color: inherit;">${inner}</a>`
      : inner;
    return `        <tr>
          <td style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden; padding-bottom: 25px;">
            ${body}
          </td>
        </tr>`;
  });

  const logo = meta.logo
    ? `<img src="${esc(abs(meta.logo))}" alt="국민대학교 SW중심대학" height="30" style="display: block; height: 30px; width: auto; border: 0;" />`
    : `<span style="font-size:18px;font-weight:bold;">국민대학교</span>`;

  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#050505">
  <tr>
    <td align="center" style="padding: 20px 10px;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 800px; width: 100%; margin: 0 auto;">
        <tr>
          <td style="padding-bottom: 20px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" valign="middle">${logo}</td>
                <td align="right" valign="middle">
                  <span style="font-size: 15px; color: #aaa; border: 1px solid #aaa; padding: 5px 12px; border-radius: 15px; margin-right: 5px;">${esc(meta.dateLabel)}</span>
                  <span style="font-size: 15px; color: #fff; background-color: #0056b3; padding: 5px 12px; border-radius: 15px;">Vol. ${esc(meta.vol)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 25px; text-align: center;">
            <div style="border-top: 1px solid #ffffff; border-bottom: 1px solid #ffffff; padding: 10px 0; margin-bottom: 10px;">
              <h1 style="margin: 0; font-size: 42px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">NEWS LETTER</h1>
            </div>
            <p style="margin: 0; font-size: 16px; color: #ffffff;">${esc(meta.subtitle)}</p>
          </td>
        </tr>
        <tr><td height="25"></td></tr>
${sectionBlocks.join('\n        <tr><td height="25"></td></tr>\n')}
        <tr><td height="50"></td></tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** mac/linux 터미널에 붙여넣으면: 머리말 SVG + 뉴스 글(.md) 생성 후 커밋 → /news 에 바로 노출 */
function buildCommitCommand(meta: Meta, sections: Section[]): string {
  const vol = meta.vol || '000';
  const slug = `newsletter-${vol}`;
  const svg = buildMastheadSvg(meta);
  const bodyHtml = buildEmailHtml({ ...meta, baseUrl: '' }, sections); // 사이트 내 렌더용 상대경로
  const yamlStr = (s: string) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const title = meta.subtitle || `KMUCS ${vol}호 뉴스레터`;
  const cardSubtitle = `${meta.dateLabel} · Vol. ${vol}`;
  const lead = (sections.find((s) => s.desc)?.desc ?? '').replace(/\s+/g, ' ').trim();
  const excerpt = lead ? lead.slice(0, 140) : title;
  const dm = (meta.dateLabel || '').match(/^(\d{4})\.(\d{1,2})/);
  const publishedAt = meta.publishedAt || (dm ? `${dm[1]}-${dm[2].padStart(2, '0')}-01` : new Date().toISOString().slice(0, 10));
  const frontmatter = [
    '---',
    `title: ${yamlStr(title)}`,
    `subtitle: ${yamlStr(cardSubtitle)}`,
    `excerpt: ${yamlStr(excerpt)}`,
    `publishedAt: "${publishedAt}"`,
    `author: "SW중심대학 기자단 '새움'"`,
    `coverImage: "/images/news/${slug}-cover.svg"`,
    `tags: ["뉴스레터", "Vol.${vol}"]`,
    'format: "html"',
    '---',
  ].join('\n');
  const md = `${frontmatter}\n\n${bodyHtml}\n`;
  return [
    'mkdir -p src/content/news public/images/news',
    `cat > public/images/news/${slug}-cover.svg <<'KMUCS_SVG_EOF'`,
    svg,
    'KMUCS_SVG_EOF',
    `cat > src/content/news/${slug}.md <<'KMUCS_MD_EOF'`,
    md,
    'KMUCS_MD_EOF',
    `git add public/images/news/${slug}-cover.svg src/content/news/${slug}.md && git commit -m "News: ${slug} (Vol.${vol})"`,
  ].join('\n');
}

/** 뉴스 목록 썸네일용 머리말 SVG (카드 이미지 비율 3:2 · 잘림 없음)
 *  scripts/gen-masthead.mjs 와 동일한 결과물을 생성한다(좌상단 실제 로고 임베드). */
function buildMastheadSvg(meta: Meta): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 400" font-family="'Helvetica Neue', 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif">
  <rect width="600" height="400" fill="#050505"/>
  <image x="36" y="40" width="200" height="24" preserveAspectRatio="xMinYMid meet" xlink:href="${MASTHEAD_LOGO}"/>
  <rect x="372" y="40" width="82" height="30" rx="15" fill="none" stroke="#9aa0a6"/>
  <text x="413" y="60" fill="#c4c8cc" font-size="14" text-anchor="middle">${esc(meta.dateLabel)}</text>
  <rect x="464" y="40" width="90" height="30" rx="15" fill="#0056b3"/>
  <text x="509" y="60" fill="#ffffff" font-size="14" font-weight="600" text-anchor="middle">Vol. ${esc(meta.vol)}</text>
  <line x1="36" y1="150" x2="564" y2="150" stroke="#ffffff" stroke-width="1"/>
  <text x="300" y="236" fill="#ffffff" font-size="68" font-weight="900" letter-spacing="2" text-anchor="middle">NEWS LETTER</text>
  <line x1="36" y1="266" x2="564" y2="266" stroke="#ffffff" stroke-width="1"/>
  <text x="36" y="312" fill="#ffffff" font-size="23" font-weight="700">${esc(meta.subtitle)}</text>
</svg>`;
}

export function NewsletterBuilder({ articles = [], initialSections = [] }: NewsletterBuilderProps) {
  const idRef = useRef(0);
  const seed: Section[] = (initialSections.length ? initialSections : [{}]).map((s) => ({
    id: (idRef.current += 1),
    category: s.category ?? '보도자료',
    author: s.author ?? '',
    title: s.title ?? '',
    desc: s.desc ?? '',
    href: s.href ?? '',
    image: s.image ?? '',
    tags: s.tags ?? [],
  }));

  const [vol, setVol] = useState('001');
  const [dateLabel, setDateLabel] = useState('2026.04');
  const [publishedAt, setPublishedAt] = useState('2026-04-01');
  const [subtitle, setSubtitle] = useState('KMUCS 1호 뉴스레터');
  const [logo, setLogo] = useState(DEFAULT_LOGO);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE);
  const [sections, setSections] = useState<Section[]>(seed);
  const [copied, setCopied] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [emailH, setEmailH] = useState(900);

  const meta: Meta = { vol, dateLabel, subtitle, baseUrl, logo, publishedAt };
  const html = buildEmailHtml(meta, sections); // 발송·내보내기용 (절대경로)
  const command = buildCommitCommand(meta, sections);
  // 미리보기용: 상대경로로 만들어 iframe(로컬 dev 서버)에서 이미지·로고를 바로 로드, 페이지 CSS와 격리
  const previewDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background-color:#050505">${buildEmailHtml({ ...meta, baseUrl: '' }, sections)}</body></html>`;

  useEffect(() => {
    const measure = () => setPreviewScale(Math.min(1, (previewRef.current?.clientWidth ?? W) / W));
    measure();
    const ro = new ResizeObserver(measure);
    if (previewRef.current) ro.observe(previewRef.current);
    return () => { ro.disconnect(); roRef.current?.disconnect(); };
  }, []);

  const onPreviewLoad = () => {
    const ifr = iframeRef.current;
    const d = ifr?.contentDocument;
    const w = ifr?.contentWindow;
    if (!d || !w) return;
    const measure = () => {
      const h = Math.max(d.documentElement?.scrollHeight || 0, d.body?.scrollHeight || 0);
      if (h) setEmailH(h);
    };
    measure();
    // 이미지가 늦게 로드되면 본문 높이가 늘어나므로 로드 후 재측정 (초기 데이터 잘림 방지)
    Array.from(d.images || []).forEach((img) => {
      if (!img.complete) img.addEventListener('load', measure, { once: true });
    });
    roRef.current?.disconnect();
    const RO = w.ResizeObserver || window.ResizeObserver;
    if (RO && d.body) {
      const ro = new RO(measure);
      ro.observe(d.body);
      roRef.current = ro;
    }
  };

  // 초기 마운트/내용 변경 시 직접 측정 (iframe onLoad가 하이드레이션 전에 발생해 놓치는 경우 대비)
  useEffect(() => {
    const id = window.setTimeout(onPreviewLoad, 80);
    return () => window.clearTimeout(id);
  }, [previewDoc]);

  const addSection = () => {
    idRef.current += 1;
    setSections((s) => [...s, { id: idRef.current, category: '보도자료', author: '', title: '', desc: '', href: '', image: '', tags: [] }]);
  };
  const update = (id: number, patch: Partial<Section>) => setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: number) => setSections((s) => s.filter((x) => x.id !== id));
  const move = (id: number, dir: -1 | 1) =>
    setSections((s) => {
      const i = s.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const pickArticle = (id: number, articleId: string) => {
    const a = articles.find((x) => x.id === articleId);
    if (!a) return;
    update(id, { title: a.title, desc: a.excerpt, href: `/articles/${a.id}`, image: a.image, author: a.author, tags: a.tags });
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 360px', minWidth: 0 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: C.ink, margin: '0 0 0.25rem' }}>뉴스레터 만들기</h1>
        <p style={{ fontSize: '0.9rem', color: C.muted, margin: '0 0 1.5rem' }}>
          내용을 입력하면 오른쪽에 실제 발송용 이메일(HTML)로 미리보기됩니다. 아래에서 HTML을 복사하거나 커밋 커맨드로 저장소에 올릴 수 있습니다.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div><label style={label}>호수 (Vol.)</label><input style={input} value={vol} onChange={(e) => setVol(e.target.value)} /></div>
          <div><label style={label}>발행 라벨 (마스트헤드)</label><input style={input} value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} /></div>
          <div><label style={label}>발행일자 (정렬·표시)</label><input type="date" style={input} value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: '0.75rem' }}><label style={label}>부제 (마스트헤드 아래)</label><input style={input} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
        <div style={{ marginTop: '0.75rem' }}><label style={label}>로고 URL (좌상단 · 비우면 텍스트)</label><input style={input} value={logo} onChange={(e) => setLogo(e.target.value)} /></div>
        <div style={{ marginTop: '0.75rem' }}><label style={label}>사이트 주소 (이미지·링크 절대경로)</label><input style={input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1.5rem 0 0.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: C.ink, margin: 0 }}>섹션</h2>
          <button type="button" onClick={addSection} style={btn(true)}>+ 섹션 추가</button>
        </div>

        {sections.map((s, i) => (
          <div key={s.id} style={{ border: `1px solid ${C.line}`, borderRadius: '0.75rem', padding: '0.9rem', marginBottom: '0.75rem', background: C.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.muted }}>#{i + 1}</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button type="button" onClick={() => move(s.id, -1)} disabled={i === 0} style={miniBtn} aria-label="위로">↑</button>
                <button type="button" onClick={() => move(s.id, 1)} disabled={i === sections.length - 1} style={miniBtn} aria-label="아래로">↓</button>
                <button type="button" onClick={() => remove(s.id)} style={{ ...miniBtn, color: '#C92A2A' }} aria-label="삭제">✕</button>
              </div>
            </div>
            {articles.length > 0 && (
              <div style={{ marginBottom: '0.6rem' }}>
                <label style={label}>기존 기사에서 불러오기</label>
                <select style={input} value="" onChange={(e) => pickArticle(s.id, e.target.value)}>
                  <option value="">— 기사 선택 (제목·요약·링크·이미지·태그 자동) —</option>
                  {articles.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div><label style={label}>분류 배지</label><input style={input} value={s.category} onChange={(e) => update(s.id, { category: e.target.value })} /></div>
              <div><label style={label}>기자/작성자</label><input style={input} value={s.author} onChange={(e) => update(s.id, { author: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: '0.5rem' }}><label style={label}>제목</label><input style={input} value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} /></div>
            <div style={{ marginTop: '0.5rem' }}><label style={label}>설명 (빈 줄로 문단 구분)</label><textarea style={{ ...input, minHeight: '5rem', resize: 'vertical' }} value={s.desc} onChange={(e) => update(s.id, { desc: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div><label style={label}>링크</label><input style={input} value={s.href} onChange={(e) => update(s.id, { href: e.target.value })} placeholder="/articles/..." /></div>
              <div><label style={label}>이미지</label><input style={input} value={s.image} onChange={(e) => update(s.id, { image: e.target.value })} placeholder="/images/..." /></div>
            </div>
            <div style={{ marginTop: '0.5rem' }}><label style={label}>태그 (쉼표로 구분)</label><input style={input} value={s.tags.join(', ')} onChange={(e) => update(s.id, { tags: e.target.value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean) })} /></div>
          </div>
        ))}

        <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" onClick={() => copy(html, 'html')} style={btn(true)}>{copied === 'html' ? '복사됨 ✓' : '이메일 HTML 복사'}</button>
          <button type="button" onClick={() => copy(command, 'cmd')} style={btn(false)}>{copied === 'cmd' ? '복사됨 ✓' : '뉴스 등록 커맨드 복사'}</button>
        </div>
        <p style={{ fontSize: '0.78rem', color: C.muted, marginTop: '0.5rem' }}>
          · <b>이메일 HTML</b>: Gmail 등에서 새 메일 작성 → 붙여넣기로 발송<br />
          · <b>뉴스 등록 커맨드</b>: 저장소 루트 터미널(mac/linux)에 붙여넣으면 머리말 이미지 + 뉴스 글이 생성·커밋되어 <code>/news</code>에 바로 노출됩니다
        </p>
      </div>

      <div style={{ flex: '1 1 520px', minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: C.muted, marginBottom: '0.5rem' }}>미리보기 (실제 발송 메일과 동일)</div>
        <div ref={previewRef} style={{ border: `1px solid ${C.line}`, borderRadius: '0.75rem', overflow: 'hidden', display: 'flex', justifyContent: 'center', background: '#050505' }}>
          <div style={{ width: W * previewScale, height: emailH * previewScale, overflow: 'hidden', flexShrink: 0 }}>
            <iframe
              ref={iframeRef}
              title="뉴스레터 미리보기"
              srcDoc={previewDoc}
              onLoad={onPreviewLoad}
              scrolling="no"
              style={{ width: W, height: emailH, border: 0, display: 'block', transformOrigin: 'top left', transform: `scale(${previewScale})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const miniBtn: CSSProperties = { width: '1.8rem', height: '1.8rem', border: '1px solid #DEE2E6', borderRadius: '0.4rem', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: C.sub, lineHeight: 1 };
function btn(filled: boolean): CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', padding: '0.5rem 0.9rem', border: `1px solid ${C.blue}`, borderRadius: '0.5rem', background: filled ? C.blue : '#fff', color: filled ? '#fff' : C.blue, fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer' };
}
