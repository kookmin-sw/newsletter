import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';
import { frameAt, validateManifest, initialTimelines, scheduleManifest, playbackAt, getSession, nextCycleAt } from '../dist/core.js';

test('기사별 길이와 반복 경계는 누적 시간으로 계산한다', () => {
  const session = fixture().sessions[0];
  for (const [time, index] of [[0, 0], [19999, 0], [20000, 1], [49999, 1], [50000, 2], [59999, 2], [60000, 0], [86400000 + 20000, 1]]) {
    assert.equal(frameAt(session, 0, time).index, index);
  }
  assert.equal(frameAt(session, 0, 20300).transition, 0.5);
  assert.equal(frameAt(session, 0, 35000).progress, 0.5);
});

test('늦게 시작한 화면과 8시간 재생한 화면은 같은 위치와 모션을 얻는다', () => {
  const session = fixture().sessions[0];
  const early = frameAt(session, 10000, 8 * 3600000 + 30250);
  const late = frameAt(structuredClone(session), 10000, 8 * 3600000 + 30250);
  assert.deepEqual(early, late);
  assert.equal(early.index, 1);
  assert.equal(early.transition, 250 / 600);
});

test('미래 시작, 한 기사, 전환 없음, 빈 목록을 처리한다', () => {
  const s = fixture().sessions[0];
  assert.equal(frameAt(s, 10000, 0).waiting, true);
  s.items = [s.items[0]]; s.transitionMilliseconds = 0;
  assert.equal(frameAt(s, 0, 90000).index, 0);
  assert.equal(frameAt(s, 0, 90000).transition, 1);
  s.items = [];
  assert.throws(() => frameAt(s, 0, 0), /빈 재생/);
});

test('설정은 기존 반복 경계까지 유지하고 이후에도 공통 시작 시각을 사용한다', () => {
  const m = fixture();
  const original = initialTimelines(m);
  const epoch = original['lobby-a'].current.epoch;
  const next = fixture(); next.revision = 'c'.repeat(64); next.sessions[0].items.reverse();
  const scheduled = scheduleManifest(original, next, epoch + 21000)['lobby-a'];
  assert.equal(scheduled.pending.activateAt, epoch + 60000);
  assert.equal(playbackAt(scheduled, epoch + 59999).manifest.revision, m.revision);
  const current = playbackAt(scheduled, epoch + 60000);
  assert.equal(getSession(current).items[0].id, 'article-2');
  assert.equal(current.epoch, epoch);
  assert.equal(frameAt(getSession(current), current.epoch, epoch + 60000).index, 0);
  assert.equal(original['lobby-a'].pending, undefined);
});

test('서로 다른 PC의 갱신·재시작·누락된 배포 이력과 관계없이 같은 재생 위치로 합류한다', () => {
  const first = fixture();
  const initial = initialTimelines(first);
  const epoch = initial['lobby-a'].current.epoch;
  const next = fixture(); next.revision = 'd'.repeat(64);
  next.sessions[0].items[0].durationSeconds = 17;
  const a = scheduleManifest(initial, next, epoch + 1000)['lobby-a'];
  const b = scheduleManifest(initial, next, epoch + 70000)['lobby-a'];
  const restarted = initialTimelines(next)['lobby-a'];
  assert.notEqual(a.pending.activateAt, b.pending.activateAt);
  for (const time of [epoch + 120000, epoch + 123456, epoch + 90 * 86400000]) {
    const frames = [a, b, restarted].map(t => {
      const p = playbackAt(t, time);
      return frameAt(getSession(p), p.epoch, time);
    });
    assert.deepEqual(frames[0], frames[1]); assert.deepEqual(frames[0], frames[2]);
  }
});

test('경계 직전 변경은 준비 여유를 확보하며 세션마다 별도 경계를 사용한다', () => {
  const m = fixture();
  m.sessions.push({ ...structuredClone(m.sessions[0]), id: 'lobby-b', items: [m.sessions[0].items[0]] });
  const initial = initialTimelines(m);
  const epoch = initial['lobby-a'].current.epoch;
  const next = scheduleManifest(initial, m, epoch + 59500);
  assert.equal(next['lobby-a'].pending.activateAt, epoch + 120000);
  assert.equal(next['lobby-b'].pending.activateAt, epoch + 80000);
  assert.equal(nextCycleAt(initial['lobby-a'].current, epoch - 1), epoch);
});

test('기존 화면에 배정된 삭제 세션은 이전 콘텐츠를 유지한다', () => {
  const m = fixture(); const initial = initialTimelines(m);
  const next = fixture(); next.sessions[0].id = 'new-session';
  const scheduled = scheduleManifest(initial, next, Date.now(), ['lobby-a']);
  assert.ok(scheduled['lobby-a']); assert.ok(scheduled['new-session']);
  next.sessions[0].id = 'constructor';
  assert.equal(scheduleManifest(initial, next, Date.now()).constructor.current.sessionId, 'constructor');
});

test('긴 뉴스레터 요약은 버전 3에서만 허용하며 제한을 넘어가면 거절한다', () => {
  const manifest = fixture();
  manifest.sessions[0].items[0].summary = ['가'.repeat(300), '나'.repeat(300)];
  assert.throws(() => validateManifest(manifest));
  manifest.schemaVersion = 3;
  assert.equal(validateManifest(manifest).sessions[0].items[0].summary.join('').length, 600);
  manifest.sessions[0].detailCount = 2;
  assert.equal(validateManifest(manifest).schemaVersion, 3);
  manifest.sessions[0].items[0].summary.push('다'.repeat(201));
  assert.throws(() => validateManifest(manifest), /800/);
});

test('배포 또는 외부 데이터의 잘못된 형식과 위험한 경로를 거절한다', () => {
  assert.equal(validateManifest(fixture()).schemaVersion, 1);
  const invalid = [
    (m) => { m.schemaVersion = 99; },
    (m) => { m.sessions[0].items = []; },
    (m) => { m.sessions[0].items[0].durationSeconds = -1; },
    (m) => { m.sessions[0].items[0].durationSeconds = NaN; },
    (m) => { m.sessions[0].items[0].image = '/images/missing.png'; },
    (m) => { m.sessions[0].items[0].url = 'javascript:alert(1)'; },
    (m) => { m.sessions[0].startsAt = '2026-10-10T00:00:00'; },
    (m) => { m.sessions.push(m.sessions[0]); },
    (m) => { m.sessions[0].items.push(m.sessions[0].items[0]); },
    (m) => { m.assets[0].path = '/images/../secrets.png'; },
    (m) => { m.sessions[0].items[0].summary = ['a'.repeat(181)]; },
  ];
  for (const mutate of invalid) { const m = fixture(); mutate(m); assert.throws(() => validateManifest(m)); }
});

 test('배정하지 않은 삭제 세션과 이전 버전은 반복 갱신해도 쌓이지 않는다', () => {
  let timelines = initialTimelines(fixture());
  for (let i = 0; i < 1000; i++) {
    const manifest = fixture(); manifest.sessions[0].id = `session-${i}`;
    timelines = scheduleManifest(timelines, manifest, Date.now());
    assert.equal(Object.keys(timelines).length, 1);
  }
});
