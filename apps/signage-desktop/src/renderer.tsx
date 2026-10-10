import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { playbackAt, getSession, type Manifest, type Timeline } from '@kmucs/signage-player';
import { assignMonitorPairs } from '@kmucs/signage-player/setup';
import { Player, AssetCache, type ScreenRole } from '@kmucs/signage-player/react';
import '@kmucs/signage-player/style.css';
import './setup.css';
import appIcon from '../assets/icon.png';

interface Assignment { displayId: number; sessionId: string; role: ScreenRole }
interface Settings { assignments: Assignment[]; autoStart: boolean }
interface Snapshot {
  timelines: Record<string, Timeline>; candidate: Manifest | null; settings: Settings;
  displays: { id: number; label: string; bounds: { width: number; height: number }; scaleFactor: number; rotation: number }[];
  lastError: string; lastChecked: string | null; preparing: boolean; source: string;
  assignment: Assignment | null; cacheDirectory: string; version: string;
}
declare global {
  interface Window {
    signage: {
      snapshot(): Promise<Snapshot>; clock(): Promise<number>; saveSetup(settings: Settings): Promise<Snapshot>;
      refresh(): Promise<void>; prepared(revision: string, error?: string): Promise<void>; quit(): Promise<void>;
      subscribe(callback: (state: Snapshot) => void): () => void;
    };
  }
}

const assetUrl = (path: string, manifest: Manifest) => {
  const asset = manifest.assets.find((a) => a.path === path)!;
  return `signage://app/cache/${asset.sha256}${path.slice(path.lastIndexOf('.')).toLowerCase()}`;
};
let offset = Date.now() - performance.now();
const now = () => performance.now() + offset;
let syncing = false;
async function syncClock() {
  if (syncing) return;
  syncing = true;
  try {
    let best = Infinity;
    let next = offset;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const host = await window.signage.clock();
      const end = performance.now();
      if (end - start < best) { best = end - start; next = host - (start + end) / 2; }
    }
    offset = next;
  } finally { syncing = false; }
}

function App() {
  const [state, setState] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [clockReady, setClockReady] = useState(false);
  useEffect(() => {
    const unsubscribe = window.signage.subscribe((snapshot) => { setState(snapshot); syncClock().catch((e) => setError(String(e))); });
    window.signage.snapshot().then(setState).catch((e) => setError(String(e)));
    syncClock().then(() => setClockReady(true)).catch((e) => setError(String(e)));
    const interval = setInterval(() => syncClock().catch((e) => setError(String(e))), 30000);
    return () => { unsubscribe(); clearInterval(interval); };
  }, []);
  if (!state || !clockReady) return <div className="loading">{error || 'KMUCS News Sinage를 준비하고 있습니다.'}</div>;
  return state.assignment ? <PlaybackScreen state={state} /> : <Setup state={state} />;
}

function PlaybackScreen({ state }: { state: Snapshot }) {
  const assignment = state.assignment!;
  const timeline = state.timelines[assignment.sessionId];
  const [assets] = useState(() => new AssetCache());
  useEffect(() => () => assets.retain([]), [assets]);
  const [, rerender] = useState(0);
  const [error, setError] = useState('');
  const manifests = [timeline.current.manifest, timeline.pending?.playback.manifest, state.candidate].filter(Boolean) as Manifest[];
  const key = manifests.map((m) => m.revision).join(':');
  useEffect(() => {
    let stopped = false;
    assets.retain(manifests.map((m) => m.revision));
    (async () => {
      for (const manifest of manifests) {
        try {
          await assets.prepare(manifest, assetUrl);
          if (stopped) return;
          rerender((n) => n + 1);
          await window.signage.prepared(manifest.revision);
        } catch (e) {
          if (stopped) return;
          setError(String(e));
          await window.signage.prepared(manifest.revision, String(e));
          return;
        }
      }
    })();
    return () => { stopped = true; };
  }, [key]);
  const current = playbackAt(timeline, now());
  if (!assets.has(current.manifest.revision)) return <div className="loading">{error || '콘텐츠를 준비하고 있습니다.'}</div>;
  return <div className="playback"><Player timeline={timeline} role={assignment.role} now={now} assetUrl={assetUrl} /></div>;
}

function Setup({ state }: { state: Snapshot }) {
  const [settings, setSettings] = useState(state.settings);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [screenCount, setScreenCount] = useState<2 | 3 | 4>(2);
  const pairCount = screenCount === 4 ? 2 : 1;
  const detailCount = screenCount === 3 ? 2 : 1;
  const [pairSessions, setPairSessions] = useState<string[]>([]);
  const sessionIds = Object.keys(state.timelines);
  const pairIds = [0, 1].map(i => sessionIds.includes(pairSessions[i]) ? pairSessions[i] : sessionIds[i] ?? '');
  const quickAssign = () => {
    try {
      if (pairIds.slice(0, pairCount).some(id => (getSession(playbackAt(state.timelines[id], now())).detailCount ?? 1) !== detailCount)) throw new Error('선택한 모니터 수와 세션 구성이 다릅니다. 웹 편성에서 먼저 설정을 적용하세요.');
      const assignments = assignMonitorPairs(state.displays.map(d => d.id), pairIds.slice(0, pairCount), detailCount);
      setSettings(s => ({ ...s, assignments }));
      setMessage('아래 모니터 순서로 배정했습니다. 위치를 확인하거나 수정한 뒤 저장하고 실행을 누르세요.');
    } catch (e) { setMessage(String(e)); }
  };
  useEffect(() => setSettings(state.settings), [JSON.stringify(state.settings)]);
  const update = (displayId: number, patch: Partial<Assignment>) => {
    setSettings((value) => {
      const row = value.assignments.find((a) => a.displayId === displayId) ?? { displayId, sessionId: '', role: 'list' as const };
      const next = { ...row, ...patch };
      return { ...value, assignments: [...value.assignments.filter((a) => a.displayId !== displayId), ...(next.sessionId ? [next] : [])] };
    });
  };
  const save = async () => {
    setBusy(true); setMessage('');
    try { await window.signage.saveSetup(settings); setMessage('저장했습니다. 준비된 화면부터 전체 화면으로 실행합니다.'); }
    catch (e) { setMessage(String(e)); }
    finally { setBusy(false); }
  };
  const missing = settings.assignments.filter((a) => !state.displays.some((d) => d.id === a.displayId));
  return <main className="setup">
    <header><div className="app-brand"><img src={appIcon} alt="국민대학교" /><span className="eyebrow">KMUCS News Sinage</span></div><h1>모니터 설정</h1><p>세션 구성에 맞춰 목록 1대와 상세 1대 또는 2대를 배정하세요.</p></header>
    <div className="status"><span className={state.lastError ? 'status-dot warn' : 'status-dot'} />{state.preparing ? '새 콘텐츠를 준비하고 있습니다.' : state.lastError ? '기존 콘텐츠 유지 중' : '재생 준비 완료'}<small>앱 {state.version}</small></div>
    {state.lastError && <p className="alert" role="alert">{state.lastError}</p>}
    {!Object.keys(state.timelines).length && <p className="alert">아직 콘텐츠가 없습니다. alumni 사이트에 사이니지 데이터를 배포한 뒤 다시 확인하세요.</p>}
    {missing.length > 0 && <p className="alert">저장된 모니터 {missing.map((a) => a.displayId).join(', ')}가 연결되지 않았습니다. 다시 연결하거나 아래 버튼으로 연결 해제된 배정을 지우세요. <button onClick={() => setSettings((s) => ({ ...s, assignments: s.assignments.filter((a) => state.displays.some((d) => d.id === a.displayId)) }))}>연결 해제된 배정 지우기</button></p>}
    <section className="quick-setup" aria-label="빠른 모니터 배정">
      <h2>모니터 한 번에 배정</h2><p>아래 모니터 순서대로 목록·상세를 묶습니다. 배정 후 각 카드에서 변경할 수 있습니다.</p>
      <div className="quick-fields"><label>사용할 모니터<select value={screenCount} onChange={e => setScreenCount(Number(e.target.value) as 2 | 3 | 4)}><option value={2}>2대 · 한 쌍</option><option value={3}>3대 · 목록 1 + 상세 2</option><option value={4}>4대 · 두 쌍</option></select></label>
        {Array.from({ length: pairCount }, (_, i) => <label key={i}>{i === 0 ? 'A' : 'B'} 세션<select value={pairIds[i]} onChange={e => setPairSessions(pairIds.map((id, index) => index === i ? e.target.value : id))}><option value="">세션 선택</option>{sessionIds.map(id => <option key={id} value={id}>{id} · {getSession(playbackAt(state.timelines[id], now())).title}</option>)}</select></label>)}
        <button type="button" disabled={state.displays.length < screenCount || pairIds.slice(0, pairCount).some(id => !id)} onClick={quickAssign}>빠른 배정</button>
      </div><p className="hint">현재 {state.displays.length}대 연결됨. 빠른 배정은 기존 배정을 교체하며, 선택한 {screenCount}대 외 모니터는 사용하지 않습니다.</p>
      {screenCount === 3 && <p className="hint">3대 편성을 적용한 세션을 선택하세요. 모니터 순서대로 목록, 상세 1, 상세 2가 배정됩니다.</p>}
      {pairCount === 2 && sessionIds.length < 2 && <p className="hint">웹의 디스플레이 편성에서 4대 구성을 만들고 사이트를 배포한 뒤 콘텐츠 다시 확인을 누르세요.</p>}
    </section>
    <section className="monitor-grid" aria-label="연결된 모니터">
      {state.displays.map((display, index) => {
        const row = settings.assignments.find((a) => a.displayId === display.id);
        return <article className="monitor" key={display.id}><div className="monitor-heading"><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{display.label}</h2><p>{Math.round(display.bounds.width * display.scaleFactor)} × {Math.round(display.bounds.height * display.scaleFactor)} · 배율 {Math.round(display.scaleFactor * 100)}% · ID {display.id}</p></div></div>
          <label>세션<select value={row?.sessionId ?? ''} onChange={(e) => update(display.id, { sessionId: e.target.value })}><option value="">사용하지 않음</option>{Object.keys(state.timelines).map((id) => <option key={id} value={id}>{id} · {getSession(playbackAt(state.timelines[id], now())).title}</option>)}</select></label>
          <label>화면 역할<select disabled={!row} value={row?.role ?? 'list'} onChange={(e) => update(display.id, { role: e.target.value as ScreenRole })}><option value="list">뉴스 목록</option><option value="detail">뉴스 상세 1</option><option value="detail-secondary">뉴스 상세 2 (3대 구성)</option></select></label>
          {display.bounds.width > display.bounds.height && <p className="hint">Windows 디스플레이 설정에서 세로 방향으로 변경하세요.</p>}
        </article>;
      })}
    </section>
    <label className="check"><input type="checkbox" checked={settings.autoStart} onChange={(e) => setSettings((s) => ({ ...s, autoStart: e.target.checked }))} /> Windows 로그인 후 자동 실행 (설치 버전에서 적용)</label>
    <div className="actions"><button className="primary" disabled={busy || !Object.keys(state.timelines).length} onClick={save}>{busy ? '저장 중' : '저장하고 실행'}</button><button disabled={state.preparing} onClick={() => window.signage.refresh().catch((e) => setMessage(String(e)))}>콘텐츠 다시 확인</button><button onClick={() => window.signage.quit()}>앱 종료</button></div>
    {message && <p role="status">{message}</p>}
    <footer><p><kbd>Ctrl + Alt + S</kbd> 설정 열기 · <kbd>Ctrl + Alt + Q</kbd> 앱 종료</p><p>마지막 확인: {state.lastChecked ? new Date(state.lastChecked).toLocaleString('ko-KR') : '아직 없음'}</p><p>데이터: {state.source}</p><p>캐시: {state.cacheDirectory}</p><p>기사·요약·재생 시간은 alumni 저장소에서 수정하고 배포합니다. 이 창을 닫아도 재생은 계속됩니다.</p></footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
