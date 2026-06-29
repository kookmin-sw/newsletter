import { useState, useRef, useLayoutEffect, type CSSProperties } from 'react';
import { toPng } from 'html-to-image';

/** 디스플레이(사이니지) 뷰 생성기 — 항상 FHD 세로(1080×1920) 이미지로 출력
 *  - 헤더(마스트헤드)·푸터 고정, 가운데 기사 영역만 채움(넘치면 자동 축소)
 *  - 뉴스 기사 import · 블랙/화이트 테마 · 이미지 일괄 다운로드
 */

interface DisplayItem {
  category: string;
  author: string;
  title: string;
  summary: string;
  tags: string[];
}

interface ArticleRef {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  tags: string[];
}

interface DisplayToolProps {
  footerQr: string;
  articles?: ArticleRef[];
  logo?: string;
}

const FW = 1080; // FHD 세로 폭
const FH = 1920; // FHD 세로 높이
const MID_PAD_Y = 30; // 기사 영역 상/하 패딩
const BLUE = '#1A5BC4';

type ThemeName = 'dark' | 'light';
interface Theme {
  bg: string; card: string; cardBorder: string; text: string; sub: string; num: string;
  line: string; badgeBg: string; badgeText: string; tagBorder: string; tagText: string;
  footUrl: string; footSub: string; datePillBorder: string; datePillText: string;
  logoFilter: string; qrBorder: string; activeBg: string;
}
const THEMES: Record<ThemeName, Theme> = {
  dark: {
    bg: '#050505', card: '#161616', cardBorder: '#262626', text: '#ffffff', sub: '#9aa0a6', num: '#4a4a4a',
    line: '#ffffff', badgeBg: '#2b2b2b', badgeText: '#e6e6e6', tagBorder: '#3a3a3a', tagText: '#8a8a8a',
    footUrl: '#4d8ff0', footSub: '#7a7a7a', datePillBorder: '#9aa0a6', datePillText: '#c4c8cc',
    logoFilter: 'none', qrBorder: 'transparent', activeBg: 'rgba(26,91,196,0.12)',
  },
  light: {
    bg: '#ffffff', card: '#f5f6f8', cardBorder: '#e3e6ea', text: '#111418', sub: '#5a6068', num: '#c7ccd2',
    line: '#111418', badgeBg: '#e9ecef', badgeText: '#333a42', tagBorder: '#cfd3d8', tagText: '#6b7178',
    footUrl: '#1A5BC4', footSub: '#888f97', datePillBorder: '#aab0b8', datePillText: '#555b62',
    logoFilter: 'invert(1)', qrBorder: '#e3e6ea', activeBg: 'rgba(26,91,196,0.07)',
  },
};

const SEED: DisplayItem[] = [
  { category: '보도자료', author: '문가은 기자', title: "현업 멘토와 학부생을 이어주는 국민대 소프트웨어융합대학의 '멘토링 시스템'", summary: '현업 전문가가 학생 프로젝트를 직접 코칭하며 실전형 SW 인재 성장을 지원', tags: ['멘토링시스템', '현업전문가', '실전형SW인재'] },
  { category: '보도자료', author: '박현빈 기자', title: '국민대 장학제도와 코호트 헬퍼 운영 확대', summary: '단순 지원을 넘어 함께 배우고 성장하는 학생 참여형 학습 환경 조성', tags: ['장학제도', '코호트헬퍼', '동료학습'] },
  { category: '보도자료', author: '류진, 윤민우 기자', title: '전공과 진로가 만나는 4일, 2026 KMUCS EXPO', summary: '글로벌 커리어 워크숍, 잡페어, AWS-Day, 캡스톤 전시회로 전공 경험 확장', tags: ['EXPO', '커리어워크샵', 'AWSDAY'] },
  { category: '보도자료', author: '김보민 기자', title: '국민대학교 소프트웨어융합대학, AWS 기반 AI 플랫폼 부트캠프 운영', summary: '생성형 AI와 멀티 에이전트 기술을 실습 중심으로 배우는 하계 집중 교육', tags: ['AWS', 'AI부트캠프', 'AI플랫폼'] },
  { category: '홍보자료', author: '윤민우 기자', title: '해외에서 배우는 연구의 시간, KMU-UCI Summer GREAT Program', summary: 'UCI 연구실에서 프로젝트를 수행하며 글로벌 연구 환경을 직접 경험', tags: ['UCI', 'GREATProgram', '해외연구'] },
  { category: '보도자료', author: '윤민우, 문가은 기자', title: '소프트웨어융합대학 역량기반 졸업요건 개편... 어떻게 달라지나', summary: '프로젝트, AI, 코딩 역량을 균형 있게 반영하는 선택형 졸업요건 체계 도입', tags: ['AI역량평가', '실전프로젝트', '졸업요건'] },
];

const cLabel: CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#495057', marginBottom: '0.25rem' };
const cInput: CSSProperties = { width: '100%', padding: '0.4rem 0.55rem', border: '1px solid #DEE2E6', borderRadius: '0.4rem', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' };

export function DisplayTool({ footerQr, articles = [], logo = '/images/newsletter-logo.png' }: DisplayToolProps) {
  const [items, setItems] = useState<DisplayItem[]>(SEED);
  const [active, setActive] = useState<number>(5);
  const [vol, setVol] = useState('003');
  const [dateLabel, setDateLabel] = useState('2026.06');
  const [subtitle, setSubtitle] = useState('KMUCS 6월호');
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [busy, setBusy] = useState('');
  const siteUrl = 'alumni.cs.kookmin.ac.kr';
  const t = THEMES[theme];

  // 헤더·푸터 고정. 가운데 기사 영역이 넘칠 때만 축소.
  const midRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef<HTMLDivElement>(null);
  const [entryScale, setEntryScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => {
      const avail = (midRef.current?.clientHeight ?? FH) - MID_PAD_Y * 2;
      const natural = entriesRef.current?.scrollHeight ?? 0;
      setEntryScale(natural > 0 && avail > 0 ? Math.min(1, avail / natural) : 1);
    };
    measure();
    const raf = requestAnimationFrame(measure); // 레이아웃 안정 후 재측정
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(measure); // 폰트 로드 후
    return () => cancelAnimationFrame(raf);
  }, [items, theme, active, vol, dateLabel, subtitle]);

  // 기사 수가 많아지면 카드 위아래 여백·간격을 유동적으로 축소
  const n = items.length;
  const gap = n >= 9 ? 9 : n >= 7 ? 11 : n >= 6 ? 14 : n >= 5 ? 16 : 18;
  const padY = n >= 9 ? 11 : n >= 8 ? 13 : n >= 7 ? 16 : n >= 6 ? 20 : n >= 5 ? 24 : n >= 4 ? 28 : 32;

  const upd = (i: number, patch: Partial<DisplayItem>) =>
    setItems((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addItem = () => setItems((s) => [...s, { category: '보도자료', author: '', title: '', summary: '', tags: [] }]);
  const removeItem = (i: number) => setItems((s) => s.filter((_, idx) => idx !== i));
  const importArticle = (i: number, id: string) => {
    const a = articles.find((x) => x.id === id);
    if (!a) return;
    upd(i, { title: a.title, summary: a.excerpt, author: a.author, tags: a.tags });
  };

  const dl = (dataUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = name; a.click();
  };
  const capture = () =>
    toPng(document.getElementById('display-export') as HTMLElement, {
      width: FW, height: FH, canvasWidth: FW, canvasHeight: FH, pixelRatio: 1, cacheBust: true, backgroundColor: t.bg,
    });
  const exportCurrent = async () => {
    setBusy('current');
    try { dl(await capture(), `KMUCS-${vol}-list-${active >= 0 ? String(active + 1).padStart(2, '0') : 'none'}.png`); }
    finally { setBusy(''); }
  };
  const exportAll = async () => {
    setBusy('all');
    const prev = active;
    try {
      for (let i = 0; i < items.length; i++) {
        setActive(i);
        await new Promise((r) => setTimeout(r, 240)); // 리렌더 대기
        dl(await capture(), `KMUCS-${vol}-list-${String(i + 1).padStart(2, '0')}.png`);
      }
    } finally { setActive(prev); setBusy(''); }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
      {/* ── 컨트롤 ── */}
      <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 460 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>디스플레이 리스트</h1>
        <p style={{ fontSize: '0.85rem', color: '#868E96', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
          항상 <b>FHD 세로(1080×1920)</b> PNG로 출력됩니다. 헤더·푸터 고정, 기사는 넘치면 자동 축소.
        </p>

        {/* 테마 + 다운로드 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" onClick={() => setTheme('dark')} style={pill(theme === 'dark')}>● 블랙</button>
          <button type="button" onClick={() => setTheme('light')} style={pill(theme === 'light')}>○ 화이트</button>
          <span style={{ flex: 1 }} />
          <button type="button" disabled={!!busy} onClick={exportCurrent} style={btn(false, !!busy)}>{busy === 'current' ? '저장 중…' : '현재 PNG'}</button>
          <button type="button" disabled={!!busy} onClick={exportAll} style={btn(true, !!busy)}>{busy === 'all' ? '저장 중…' : `전체 ${items.length}개 다운로드`}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
          <div><label style={cLabel}>호수 (Vol.)</label><input style={cInput} value={vol} onChange={(e) => setVol(e.target.value)} /></div>
          <div><label style={cLabel}>발행 라벨</label><input style={cInput} value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} /></div>
          <div><label style={cLabel}>부제</label><input style={cInput} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={cLabel}>활성 기사 (파란색 강조)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            <button type="button" onClick={() => setActive(-1)} style={pill(active === -1)}>없음</button>
            {items.map((_, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} style={pill(active === i)}>{String(i + 1).padStart(2, '0')}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((it, i) => (
            <div key={i} style={{ border: '1px solid #E9ECEF', borderRadius: '0.6rem', padding: '0.75rem', background: '#F8F9FA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: BLUE }}>{String(i + 1).padStart(2, '0')}</span>
                <button type="button" onClick={() => removeItem(i)} style={{ border: 'none', background: 'none', color: '#c0392b', fontSize: '0.8rem', cursor: 'pointer' }}>삭제</button>
              </div>
              {articles.length > 0 && (
                <select defaultValue="" onChange={(e) => { importArticle(i, e.target.value); e.target.value = ''; }} style={{ ...cInput, marginBottom: '0.5rem' }}>
                  <option value="" disabled>— 뉴스 기사에서 불러오기 —</option>
                  {articles.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div><label style={cLabel}>분류</label><input style={cInput} value={it.category} onChange={(e) => upd(i, { category: e.target.value })} /></div>
                <div><label style={cLabel}>기자</label><input style={cInput} value={it.author} onChange={(e) => upd(i, { author: e.target.value })} /></div>
              </div>
              <label style={cLabel}>제목</label>
              <input style={{ ...cInput, marginBottom: '0.5rem' }} value={it.title} onChange={(e) => upd(i, { title: e.target.value })} />
              <label style={cLabel}>요약 (줄바꿈 가능)</label>
              <textarea rows={2} style={{ ...cInput, marginBottom: '0.5rem', resize: 'vertical', lineHeight: 1.4 }} value={it.summary} onChange={(e) => upd(i, { summary: e.target.value })} />
              <label style={cLabel}>태그 (쉼표)</label>
              <input style={cInput} value={it.tags.join(', ')} onChange={(e) => upd(i, { tags: e.target.value.split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean) })} />
            </div>
          ))}
          <button type="button" onClick={addItem} style={{ ...btn(false, false), justifyContent: 'center' }}>+ 기사 추가</button>
        </div>
      </div>

      {/* ── FHD 세로 캔버스 (1080×1920 고정, 헤더·푸터 고정) ── */}
      <div style={{ flex: '0 0 auto', overflow: 'auto', maxWidth: '100%' }}>
        <div style={{ fontSize: '0.78rem', color: '#868E96', marginBottom: '0.5rem' }}>미리보기 · <b>1080 × 1920 (FHD 세로)</b> · id=<code>display-export</code></div>
        <div id="display-export" style={{ width: FW, height: FH, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: t.bg, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
          {/* 헤더 (고정) */}
          <div style={{ flex: '0 0 auto', padding: '44px 48px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <img src={logo} alt="국민대학교 소프트웨어융합대학 SW중심대학사업단" style={{ height: 40, width: 'auto', display: 'block', filter: t.logoFilter }} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ border: `1px solid ${t.datePillBorder}`, color: t.datePillText, fontSize: 20, padding: '7px 17px', borderRadius: 22 }}>{dateLabel}</span>
                <span style={{ background: '#0056b3', color: '#fff', fontSize: 20, fontWeight: 600, padding: '8px 17px', borderRadius: 22 }}>Vol. {vol}</span>
              </div>
            </div>
            <div style={{ height: 1, background: t.line, opacity: 0.85 }} />
            <div style={{ textAlign: 'center', padding: '28px 0 6px' }}>
              <div style={{ borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, padding: '14px 0' }}>
                <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: 2, color: t.text, lineHeight: 1.05 }}>NEWS LETTER</div>
              </div>
              <div style={{ fontSize: 23, color: t.sub, marginTop: 14 }}>{subtitle}</div>
            </div>
          </div>

          {/* 기사 (가운데 영역, 세로 중앙, 넘치면 축소) */}
          <div ref={midRef} style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', padding: `${MID_PAD_Y}px 48px`, display: 'flex', flexDirection: 'column' }}>
            <div ref={entriesRef} style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', gap, transform: `scale(${entryScale})`, transformOrigin: 'top center' }}>
              {items.map((it, i) => {
                const on = active === i;
                return (
                  <div key={i} style={{
                    position: 'relative', background: on ? t.activeBg : t.card,
                    border: on ? `2px solid ${BLUE}` : `1px solid ${t.cardBorder}`, borderRadius: 16, padding: `${padY}px 34px`,
                    flex: '1 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12,
                  }}>
                    {/* 위: 번호·분류·기자 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 29, fontWeight: 800, color: t.num }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{ background: t.badgeBg, color: t.badgeText, fontSize: 16, padding: '5px 12px', borderRadius: 7 }}>{it.category}</span>
                      <span style={{ color: t.sub, fontSize: 16 }}>{it.author}</span>
                    </div>
                    {/* 가운데: 제목·요약 */}
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: t.text, lineHeight: 1.34, marginBottom: 10, paddingRight: on ? 36 : 0 }}>{it.title}</div>
                      <div style={{ fontSize: 17, color: t.sub, lineHeight: 1.45, whiteSpace: 'pre-line' }}>{it.summary}</div>
                    </div>
                    {/* 아래: 태그 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {it.tags.map((tag) => (
                        <span key={tag} style={{ border: `1px solid ${on ? 'rgba(26,91,196,0.6)' : t.tagBorder}`, color: on ? (theme === 'dark' ? '#9db8e8' : BLUE) : t.tagText, fontSize: 14, padding: '4px 11px', borderRadius: 7 }}>#{tag}</span>
                      ))}
                    </div>
                    {on && <div style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)', color: BLUE, fontSize: 30 }}>▶</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 푸터 (고정) */}
          <div style={{ flex: '0 0 auto', padding: '0 48px 40px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={footerQr} alt="QR" style={{ width: 62, height: 62, borderRadius: 8, background: '#fff', padding: 4, boxSizing: 'border-box', border: `1px solid ${t.qrBorder}` }} />
            <div>
              <div style={{ color: t.footUrl, fontWeight: 700, fontSize: 19 }}>{siteUrl}</div>
              <div style={{ color: t.footSub, fontSize: 15, marginTop: 3 }}>국민대학교 소프트웨어융합대학 · SW중심대학사업단</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pill(on: boolean): CSSProperties {
  return {
    padding: '0.4rem 0.7rem', border: `1px solid ${on ? BLUE : '#DEE2E6'}`, borderRadius: '0.4rem',
    background: on ? BLUE : '#fff', color: on ? '#fff' : '#495057', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
  };
}
function btn(primary: boolean, disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.8rem', borderRadius: '0.4rem',
    border: primary ? 'none' : `1px solid ${BLUE}`, background: primary ? BLUE : '#fff', color: primary ? '#fff' : BLUE,
    fontSize: '0.85rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
  };
}
