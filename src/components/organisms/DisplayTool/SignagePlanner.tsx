import { useRef, useState } from 'react';
import { cycleMilliseconds, type Manifest } from '@kmucs/signage-player';
import { makeDisplayPlan, splitPlaylist, type PlaylistGroup, type SignageConfiguration } from '@kmucs/signage-player/setup';
import { SignagePreview } from './SignagePreview';
import './signage-planner.css';

interface Props {
  current: Manifest; catalog: Manifest; configuration: SignageConfiguration;
  entries: { id: string; title: string; date: string; image: string; error: string }[];
  newsletters: { id: string; title: string; articleIds: string[] }[];
  summaries: Record<string, Record<string, string[]>>;
}

export function SignagePlanner({ current, catalog, configuration, entries, newsletters, summaries }: Props) {
  const generation = useRef(0);
  const [screenCount, setScreenCount] = useState<2 | 3 | 4>(current.sessions[0].detailCount === 2 ? 3 : current.sessions.length > 1 ? 4 : 2);
  const count = screenCount === 4 ? 2 : 1;
  const detailCount = screenCount === 3 ? 2 : 1;
  const [groups, setGroups] = useState<PlaylistGroup[]>(() => {
    const first = current.sessions.slice(0, 2).map(s => ({ id: s.id, items: s.items.map(a => ({ articleId: a.id, durationSeconds: a.durationSeconds })) }));
    let id = 'lobby-b';
    for (let i = 2; configuration.sessions.some(s => s.id === id); i++) id = `lobby-b-${i}`;
    return first.length === 2 ? first : [...first, { id, items: [] }];
  });
  const [query, setQuery] = useState('');
  const [newsletterId, setNewsletterId] = useState('');
  const [selected, setSelected] = useState<string[]>(() => [...new Set(groups.flatMap(g => g.items.map(a => a.articleId)))]);
  const [preview, setPreview] = useState<Manifest | null>(null);
  const [message, setMessage] = useState('');
  const [exportText, setExportText] = useState('');
  const articles = new Map(catalog.sessions.flatMap(s => s.items).map(a => [a.id, a]));
  const newsletter = newsletters.find(n => n.id === newsletterId);
  const filtered = entries.filter(e => (!newsletter || newsletter.articleIds.includes(e.id)) && e.title.toLowerCase().includes(query.toLowerCase()));
  const enabled = filtered.filter(e => !e.error);
  const change = (next: PlaylistGroup[]) => { generation.current++; setGroups(next); setPreview(null); setExportText(''); setMessage(''); };
  const patch = (index: number, items: PlaylistGroup['items']) => change(groups.map((g, i) => i === index ? { ...g, items } : g));
  const allItems = () => [...new Map(groups.slice(0, count).flatMap(g => g.items).map(item => [item.articleId, item])).values()];
  const resize = (next: 2 | 3 | 4) => {
    if (screenCount === next) return;
    const items = allItems();
    const halves = next === 4 ? splitPlaylist(items) : [items, []];
    change(groups.map((g, i) => ({ ...g, items: halves[i] })));
    setScreenCount(next);
  };
  const addSelection = (target: number | 'split') => {
    const existing = new Map(allItems().map(a => [a.articleId, a]));
    const items = selected.map(articleId => existing.get(articleId) ?? { articleId, durationSeconds: configuration.sessions[0].defaultDurationSeconds });
    if (target === 'split') {
      const halves = splitPlaylist(items);
      change(groups.map((g, i) => ({ ...g, items: halves[i] })));
    } else {
      patch(target, [...groups[target].items, ...items.filter(a => !groups[target].items.some(b => b.articleId === a.articleId))]);
    }
  };
  const move = (group: number, index: number, offset: number) => {
    const items = [...groups[group].items];
    [items[index], items[index + offset]] = [items[index + offset], items[index]];
    patch(group, items);
  };
  const plan = () => makeDisplayPlan(configuration, catalog, groups.slice(0, count), detailCount, summaries);
  let problem = '';
  try { plan(); } catch (e) { problem = e instanceof Error ? e.message : String(e); }
  const showPreview = async () => {
    try {
      const request = ++generation.current;
      const result = plan().preview;
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(result)));
      result.revision = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
      if (request === generation.current) { setPreview(result); setMessage(''); }
    } catch (e) { setMessage(String(e)); }
  };
  const copy = async () => {
    try {
      const text = JSON.stringify(plan().configuration, null, 2) + '\n';
      setExportText(text);
      await navigator.clipboard.writeText(text);
      setMessage('설정을 복사했습니다. Codex에 붙여 넣어 저장소 반영을 요청할 수 있습니다.');
    } catch { setMessage('자동 복사를 사용할 수 없습니다. 아래 설정 내용을 펼쳐 직접 복사하세요.'); }
  };
  const download = () => {
    try {
      const text = JSON.stringify(plan().configuration, null, 2) + '\n';
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'signage.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportText(text); setMessage('설정 파일을 만들었습니다. 저장소에 반영하고 사이트를 배포하면 적용됩니다.');
    } catch (e) { setMessage(String(e)); }
  };
  return <main className="planner">
    <header className="planner-header"><div><span className="planner-kicker">KMUCS · DISPLAY STUDIO</span><h1>기사를 고르고,<br />화면에 나눠 담으세요.</h1><p>목록과 상세가 한 쌍으로 움직입니다. 기존 기사로 2대, 3대 또는 4대의 화면을 편성하세요.</p></div><a href="/signage/">현재 편성 보기 ↗</a></header>
    <section className="planner-section" aria-labelledby="layout-title">
      <div className="planner-step"><span>01</span><div><h2 id="layout-title">디스플레이 구성</h2><p>3대는 목록 하나에 상세 둘, 4대는 목록·상세 두 쌍으로 재생합니다.</p></div></div>
      <div className="planner-layouts">{([2, 3, 4] as const).map(n => <button type="button" key={n} aria-pressed={screenCount === n} onClick={() => resize(n)}><span className="planner-mini-screens">{Array.from({ length: n === 4 ? 2 : 1 }, (_, i) => <span key={i}><i>목록</i><i>{n === 3 ? '상세 1' : '상세'}</i>{n === 3 && <i>상세 2</i>}</span>)}</span><strong>{n}대 · {n === 4 ? '두 쌍' : '한 쌍'}</strong><small>{n === 3 ? '목록 하나에서 기사 두 개를 동시에' : n === 2 ? '선택한 기사를 한 세션으로' : '기사를 A·B 세션으로 나누어'}</small></button>)}</div>
      <p className="planner-hint">4대로 바꾸면 현재 기사를 반씩 나눕니다. 2대·3대로 돌아오면 중복 없이 합칩니다.</p>
      {screenCount === 3 && <p className="planner-hint">같은 목록 페이지 안에서 두 기사씩 전환합니다. 재생시간은 두 기사 중 긴 시간에 맞추고, 페이지에 홀수 개가 있으면 마지막 두 기사를 함께 표시합니다(7개: 1·2 → 3·4 → 4·5 → 6·7). 기사 한 개만 있으면 두 상세 화면에 같은 기사를 표시합니다.</p>}
      {configuration.sessions.length > 2 && <p className="planner-hint">앞의 두 세션만 편집합니다. 나머지 {configuration.sessions.length - 2}개 세션은 다운로드 파일에 보존됩니다.</p>}
    </section>
    <section className="planner-section" aria-labelledby="articles-title">
      <div className="planner-step"><span>02</span><div><h2 id="articles-title">요약이 있는 기사 선택</h2><p>공개 뉴스레터에 요약이 실린 기사만 표시합니다. 요약을 추가하고 사이트를 배포하면 여기에도 나타납니다. 같은 기사를 양쪽에 담아도 됩니다.</p></div></div>
      <div className="planner-filters"><label>기사 검색<input type="search" value={query} placeholder="제목으로 찾기" onChange={e => setQuery(e.target.value)} /></label><label>뉴스레터<select value={newsletterId} onChange={e => setNewsletterId(e.target.value)}><option value="">요약이 있는 전체 기사</option>{newsletters.map(n => <option key={n.id} value={n.id}>{n.title}{n.articleIds.length ? '' : ' (요약 기사 없음)'}</option>)}</select></label></div>
      <div className="planner-selection"><span>{selected.length}개 선택</span><button type="button" onClick={() => setSelected([...new Set([...selected, ...enabled.map(e => e.id)])])}>검색 결과 모두 선택</button><button type="button" onClick={() => setSelected([])}>선택 해제</button></div>
      <div className="planner-catalog">{filtered.map(entry => <label key={entry.id} className={entry.error ? 'unavailable' : ''}><input type="checkbox" disabled={!!entry.error} checked={selected.includes(entry.id)} onChange={e => setSelected(e.target.checked ? [...selected, entry.id] : selected.filter(id => id !== entry.id))} />{entry.image && !entry.error ? <img src={entry.image} alt="" loading="lazy" /> : <span className="planner-placeholder">KMU</span>}<span><small>{entry.date}{entry.error ? ' · 편성 전 수정 필요' : ''}</small><strong>{entry.title}</strong>{entry.error && <em>{entry.error}</em>}</span></label>)}{filtered.length === 0 && <p>검색 결과가 없습니다.</p>}</div>
      <div className="planner-actions"><button disabled={!selected.length} type="button" onClick={() => addSelection(0)}>선택 기사 → A에 추가</button>{count === 2 && <><button disabled={!selected.length} type="button" onClick={() => addSelection(1)}>선택 기사 → B에 추가</button><button disabled={selected.length < 2} type="button" onClick={() => addSelection('split')}>선택 기사로 A·B 반씩 편성</button></>}</div>
      {count === 2 && <p className="planner-hint">‘반씩 편성’은 A·B 목록을 선택 기사로 교체합니다. 선택한 순서를 유지해 앞쪽은 A, 뒤쪽은 B에 담습니다.</p>}
    </section>
    <section className="planner-section" aria-labelledby="playlist-title"><div className="planner-step"><span>03</span><div><h2 id="playlist-title">순서와 재생시간</h2><p>{screenCount === 3 ? '목록의 파란색 1번은 상세 1, 민트색 2번은 상세 2와 연결됩니다.' : '각 쌍의 목록과 상세에는 같은 기사가 표시됩니다.'}</p></div></div>
      <div className="planner-groups">{groups.slice(0, count).map((group, gi) => <article className="planner-group" key={group.id}><header><div><span className="planner-kicker">GROUP {gi === 0 ? 'A' : 'B'} · 화면 {gi * 2 + 1} + {gi * 2 + 2}{screenCount === 3 ? ' + 3' : ''}</span><h3>{gi === 0 ? 'A' : 'B'} · {group.items.length}개 기사</h3><p>{group.id} · 한 바퀴 {cycleMilliseconds({ ...current.sessions[0], detailCount, items: group.items.map(item => ({ ...articles.get(item.articleId)!, durationSeconds: item.durationSeconds })) }) / 1000}초</p></div><label>전체 시간<select aria-label={`${gi === 0 ? 'A' : 'B'} 전체 재생시간`} value="" onChange={e => patch(gi, group.items.map(a => ({ ...a, durationSeconds: Number(e.target.value) })))}><option value="" disabled>일괄 변경</option>{[10, 15, 20, 30, 45, 60].map(n => <option key={n} value={n}>{n}초</option>)}</select></label></header>
        <div className="planner-clear"><button type="button" disabled={!group.items.length} onClick={() => patch(gi, [])}>{gi === 0 ? 'A' : 'B'} 목록 비우기</button></div>
        <ol>{group.items.map((item, index) => <li key={item.articleId}><span className="planner-order">{String(index + 1).padStart(2, '0')}</span><div><strong>{articles.get(item.articleId)?.title ?? item.articleId}</strong><div className="planner-item-actions"><label>재생시간 <input type="number" min="5" max="600" aria-label={`${gi === 0 ? 'A' : 'B'} ${index + 1}번 재생시간`} value={item.durationSeconds} onChange={e => patch(gi, group.items.map((a, i) => i === index ? { ...a, durationSeconds: Number(e.target.value) } : a))} /> 초</label><button type="button" disabled={index === 0} aria-label={`${gi === 0 ? 'A' : 'B'} ${index + 1}번 위로`} onClick={() => move(gi, index, -1)}>↑</button><button type="button" disabled={index === group.items.length - 1} aria-label={`${gi === 0 ? 'A' : 'B'} ${index + 1}번 아래로`} onClick={() => move(gi, index, 1)}>↓</button><button type="button" aria-label={`${gi === 0 ? 'A' : 'B'} ${index + 1}번 삭제`} onClick={() => patch(gi, group.items.filter((_, i) => i !== index))}>삭제</button></div></div></li>)}</ol>
        {!group.items.length && <p className="planner-empty">위에서 기사를 선택해 이 쌍에 담아주세요.</p>}
      </article>)}</div>
    </section>
    <section className="planner-section planner-finish"><div className="planner-step"><span>04</span><div><h2>미리보고 적용하기</h2><p>화면을 확인한 뒤 설정 파일을 받아 사이트에 반영하세요.</p></div></div>
      {problem && <p className="planner-error" role="alert">각 쌍에 1~100개 기사, 기사당 5~600초로 편성하세요. {problem}</p>}
      <div className="planner-actions"><button type="button" disabled={!!problem} onClick={showPreview}>편성 미리보기</button><button className="primary" type="button" disabled={!!problem} onClick={download}>설정 파일 다운로드</button><button type="button" disabled={!!problem} onClick={copy}>설정 복사</button></div>
      <p className="planner-hint">다운로드만으로 운영 화면이 바뀌지는 않습니다. 받은 signage.json을 저장소의 src/content/config/signage.json에 반영하고 사이트를 배포하세요. Windows 앱에서는 아래 세션을 같은 쌍의 모니터에 배정합니다.</p>
      <div className="planner-mapping">{groups.slice(0, count).map((g, i) => <p key={g.id}><strong>{i === 0 ? 'A' : 'B'} · {g.id}</strong><span>모니터 {i * 2 + 1}: 뉴스 목록 / 모니터 {i * 2 + 2}: 뉴스 상세{screenCount === 3 ? ' 1 / 모니터 3: 뉴스 상세 2' : ''}</span></p>)}</div>
      {message && <p role="status">{message}</p>}
      {exportText && <details><summary>내보낼 설정 내용</summary><pre>{exportText}</pre></details>}
    </section>
    {preview && <section className="planner-preview" aria-label="편성 미리보기"><SignagePreview key={preview.revision} manifest={preview} live={false} /></section>}
  </main>;
}
