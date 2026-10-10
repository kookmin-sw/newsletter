import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { issueLabel, frameAt, listPageIndices, getSession, playbackAt, type Timeline, type DisplayArticle } from './core.js';

export type ScreenRole = 'list' | 'detail' | 'detail-secondary';
export { AssetCache, type AssetUrl } from './assets.js';
import { fontFamily, type AssetUrl } from './assets.js';
import { transitionAt, reveal, selectorAt } from './motion.js';

export function Player({ timeline, role, now, assetUrl }: {
  timeline: Timeline; role: ScreenRole; now: () => number; assetUrl: AssetUrl;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [time, setTime] = useState(now);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const element = viewport.current!;
    const observer = new ResizeObserver(() => setScale(Math.min(element.clientWidth / 1080, element.clientHeight / 1920)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let frame: number;
    const tick = () => { setTime(now()); frame = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [now]);
  const playback = playbackAt(timeline, time);
  const session = getSession(playback);
  const frame = frameAt(session, playback.epoch, time);
  const manifest = playback.manifest;
  const index = role === 'detail-secondary' ? frame.indices[1] ?? frame.indices[0] : frame.indices[0];
  const previousIndex = role === 'detail-secondary' ? frame.previousIndices[1] ?? frame.previousIndices[0] : frame.previousIndices[0];
  const article = session.items[index];
  const previous = session.items[previousIndex];
  const progress = reducedMotion || frame.first || session.items.length <= (session.detailCount ?? 1) ? 1 : frame.transition;
  const motion = transitionAt(progress);
  const pageIndices = listPageIndices(session, frame.index);
  const previousPageIndices = listPageIndices(session, frame.previousIndex);
  const page = Math.ceil(pageIndices[0] / 6);
  const previousPage = Math.ceil(previousPageIndices[0] / 6);
  const pages = Math.ceil(session.items.length / 6);
  const changedPage = previousPage !== page;
  const wrap = frame.index === 0 && session.items.length > 1;
  const fade = (amount: number, distance = 0): CSSProperties => ({
    opacity: amount, transform: `translate3d(0, ${distance * (1 - amount)}px, 0)`,
  });
  const list = (indices: number[], outgoing = false) => {
    const activeIndices = outgoing ? frame.previousIndices : frame.indices;
    const selectors = activeIndices.map((articleIndex, slot) => {
      const active = indices.indexOf(articleIndex);
      return changedPage || frame.first
        ? { position: active, opacity: 1 }
        : selectorAt(indices.indexOf(frame.previousIndices[slot] ?? frame.previousIndex), active, progress, wrap);
    });
    return <div key={`page-${indices[0]}`} className="sg-list" data-count={indices.length}
      style={{ '--sg-rows': Math.max(5, indices.length), ...(changedPage ? fade(outgoing ? motion.outgoing : motion.page, outgoing ? -12 : 20) : {}) } as CSSProperties} aria-hidden={outgoing || undefined}>
      {indices.map(articleIndex => {
        const item = session.items[articleIndex];
        const active = activeIndices.includes(articleIndex);
        const focus = changedPage ? (active ? 1 : 0)
          : (frame.indices.includes(articleIndex) ? motion.focus : 0) + (frame.previousIndices.includes(articleIndex) ? 1 - motion.focus : 0);
        return <div className={`sg-card ${active ? 'sg-active' : ''}`} key={item.id} style={{ '--sg-focus': focus } as CSSProperties}>

          <div className="sg-card-body"><div className="sg-meta"><span className="sg-number">{String(articleIndex + 1).padStart(2, '0')}</span><span className="sg-badge">{item.category}</span><span>{item.author}</span></div>
          <div><h2 data-fit="목록 제목">{item.title}</h2><p data-fit="목록 소개">{item.excerpt}</p></div>
          <Tags article={item} /></div>
        </div>;
      })}
      {selectors.map((selector, slot) => <div key={slot} className={`sg-selector ${slot === 1 ? 'sg-selector-secondary' : ''}`} aria-hidden="true" style={{ transform: `translate3d(0, calc(${selector.position} * (100% + 14px)), 0)`, opacity: selector.opacity }}><span />{session.detailCount === 2 && <b>{slot + 1}</b>}</div>)}
    </div>;
  };
  const detail = (item: DisplayArticle, index: number, outgoing = false) => {
    const text = (incoming: number, distance = 18) => fade(outgoing ? motion.outgoing : incoming, outgoing ? -10 : distance);
    const imageProgress = outgoing ? 1 : motion.image;
    return <article key={item.id} className="sg-detail" aria-hidden={outgoing || undefined}>
      <div className="sg-meta" style={text(motion.heading, 10)}><span className="sg-number">{String(index + 1).padStart(2, '0')}</span><span className="sg-badge">{item.category}</span><span>{item.author}</span></div>
      <h1 data-fit="상세 제목" style={text(motion.heading, 24)}>{item.title}</h1>
      <div className="sg-hero" style={{ opacity: imageProgress }}><div className="sg-hero-media" style={{ transform: `scale(${outgoing ? 1 + 0.015 * motion.image : 1 + 0.035 * (1 - motion.image)})` }}>
        {item.image ? <img src={assetUrl(item.image, manifest)} alt="기사 대표 이미지" /> : <div className="sg-no-image">KMUCS<br /><span>NEWS LETTER</span></div>}
      </div></div>
      <Summary paragraphs={item.summary} paragraphStyle={i => text(reveal(progress, 0.38 + i * 0.06, 0.82 + i * 0.06), 16)} />
      <div className="sg-read" style={text(motion.footer, 0)}><Tags article={item} /><img src={item.qr} alt="기사 원문 QR 코드" /></div>
    </article>;
  };
  return <div className="sg-viewport" ref={viewport}>
    <div className="sg-stage" data-session={session.id} data-article={article.id} data-articles={frame.indices.map(i => session.items[i].id).join(",")} data-role={role} data-revision={manifest.revision} style={{ transform: `translate(-50%, -50%) scale(${scale})`, fontFamily: `"${fontFamily(manifest)}", "Malgun Gothic", sans-serif` }}>
      <header className="sg-header">
        <div className="sg-masthead"><img src={assetUrl(manifest.branding.logo, manifest)} alt="국민대학교 소프트웨어융합대학 SW중심대학사업단" /><div><span>{session.dateLabel}</span><strong>{issueLabel(session.issue)}</strong></div></div>
        <div className="sg-heading">NEWS LETTER</div><p>{session.title}{session.detailCount === 2 && role !== 'list' && <span className={`sg-detail-slot ${role === 'detail-secondary' ? 'secondary' : ''}`}>상세 {role === 'detail-secondary' ? '2' : '1'}</span>}</p>
      </header>
      <main className="sg-content">
        {frame.waiting ? <div className="sg-waiting">곧 뉴스 재생이 시작됩니다.</div> : role === 'list' ? <>
          {changedPage && progress < 1 && list(previousPageIndices, true)}
          {list(pageIndices)}
        </> : <>
          {progress < 1 && previousIndex !== index && detail(previous, previousIndex, true)}
          {detail(article, index)}
        </>}
      </main>
      <footer className="sg-footer">{role === 'list' ? <><img src={manifest.branding.qr} alt="alumni 사이트 QR 코드" /><div><strong>{new URL(manifest.branding.siteUrl).hostname}</strong><p>국민대학교 소프트웨어융합대학 · SW중심대학사업단</p></div></> : <div><p>국민대학교 소프트웨어융합대학 · SW중심대학사업단</p></div>}<div className="sg-counter">{role === 'list' && pages > 1 ? `${page + 1} / ${pages} 페이지` : `${role === 'list' ? frame.indices.map(i => String(i + 1).padStart(2, '0')).join(' · ') : String(index + 1).padStart(2, '0')} / ${session.items.length}`}<small>{frame.waiting ? '시작 대기' : `${frame.remainingSeconds}초`}</small></div></footer>
      <div className="sg-progress" aria-hidden="true" style={{ transform: `scaleX(${frame.waiting ? 0 : frame.progress})` }} />
    </div>
  </div>;
}

function Tags({ article }: { article: DisplayArticle }) {
  return <div className="sg-tags">{article.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>;
}

function Summary({ paragraphs, paragraphStyle }: { paragraphs: string[]; paragraphStyle: (index: number) => CSSProperties }) {
  const element = useRef<HTMLDivElement>(null);
  const length = paragraphs.join('').length;
  const maximum = length <= 140 ? 36 : length <= 210 ? 33 : 30;
  useLayoutEffect(() => {
    const node = element.current!;
    // Measure only when the article changes, never on each animation frame.
    for (let size = maximum; size >= 16; size--) {
      node.style.fontSize = `${size}px`;
      if (node.scrollHeight <= node.clientHeight + 1) break;
    }
  }, [paragraphs, maximum]);
  return <div ref={element} className={`sg-summary${length > 480 ? ' sg-summary-long' : ''}`} data-fit="상세 요약">
    {paragraphs.map((paragraph, i) => <p key={i} style={paragraphStyle(i)}>{paragraph}</p>)}
  </div>;
}
