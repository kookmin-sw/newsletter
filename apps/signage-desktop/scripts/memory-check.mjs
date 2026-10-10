import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdtemp, mkdir, readdir, appendFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { digest } from '../src/storage.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : Number(process.argv[index + 1]);
  assert.ok(Number.isFinite(value) && value >= 0, `${name}: 0 이상의 숫자 필요`);
  return value;
};
const updates = option('--updates', 20);
const idleMinutes = option('--idle-minutes', 0);
assert.ok(Number.isInteger(updates) && updates >= 2, '--updates: 2 이상의 정수 필요');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = await mkdtemp(join(tmpdir(), 'kmucs-memory-'));
const report = resolve(root, 'apps/signage-desktop/release/memory-check.jsonl');
await mkdir(dirname(report), { recursive: true });
await writeFile(report, '');
const output = async (value) => { const line = JSON.stringify(value); console.log(line); await appendFile(report, line + '\n'); };
const base = JSON.parse(await readFile(join(root, 'dist/signage/feed.json'), 'utf8'));
base.sessions = [base.sessions[0]];
base.sessions[0].items = base.sessions[0].items.slice(0, 2).map((item) => ({ ...item, durationSeconds: 5 }));
base.sessions[0].startsAt = new Date().toISOString();
// Keep the production validation limits, with manual refreshes driving test updates.
base.pollIntervalSeconds = 300;
let artwork;
let feed;
function version(index) {
  feed = structuredClone(base);
  feed.revision = digest(String(index));
  artwork = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="600"><rect width="1080" height="600" fill="#0758b8"/><text x="50" y="300" fill="white" font-size="80">${index}</text></svg>`);
  feed.assets.push({ path: '/images/memory-check.svg', sha256: digest(artwork) });
  feed.sessions[0].items[1].image = '/images/memory-check.svg';
  feed.sessions.push({ ...structuredClone(feed.sessions[0]), id: `unused-${index}` });
}
version(0);
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/signage/feed.json') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(feed)); }
    else if (path === '/images/memory-check.svg') { response.setHeader('Content-Type', 'image/svg+xml'); response.end(artwork); }
    else response.end(await readFile(join(root, 'public', path)));
  } catch { response.statusCode = 404; response.end(); }
});
let app;
const started = Date.now();
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  app = await electron.launch({ executablePath: require('electron'), args: [join(root, 'apps/signage-desktop'), '--dev', '--demo'], env: { ...process.env, SIGNAGE_FEED_URL: `http://127.0.0.1:${server.address().port}/signage/feed.json`, SIGNAGE_USER_DATA_DIR: data } });
  const errors = [];
  app.on('window', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  const setup = await app.firstWindow();
  await setup.waitForSelector('.setup');
  let pages;
  for (let i = 0; i < 150; i++) { pages = app.windows().filter((p) => p.url().includes('player=1')); if (pages.length === 2) break; await sleep(100); }
  assert.equal(pages.length, 2);
  for (const page of pages) await page.waitForSelector('.sg-stage');
  const clients = await Promise.all(pages.map((p) => p.context().newCDPSession(p)));
  let baseline;
  const measure = async (label) => {
    const renderers = [];
    for (let i = 0; i < pages.length; i++) {
      await clients[i].send('HeapProfiler.collectGarbage');
      const heap = await clients[i].send('Runtime.getHeapUsage');
      const dom = await clients[i].send('Memory.getDOMCounters');
      const fonts = await pages[i].evaluate(() => document.fonts.size);
      renderers.push({ fonts, heapMiB: +(heap.usedSize / 1048576).toFixed(2), ...dom });
    }
    const host = await app.evaluate(({ app, BrowserWindow, ipcMain, screen }) => ({
      memory: process.memoryUsage(),
      processes: app.getAppMetrics().map(({ type, memory }) => ({ type, ...memory })),
      windows: BrowserWindow.getAllWindows().length,
      screenListeners: screen.eventNames().reduce((n, e) => n + screen.listenerCount(e), 0),
      ipcListeners: ipcMain.eventNames().reduce((n, e) => n + ipcMain.listenerCount(e), 0),
    }));
    const cacheFiles = (await readdir(join(data, 'assets'))).length;
    const sample = { label, elapsedSeconds: +((Date.now() - started) / 1000).toFixed(1), renderers, host, cacheFiles };
    await output(sample);
    assert.equal(host.windows, 3);
    assert.ok(cacheFiles <= feed.assets.length, '지난 버전의 디스크 캐시가 남았습니다.');
    for (const r of renderers) assert.equal(r.fonts, 2, '지난 버전의 글꼴이 남았습니다.');
    if (baseline) {
      for (let i = 0; i < renderers.length; i++) {
        assert.ok(renderers[i].heapMiB <= baseline.renderers[i].heapMiB + 8, 'GC 후 JS 힙이 8MiB 이상 증가했습니다.');
        assert.ok(renderers[i].nodes <= baseline.renderers[i].nodes + 30, 'DOM 노드가 누적되었습니다.');
        assert.ok(renderers[i].jsEventListeners <= baseline.renderers[i].jsEventListeners + 10, '이벤트 리스너가 누적되었습니다.');
      }
      const workingSet = (sample) => sample.host.processes.reduce((sum, process) => sum + process.workingSetSize, 0);
      assert.ok(workingSet(sample) <= workingSet(baseline) + 256 * 1024, '전체 작업 집합이 워밍업 대비 256MiB 이상 증가했습니다.');
      assert.equal(host.screenListeners, baseline.host.screenListeners);
      assert.equal(host.ipcListeners, baseline.host.ipcListeners);
    }
    return sample;
  };
  for (let index = 1; index <= updates; index++) {
    version(index);
    await setup.evaluate(() => window.signage.refresh());
    for (const page of pages) await page.waitForFunction((revision) => document.querySelector('.sg-stage')?.dataset.revision === revision, feed.revision, { timeout: 45000 });
    // Allow host cleanup and measure outside the outgoing/incoming animation overlap.
    await sleep(1800);
    const state = await setup.evaluate(() => window.signage.snapshot());
    assert.equal(state.lastError, '');
    assert.equal(Object.keys(state.timelines).length, 2, '삭제한 미배정 세션이 누적되었습니다.');
    const sample = await measure(`update-${index}`);
    if (index === 2) baseline = sample;
  }
  const idleEnd = Date.now() + idleMinutes * 60000;
  while (Date.now() < idleEnd) { await sleep(Math.min(60000, idleEnd - Date.now())); await measure('idle'); }
  assert.deepEqual(errors, []);
  await output({ result: 'PASS', updates, idleMinutes, elapsedSeconds: +((Date.now() - started) / 1000).toFixed(1), report });
} finally {
  if (app) await app.close();
  await new Promise((r) => server.close(r));
  await rm(data, { recursive: true, force: true });
}
