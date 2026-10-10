import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture } from '../../../packages/signage-player/test/fixture.mjs';
import { initialTimelines } from '@kmucs/signage-player';
import { cacheAssets, assetName, digest, feedUrl, validateAssignments, validateTimelines, atomicJson, readJson, fetchManifest, pruneAssets } from '../src/storage.mjs';

test('HTTPS만 허용하고 개발 중 로컬 HTTP만 예외로 허용한다', () => {
  assert.equal(feedUrl('https://alumni.cs.kookmin.ac.kr/signage/feed.json').protocol, 'https:');
  assert.equal(feedUrl('http://localhost:4321/signage/feed.json', true).hostname, 'localhost');
  for (const url of ['http://example.com/a', 'file:///etc/passwd', 'https://a:b@example.com', 'http://localhost/a']) assert.throws(() => feedUrl(url));
});

test('4개 모니터의 2세션 배정과 중복·누락 배정을 검증한다', () => {
  const displays = [1, 2, 3, 4].map((id) => ({ id }));
  const assignments = [1, 2, 3, 4].map((displayId) => ({ displayId, sessionId: displayId <= 2 ? 'a' : 'b', role: displayId % 2 ? 'list' : 'detail' }));
  assert.equal(validateAssignments(assignments, displays, ['a', 'b']).length, 4);
  assert.throws(() => validateAssignments([assignments[0]], displays, ['a']));
  assert.throws(() => validateAssignments([assignments[0], assignments[0]], displays, ['a']));
  assert.throws(() => validateAssignments(assignments, displays.slice(1), ['a', 'b']));
  assert.deepEqual(validateAssignments([], displays, ['a']), []);
});

test('검증된 파일은 오프라인에서 재사용하고 손상된 새 파일은 채택하지 않는다', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'kmucs-cache-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const bytes = Buffer.from('asset version one');
  const manifest = fixture(); manifest.assets = [{ path: '/images/news.png', sha256: digest(bytes) }];
  let calls = 0;
  const fetcher = async () => { calls++; return new Response(bytes); };
  await cacheAssets(manifest, 'https://example.com/feed.json', directory, fetcher);
  await cacheAssets(manifest, 'https://example.com/feed.json', directory, async () => { throw new Error('offline'); });
  assert.equal(calls, 1);
  const next = structuredClone(manifest); next.assets[0].sha256 = digest('new version');
  await assert.rejects(cacheAssets(next, 'https://example.com/feed.json', directory, fetcher), /버전 불일치/);
  assert.equal((await readFile(join(directory, assetName(manifest.assets[0])))).toString(), bytes.toString());
  assert.equal((await readdir(directory)).length, 1);
});

test('캐시 정리는 활성·대기 버전 파일을 남긴다', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'kmucs-prune-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const m = fixture();
  const active = assetName(m.assets[0]); const obsolete = 'c'.repeat(64) + '.png';
  await writeFile(join(directory, active), 'keep'); await writeFile(join(directory, obsolete), 'remove');
  await writeFile(join(directory, obsolete + '.tmp'), 'partial');
  await pruneAssets(directory, [m]); assert.deepEqual(await readdir(directory), [active]);
});

test('원자 저장을 읽고 손상된 JSON과 타임라인을 거절한다', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'kmucs-state-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'state.json');
  assert.equal(await readJson(file, null), null);
  const timelines = initialTimelines(fixture());
  await atomicJson(file, timelines);
  assert.deepEqual(validateTimelines(await readJson(file)), timelines);
  timelines['lobby-a'].current.epoch = NaN;
  assert.throws(() => validateTimelines(timelines));
  await writeFile(file, '{'); await assert.rejects(readJson(file, null));
});

test('잘못된 버전과 실패 응답은 원격에서 받아도 거절한다', async () => {
  const m = fixture();
  assert.equal((await fetchManifest('https://example.com', async () => Response.json(m))).revision, m.revision);
  m.schemaVersion = 99;
  await assert.rejects(fetchManifest('https://example.com', async () => Response.json(m)), /schemaVersion/);
  await assert.rejects(fetchManifest('https://example.com', async () => new Response('failure', { status: 500 })), /HTTP 500/);
  await assert.rejects(fetchManifest('https://example.com', async () => new Response('{}', { headers: { 'content-length': String(6 * 1024 * 1024) } })), /용량 제한/);
});

test('거절한 응답은 헤더 검사 단계에서도 스트림을 취소한다', async () => {
  for (const options of [{ status: 500 }, { headers: { 'content-length': String(6 * 1024 * 1024) } }]) {
    let cancelled = false;
    const body = new ReadableStream({ cancel() { cancelled = true; } });
    await assert.rejects(fetchManifest('https://example.com', async () => new Response(body, options)));
    assert.equal(cancelled, true);
  }
});

test('3대 세션은 목록·상세 1·상세 2 배정을 요구하고 2대 설정과 혼동하지 않는다', () => {
  const displays = [1, 2, 3].map(id => ({ id }));
  const assignments = ['list', 'detail', 'detail-secondary'].map((role, i) => ({ displayId: i + 1, sessionId: 'a', role }));
  assert.equal(validateAssignments(assignments, displays, ['a'], { a: 2 }).length, 3);
  assert.equal(validateAssignments(assignments, displays, ['a']).length, 3);
  assert.throws(() => validateAssignments(assignments.slice(0, 2), displays, ['a'], { a: 2 }), /상세 2/);
  assert.throws(() => validateAssignments(assignments, displays, ['a'], { a: 1 }), /3대 편성/);
  assert.throws(() => validateAssignments([assignments[0], assignments[2]], displays, ['a']), /모두 배정/);
});
