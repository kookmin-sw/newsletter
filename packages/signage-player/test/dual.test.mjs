import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';
import { validateManifest, cycleMilliseconds, frameAt, articleOffsetMilliseconds, listPageIndices, initialTimelines, scheduleManifest, playbackAt } from '../dist/core.js';
import { makeDisplayPlan, assignMonitorPairs } from '../dist/setup.js';

function dual(count = 6) {
  const manifest = fixture(); manifest.schemaVersion = 2;
  const session = manifest.sessions[0]; session.detailCount = 2;
  session.items = Array.from({ length: count }, (_, i) => ({ ...session.items[0], id: `article-${i}`, durationSeconds: 20 }));
  return manifest;
}

test('3대는 두 기사 중 긴 시간에 맞춰 1·2, 3·4, 5·6을 함께 전환한다', () => {
  const session = dual().sessions[0];
  session.items[1].durationSeconds = 30;
  assert.equal(cycleMilliseconds(session), 70000);
  for (const [time, expected] of [[0, [0, 1]], [29999, [0, 1]], [30000, [2, 3]], [50000, [4, 5]], [70000, [0, 1]], [70000 * 100000 + 30000, [2, 3]]]) {
    assert.deepEqual(frameAt(session, 0, time).indices, expected);
  }
  assert.equal(articleOffsetMilliseconds(session, 1), 0);
  assert.equal(articleOffsetMilliseconds(session, 3), 30000);
  assert.deepEqual(frameAt(session, 0, 30300).previousIndices, [0, 1]);
  assert.equal(frameAt(session, 0, 30300).transition, 0.5);
});

test('1~100개에서 마지막 두 기사를 같은 목록 페이지에 표시한다', () => {
  for (let count = 1; count <= 100; count++) {
    const session = dual(count).sessions[0];
    let offset = 0;
    for (let i = 0; i < count; i += 2) {
      const frame = frameAt(session, 0, offset);
      const visible = listPageIndices(session, frame.index);
      assert.ok(visible.length <= 6);
      assert.equal(new Set(visible).size, visible.length);
      assert.ok(frame.indices.every(index => visible.includes(index)));
      assert.ok(frame.indices.includes(i));
      assert.equal(frame.indices.length, count === 1 ? 1 : 2);
      if (count > 1) assert.equal(frame.indices[1], frame.indices[0] + 1);
      offset += 20000;
    }
    assert.equal(offset, cycleMilliseconds(session));
    assert.deepEqual(frameAt(session, 0, offset).indices, count === 1 ? [0] : [0, 1]);
  }
});

test('7개는 5+2 페이지로 나누고 각 페이지 안에서 두 기사를 재생한다', () => {
  const session = dual(7).sessions[0];
  session.items[0].durationSeconds = 60;
  session.items[5].durationSeconds = 30;
  session.items[6].durationSeconds = 5;
  assert.deepEqual(listPageIndices(session, 0), [0, 1, 2, 3, 4]);
  assert.deepEqual(listPageIndices(session, 4), [0, 1, 2, 3, 4]);
  assert.deepEqual(listPageIndices(session, 6), [5, 6]);
  assert.deepEqual(frameAt(session, 0, 80000).indices, [3, 4]);
  assert.equal(articleOffsetMilliseconds(session, 5), 100000);
  assert.equal(articleOffsetMilliseconds(session, 6), 100000);
  assert.deepEqual(frameAt(session, 0, 100000).indices, [5, 6]);
  assert.deepEqual(frameAt(session, 0, 129999).indices, [5, 6]);
  assert.deepEqual(frameAt(session, 0, 130000).indices, [0, 1]);
  assert.deepEqual(frameAt(session, 0, 130000).previousIndices, [5, 6]);
  assert.equal(cycleMilliseconds(session), 130000);
});

test('앞 페이지를 채우고 마지막 한 기사만 남으면 앞에서 하나를 옮긴다', () => {
  for (const [count, expected] of [[7, [5, 2]], [8, [6, 2]], [9, [6, 3]], [12, [6, 6]], [13, [6, 5, 2]], [19, [6, 6, 5, 2]]]) {
    for (const detailCount of [1, 2]) {
      const session = dual(count).sessions[0]; session.detailCount = detailCount;
      const pages = new Map();
      for (let i = 0; i < count; i++) {
        const page = listPageIndices(session, i);
        pages.set(page[0], page);
        const offset = articleOffsetMilliseconds(session, i);
        assert.ok(frameAt(session, 0, offset).indices.includes(i), `기사 ${i + 1} 미리보기`);
      }
      assert.deepEqual([...pages.values()].map(page => page.length), expected);
    }
  }
});

test('1~100개 목록은 단일·이중 상세 모두 기사 누락이나 다른 페이지 중복이 없다', () => {
  for (const detailCount of [1, 2]) for (let count = 1; count <= 100; count++) {
    const session = dual(count).sessions[0]; session.detailCount = detailCount;
    const pages = new Map();
    for (let i = 0; i < count; i++) {
      const indices = listPageIndices(session, i);
      assert.ok(indices.includes(i));
      assert.ok(indices.length <= 6);
      if (count > 6) assert.ok(indices.length >= 2);
      pages.set(indices[0], indices);
    }
    assert.deepEqual([...pages.values()].flat(), Array.from({ length: count }, (_, i) => i));
    assert.equal(pages.size, Math.ceil(count / 6));
    assert.deepEqual([...pages.keys()].map(start => Math.ceil(start / 6)), [...pages.keys()].map((_, i) => i));
  }
});

test('3대 편성은 호환 버전을 명시하고 기존 데이터와 함께 지원한다', () => {
  assert.equal(validateManifest(dual()).schemaVersion, 2);
  assert.equal(validateManifest(fixture()).schemaVersion, 1);
  const invalid = dual(); invalid.schemaVersion = 1;
  assert.throws(() => validateManifest(invalid), /schemaVersion 2/);
  invalid.schemaVersion = 2; invalid.sessions[0].detailCount = 3;
  assert.throws(() => validateManifest(invalid), /detailCount/);
  const base = { schemaVersion: 1, pollIntervalSeconds: 60, sessions: [{ ...fixture().sessions[0], newsletterId: 'newsletter-003', defaultDurationSeconds: 20 }] };
  const result = makeDisplayPlan(base, fixture(), [{ id: 'lobby-a', items: fixture().sessions[0].items.map(a => ({ articleId: a.id, durationSeconds: a.durationSeconds })) }], 2);
  assert.equal(result.configuration.schemaVersion, 2);
  assert.equal(result.configuration.sessions[0].detailCount, 2);
  assert.equal(result.preview.sessions[0].detailCount, 2);
  assert.deepEqual(assignMonitorPairs([1, 2, 3], ['lobby-a'], 2).map(a => a.role), ['list', 'detail', 'detail-secondary']);
  assert.throws(() => assignMonitorPairs([1, 2], ['lobby-a'], 2), /3대/);
});

test('3대 콘텐츠 갱신은 세 화면 모두 같은 반복 경계에서 적용된다', () => {
  const initial = dual(); const timeline = initialTimelines(initial);
  const epoch = timeline['lobby-a'].current.epoch;
  const next = dual(3); next.revision = 'c'.repeat(64);
  const scheduled = scheduleManifest(timeline, next, epoch + 21000)['lobby-a'];
  assert.equal(scheduled.pending.activateAt, epoch + 60000);
  assert.equal(playbackAt(scheduled, epoch + 59999).manifest.revision, initial.revision);
  const active = playbackAt(scheduled, epoch + 60000);
  assert.equal(active.manifest.revision, next.revision);
  assert.equal(active.epoch, epoch);
  assert.deepEqual(frameAt(active.manifest.sessions[0], active.epoch, epoch + 60000).indices, [1, 2]);
});
