import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocket } from 'node:dgram';
import { createPlaybackClock, parseTimeReply, sampleNetworkTime } from '../src/clock.mjs';

const epoch = Date.UTC(2026, 9, 10);
function stamp(packet, offset, ms) {
  const seconds = ms / 1000 + 2208988800;
  packet.writeUInt32BE(Math.floor(seconds) % 2 ** 32, offset);
  packet.writeUInt32BE(Math.floor((seconds % 1) * 2 ** 32), offset + 4);
}
function reply(request, time = epoch) {
  const packet = Buffer.alloc(48); packet[0] = 0x24; packet[1] = 2;
  request.copy(packet, 24, 40, 48);
  stamp(packet, 32, time); stamp(packet, 40, time + 10);
  return packet;
}

test('NTP 응답의 서버 처리 시간을 빼고 왕복 지연과 2036년 이후 시각을 처리한다', () => {
  const request = Buffer.alloc(48, 7);
  const result = parseTimeReply(reply(request), request, 30, 123);
  assert.ok(Math.abs(result.epochMs - (epoch + 20)) < 0.001);
  assert.equal(result.monotonicMs, 123);
  assert.ok(result.uncertaintyMs <= 12);
  const future = Date.UTC(2037, 0, 1);
  assert.ok(Math.abs(parseTimeReply(reply(request, future), request, 30, 123).epochMs - future - 20) < 0.001);
  const invalid = [
    p => p.subarray(0, 47), p => { p[0] = 0xe4; return p; },
    p => { p[0] = 0x23; return p; }, p => { p[1] = 0; return p; },
    p => { p[24] ^= 1; return p; }, p => { p.writeUInt32BE(655360, 8); return p; },
    p => { stamp(p, 40, epoch - 1); return p; },
  ];
  for (const mutate of invalid) assert.throws(() => parseTimeReply(mutate(reply(request)), request, 30, 123));
  assert.throws(() => parseTimeReply(reply(request), request, 1001, 123));
});

test('서로 2분 어긋난 PC가 공용 시각으로 맞고 재보정 때 시계가 역행하지 않는다', async () => {
  let mono = 1000;
  let drift = 0;
  const sample = async () => ({ epochMs: epoch + mono + drift, monotonicMs: mono, uncertaintyMs: 2 });
  const a = createPlaybackClock({ sample, wallNow: () => epoch + mono - 60000, monotonic: () => mono });
  const b = createPlaybackClock({ sample, wallNow: () => epoch + mono + 60000, monotonic: () => mono });
  await a.sync(); await b.sync();
  assert.equal(a.now(), b.now()); assert.equal(a.now(), epoch + mono);
  drift = -100;
  await a.sync();
  let previous = a.now();
  for (let i = 0; i < 100; i++) { mono += 10; assert.ok(a.now() >= previous); previous = a.now(); }
  assert.equal(a.now(), epoch + mono - 100);
  assert.equal(a.state.uncertaintyMs, 2);
});

test('최소 오차 샘플을 선택하고 실패 시 마지막 시계를 유지하며 중복 요청을 합친다', async () => {
  let mono = 0; let calls = 0; let offline = false;
  const clock = createPlaybackClock({ wallNow: () => epoch, monotonic: () => mono, sample: async () => {
    if (offline) throw new Error('offline');
    const uncertaintyMs = [20, 2, 10][calls++ % 3];
    return { epochMs: epoch + mono + 100, monotonicMs: mono, uncertaintyMs };
  } });
  const pending = clock.sync(); assert.equal(clock.sync(), pending); await pending;
  assert.equal(calls, 3); assert.equal(clock.state.uncertaintyMs, 2);
  const lastSync = clock.state.lastSync;
  offline = true; mono += 5000; await clock.sync();
  assert.equal(clock.now(), epoch + mono + 100);
  assert.equal(clock.state.lastSync, lastSync); assert.equal(clock.state.error, 'offline');
  await clock.sync({ reset: true });
  assert.equal(clock.now(), epoch); assert.equal(clock.state.lastSync, null);
  offline = false;
  for (let i = 0; i < 1000; i++) { mono += 10; await clock.sync(); }
  assert.equal(clock.state.error, ''); assert.equal(clock.state.syncing, false);
});

test('보정 중 절전 복귀 요청도 기존 요청 후 기준 시각을 다시 잡는다', async () => {
  let release;
  let first = true;
  let wall = epoch;
  const clock = createPlaybackClock({ wallNow: () => wall, monotonic: () => 0, sample: async () => {
    if (first) { first = false; await new Promise(resolve => { release = resolve; }); }
    throw new Error('offline');
  } });
  const pending = clock.sync();
  wall += 60000;
  const resumed = clock.sync({ reset: true });
  release();
  await pending; await resumed;
  assert.equal(clock.now(), wall);
  assert.equal(clock.state.syncing, false);
});

test('실제 UDP 요청·응답, 오류·타임아웃을 처리하고 매 요청 소켓을 닫는다', async (t) => {
  const server = createSocket('udp4');
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.bind(0, '127.0.0.1', resolve);
  });
  t.after(() => server.close());
  let invalid = false; let silence = false;
  server.on('message', (request, remote) => {
    if (silence) return;
    const packet = reply(request);
    stamp(packet, 40, epoch);
    if (invalid) packet[24] ^= 1;
    server.send(packet, remote.port, remote.address);
  });
  const options = { host: '127.0.0.1', port: server.address().port, timeoutMs: 100 };
  for (let i = 0; i < 30; i++) assert.ok(Number.isFinite((await sampleNetworkTime(options)).epochMs));
  invalid = true; await assert.rejects(sampleNetworkTime(options), /검증/);
  silence = true; await assert.rejects(sampleNetworkTime(options), /시간 초과/);
  await assert.rejects(sampleNetworkTime({ host: 'invalid.invalid', timeoutMs: 100 }));
});
