import { useCallback, useEffect, useState } from 'react';
import { initialTimelines, articleOffsetMilliseconds, stepIndices, validateManifest, scheduleManifest, playbackAt, getSession, type Manifest } from '@kmucs/signage-player';
import { Player, AssetCache, type ScreenRole } from '@kmucs/signage-player/react';
import '@kmucs/signage-player/style.css';

const assetUrl = (path: string, manifest: Manifest) => `${path}?v=${manifest.assets.find((a) => a.path === path)?.sha256}`;

export function SignagePreview({ manifest, live = true }: { manifest: Manifest; live?: boolean }) {
  const [timelines, setTimelines] = useState(() => initialTimelines(manifest));
  const [sessionId, setSessionId] = useState(manifest.sessions[0].id);
  const [role, setRole] = useState<ScreenRole | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [frozen, setFrozen] = useState<number | null>(null);
  const now = useCallback(() => frozen ?? Date.now(), [frozen]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get('session');
    if (requested && manifest.sessions.some((s) => s.id === requested)) setSessionId(requested);
    const requestedRole = params.get('role');
    if (requestedRole === 'list' || requestedRole === 'detail' || requestedRole === 'detail-secondary') setRole(requestedRole);
    let alive = true;
    let busy = true;
    let revision = '';
    let current = initialTimelines(manifest);
    let preparing: string | null = manifest.revision;
    let pollAfter = Date.now() + manifest.pollIntervalSeconds * 1000;
    let pollSeconds = manifest.pollIntervalSeconds;
    const requests = new AbortController();
    const assets = new AssetCache();
    const retain = () => assets.retain([
      ...Object.values(current).flatMap((t) => [t.current.manifest.revision, ...(t.pending ? [t.pending.playback.manifest.revision] : [])]),
      ...(preparing ? [preparing] : []),
    ]);
    assets.prepare(manifest, assetUrl).then(() => { if (alive) { revision = manifest.revision; setReady(true); } })
      .catch((e) => { if (alive) setError(String(e)); }).finally(() => { busy = false; preparing = null; });
    const timer = setInterval(async () => {
      let changed = false;
      current = Object.fromEntries(Object.entries(current).map(([id, t]) => {
        if (t.pending && Date.now() >= t.pending.activateAt) { changed = true; return [id, { current: t.pending.playback }]; }
        return [id, t];
      }));
      if (changed) { setTimelines(current); retain(); }
      if (!live || busy || Date.now() < pollAfter || Object.values(current).some((t) => t.pending)) return;
      busy = true;
      pollAfter = Date.now() + pollSeconds * 1000;
      try {
        const response = await fetch('/signage/feed.json', { cache: 'no-store', signal: AbortSignal.any([requests.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) { await response.body?.cancel(); throw new Error(`설정 수신 실패: HTTP ${response.status}`); }
        const next = validateManifest(await response.json());
        if (!alive) return;
        if (revision !== next.revision) {
          preparing = next.revision;
          await assets.prepare(next, assetUrl);
          if (alive) {
            current = scheduleManifest(current, next, Date.now());
            setTimelines(current); setFrozen(null);
            revision = next.revision;
          }
        }
        pollSeconds = next.pollIntervalSeconds;
        if (alive) { setReady(true); setError(''); }
      } catch (e) { if (alive) setError(String(e)); }
      finally { busy = false; preparing = null; if (alive) retain(); }
    }, 1000);
    return () => { alive = false; clearInterval(timer); requests.abort(); assets.retain([]); };
  }, [manifest, live]);
  const selectedId = Object.hasOwn(timelines, sessionId) ? sessionId : Object.keys(timelines)[0];
  const timeline = timelines[selectedId];
  const playback = playbackAt(timeline, now());
  const session = getSession(playback);
  const selectArticle = (index: number) => setFrozen(playback.epoch + articleOffsetMilliseconds(session, index) + session.transitionMilliseconds + 10);
  const roles: ScreenRole[] = role ? [role] : session.detailCount === 2 ? ['list', 'detail', 'detail-secondary'] : ['list', 'detail'];
  return <div className={role ? 'signage-preview single' : 'signage-preview'}>
    {!role && <header className="preview-controls">
      <div><h1>KMUCS 디스플레이</h1><p>동일한 타임라인으로 목록과 상세 화면을 미리 봅니다.</p></div>
      <label>세션 <select value={selectedId} onChange={(e) => { setSessionId(e.target.value); setFrozen(null); }}>{Object.keys(timelines).map((id) => <option key={id}>{id}</option>)}</select></label>
      <button type="button" onClick={() => setFrozen(null)} aria-pressed={frozen === null}>자동 재생</button>
      <button type="button" onClick={() => document.documentElement.requestFullscreen().catch((e) => setError(String(e)))}>전체 화면</button>
      {live && <a href="/signage/setup/">디스플레이 편성</a>}
      <nav aria-label="기사 미리보기">{session.items.map((item, i) => i % (session.detailCount ?? 1) === 0 && <button type="button" key={item.id} title={stepIndices(session, i).map(index => session.items[index].title).join(' / ')} onClick={() => selectArticle(i)}>{stepIndices(session, i).map(index => index + 1).join(' · ')}</button>)}</nav>
      <p className="preview-note">{live ? '기사 버튼은 미리보기만 고정합니다. 기사 선택과 화면 배분은 디스플레이 편성에서 설정하세요.' : '편성 중인 미리보기입니다. 실제 디스플레이에는 아직 적용되지 않았습니다.'}</p>
    </header>}
    {error && !role && <p role="alert" className="preview-error">{error} {ready ? '기존 콘텐츠를 유지합니다.' : ''}</p>}
    {ready ? <div className={`preview-screens ${roles.length === 3 ? 'triple' : ''}`}>{roles.map((r) => <section key={r} aria-label={r === 'list' ? '뉴스 목록 화면' : r === 'detail-secondary' ? '뉴스 상세 2 화면' : '뉴스 상세 화면'}><Player timeline={timeline} role={r} now={now} assetUrl={assetUrl} /></section>)}</div> : <p role="status">{error || '이미지와 글꼴을 준비하고 있습니다.'}</p>}
  </div>;
}
