import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';
import { splitPlaylist, makeDisplayPlan, assignMonitorPairs } from '../dist/setup.js';

const base = () => ({ schemaVersion: 1, pollIntervalSeconds: 60, sessions: [
  { id: 'lobby-a', newsletterId: 'newsletter-003', title: '뉴스레터', issue: '003', dateLabel: '2026.10',
    startsAt: '2026-10-10T00:00:00+09:00', defaultDurationSeconds: 20, transitionMilliseconds: 950 },
] });
const refs = () => fixture().sessions[0].items.map(a => ({ articleId: a.id, durationSeconds: a.durationSeconds }));

test('홀수 기사를 두 쌍에 나눠도 순서와 개별 재생시간을 보존한다', () => {
  const items = refs();
  const [a, b] = splitPlaylist(items);
  assert.equal(a.length, 2); assert.equal(b.length, 1);
  assert.deepEqual([...a, ...b], items);
  const result = makeDisplayPlan(base(), fixture(), [{ id: 'lobby-a', items: a }, { id: 'lobby-b', items: b }]);
  assert.deepEqual(result.configuration.sessions.flatMap(s => s.items), items);
  assert.deepEqual(result.preview.sessions.flatMap(s => s.items.map(a => a.id)), items.map(a => a.articleId));
  assert.equal(result.configuration.sessions[1].newsletterId, 'newsletter-003');
});

test('편성하지 않은 세션을 보존하고 입력 설정과 카탈로그를 수정하지 않는다', () => {
  const configuration = base();
  configuration.sessions.push({ ...configuration.sessions[0], id: 'lobby-b' }, { ...configuration.sessions[0], id: 'library' });
  const catalog = fixture();
  const snapshot = structuredClone({ configuration, catalog });
  const result = makeDisplayPlan(configuration, catalog, [{ id: 'lobby-a', items: refs() }]);
  assert.deepEqual(result.configuration.sessions.map(s => s.id), ['lobby-a', 'library']);
  assert.deepEqual(result.configuration.sessions[1], snapshot.configuration.sessions[2]);
  assert.deepEqual({ configuration, catalog }, snapshot);
});

test('미리보기도 세션의 뉴스레터 요약을 우선 사용하고 버전 3을 유지한다', () => {
  const configuration = base(); configuration.schemaVersion = 3;
  const catalog = fixture(); catalog.schemaVersion = 3;
  const summaries = { 'newsletter-003': { 'article-0': ['뉴스레터에 실린 원문 '.repeat(40)] } };
  for (const detailCount of [1, 2]) {
    const result = makeDisplayPlan(configuration, catalog, [{ id: 'lobby-a', items: refs() }], detailCount, summaries);
    assert.equal(result.configuration.schemaVersion, 3);
    assert.equal(result.preview.schemaVersion, 3);
    assert.deepEqual(result.preview.sessions[0].items[0].summary, summaries['newsletter-003']['article-0']);
    assert.deepEqual(result.preview.sessions[0].items[1].summary, catalog.sessions[0].items[1].summary);
  }
  assert.deepEqual(catalog.sessions[0].items[0].summary, ['요약입니다.']);
});

test('빈 쌍, 중복 기사, 알 수 없는 기사와 범위를 벗어난 시간을 내보내지 않는다', () => {
  for (const items of [[], [refs()[0], refs()[0]], [{ articleId: 'unknown', durationSeconds: 20 }],
    [{ ...refs()[0], durationSeconds: 0 }], [{ ...refs()[0], durationSeconds: 601 }]]) {
    assert.throws(() => makeDisplayPlan(base(), fixture(), [{ id: 'lobby-a', items }]));
  }
});

test('2대와 4대에 목록·상세를 순서대로 배정하고 남은 모니터는 사용하지 않는다', () => {
  assert.deepEqual(assignMonitorPairs([9, 4, 7, 2, 8], ['lobby-a', 'lobby-b']), [
    { displayId: 9, sessionId: 'lobby-a', role: 'list' },
    { displayId: 4, sessionId: 'lobby-a', role: 'detail' },
    { displayId: 7, sessionId: 'lobby-b', role: 'list' },
    { displayId: 2, sessionId: 'lobby-b', role: 'detail' },
  ]);
  assert.equal(assignMonitorPairs([9, 4, 7, 2], ['lobby-a']).length, 2);
  assert.throws(() => assignMonitorPairs([1, 2], ['a', 'b']), /4대/);
  assert.throws(() => assignMonitorPairs([1, 2, 3, 4], ['a', 'a']), /서로 다른/);
  assert.throws(() => assignMonitorPairs([1, 1], ['a']), /모니터/);
});

test('월호 편성을 2·3·4대에 배분하고 실행 중인 세션에 예약 반영한다', async () => {
  const { initialTimelines, scheduleManifest, playbackAt, getSession, issueLabel } = await import('../dist/core.js');
  const configuration = base(); configuration.schemaVersion = 3;
  Object.assign(configuration.sessions[0], { newsletterId: 'newsletter-2026-09', title: 'KMUCS 9월호 뉴스레터', issue: '9월호', dateLabel: '2026.09' });
  const summaries = { 'newsletter-2026-09': { 'article-0': ['9월호 원문 요약입니다.'] } };
  for (const screens of [2, 3, 4]) {
    const groups = screens === 4 ? splitPlaylist(refs()).map((items, i) => ({ id: i ? 'lobby-b' : 'lobby-a', items })) : [{ id: 'lobby-a', items: refs() }];
    const plan = makeDisplayPlan(configuration, fixture(), groups, screens === 3 ? 2 : 1, summaries);
    assert.equal(plan.configuration.sessions[0].newsletterId, 'newsletter-2026-09');
    assert.equal(plan.preview.sessions.length, screens === 4 ? 2 : 1);
    assert.equal(plan.preview.sessions[0].items[0].summary[0], '9월호 원문 요약입니다.');
    const initial = initialTimelines(fixture());
    const next = scheduleManifest(initial, plan.preview, initial['lobby-a'].current.epoch + 1000);
    const activation = next['lobby-a'].pending.activateAt;
    assert.equal(getSession(playbackAt(next['lobby-a'], activation - 1)).issue, '003');
    assert.equal(issueLabel(getSession(playbackAt(next['lobby-a'], activation)).issue), '9월호');
  }
});
