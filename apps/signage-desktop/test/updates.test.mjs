import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createAppUpdates } from '../src/updates.mjs';

function fixture() {
  const updater = new EventEmitter();
  let checks = 0;
  let downloads = 0;
  const installs = [];
  updater.checkForUpdates = async () => {
    checks++;
    updater.emit('checking-for-update');
    updater.emit('update-available', { version: '1.3.1' });
  };
  updater.downloadUpdate = async () => {
    downloads++;
    updater.emit('download-progress', { percent: 42.5 });
    updater.emit('update-downloaded', { version: '1.3.1' });
  };
  updater.quitAndInstall = (...args) => installs.push(args);
  const states = [];
  const updates = createAppUpdates(updater, () => states.push({ ...updates.state }));
  return { updater, updates, states, installs, get checks() { return checks; }, get downloads() { return downloads; } };
}

test('버전 확인은 다운로드나 설치를 시작하지 않고 설치는 명시적으로만 실행한다', async () => {
  const f = fixture();
  assert.equal(f.updater.autoDownload, false);
  assert.equal(f.updater.autoInstallOnAppQuit, false);
  assert.equal(f.updater.allowDowngrade, false);
  assert.equal(f.updater.allowPrerelease, false);
  assert.throws(() => f.updates.install(), /완료되지/);
  await assert.rejects(f.updates.download(), /먼저/);
  await f.updates.check();
  assert.equal(f.updates.state.status, 'available');
  assert.equal(f.downloads, 0);
  assert.deepEqual(f.installs, []);
  await f.updates.download();
  assert.equal(f.updates.state.status, 'ready');
  assert.equal(f.updates.state.percent, 100);
  assert.ok(f.states.some(s => s.status === 'downloading' && s.percent === 42));
  await f.updates.check();
  assert.equal(f.checks, 1, '설치 대기 파일을 주기 확인으로 덮어쓰지 않는다.');
  assert.deepEqual(f.installs, []);
  f.updates.install();
  assert.deepEqual(f.installs, [[false, true]]);
  assert.throws(() => f.updates.install(), /완료되지/);
});

test('중복 확인과 다운로드를 막고 네트워크 실패 후 다시 시도할 수 있다', async () => {
  const f = fixture();
  let finish;
  f.updater.checkForUpdates = () => new Promise(resolve => { finish = resolve; });
  const pending = f.updates.check();
  await f.updates.check();
  await assert.rejects(f.updates.download());
  finish(); await pending;
  f.updater.checkForUpdates = async () => { throw new Error('오프라인'); };
  await f.updates.check();
  assert.equal(f.updates.state.error, '오프라인');
  f.updater.checkForUpdates = async () => f.updater.emit('update-available', { version: '1.3.1' });
  await f.updates.check();
  f.updater.downloadUpdate = () => new Promise(resolve => { finish = resolve; });
  const downloading = f.updates.download();
  await assert.rejects(f.updates.download());
  await f.updates.check();
  finish(); await downloading;
  f.updater.emit('error', new Error('SHA-512 검증 실패'));
  assert.equal(f.updates.state.status, 'error');
  assert.throws(() => f.updates.install());
  assert.deepEqual(f.installs, []);
  await f.updates.check();
  assert.equal(f.updates.state.status, 'available');
  f.updater.downloadUpdate = async () => { throw new Error('연결 끊김'); };
  await f.updates.download();
  assert.equal(f.updates.state.error, '연결 끊김');
});

test('반복 확인으로 이벤트 리스너가 쌓이지 않고 최신·오류 상태를 알린다', async () => {
  const f = fixture();
  const listenerCount = () => f.updater.eventNames().reduce((sum, name) => sum + f.updater.listenerCount(name), 0);
  const baseline = listenerCount();
  f.updater.checkForUpdates = async () => f.updater.emit('update-not-available');
  for (let i = 0; i < 1000; i++) await f.updates.check();
  assert.equal(listenerCount(), baseline);
  assert.equal(f.updates.state.status, 'current');
  assert.equal(f.updates.state.version, null);
  f.updater.emit('download-progress', { percent: NaN });
  assert.equal(f.updates.state.percent, 0);
  f.updater.emit('update-downloaded', { version: '1.3.1' });
  f.updater.quitAndInstall = () => { throw new Error('설치 프로그램 실행 실패'); };
  f.updates.install();
  assert.equal(f.updates.state.status, 'error');
  assert.equal(f.updates.state.error, '설치 프로그램 실행 실패');
});
