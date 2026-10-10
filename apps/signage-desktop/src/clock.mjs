import { createSocket } from 'node:dgram';
import { randomBytes } from 'node:crypto';

const SERVER = 'time.cloudflare.com';
const NTP_EPOCH = 2208988800;

function timestamp(packet, offset) {
  let seconds = packet.readUInt32BE(offset) - NTP_EPOCH;
  if (seconds < 0) seconds += 2 ** 32; // NTP era rollover in 2036.
  return (seconds + packet.readUInt32BE(offset + 4) / 2 ** 32) * 1000;
}

export function parseTimeReply(packet, request, roundTripMs, receivedAt) {
  if (packet.length < 48 || packet.length > 512 || (packet[0] & 7) !== 4 || ![3, 4].includes((packet[0] >> 3) & 7)
    || packet[0] >> 6 === 3 || packet[1] < 1 || packet[1] > 15
    || !packet.subarray(24, 32).equals(request.subarray(40, 48))) throw new Error('시간 서버 응답 검증 실패');
  const received = timestamp(packet, 32);
  const sent = timestamp(packet, 40);
  const serverError = Math.max(0, packet.readInt32BE(4) / 65536 * 500) + packet.readUInt32BE(8) / 65536 * 1000;
  const travel = roundTripMs - (sent - received);
  if (!Number.isFinite(roundTripMs) || roundTripMs < 0 || roundTripMs > 1000 || sent < received
    || travel < -1 || serverError > 1000 || received < Date.UTC(2020, 0, 1) || sent > Date.UTC(2100, 0, 1)) throw new Error('시간 서버 응답 지연 또는 시각 오류');
  return { epochMs: sent + Math.max(0, travel) / 2, monotonicMs: receivedAt, uncertaintyMs: Math.max(0, travel) / 2 + serverError + 1 };
}

export function sampleNetworkTime({ host = SERVER, port = 123, timeoutMs = 1500 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = createSocket('udp4');
    const request = Buffer.alloc(48);
    request[0] = 0x23;
    // A fresh origin cookie rejects delayed replies from previous requests.
    randomBytes(8).copy(request, 40);
    let started = 0;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('시간 서버 연결 시간 초과 (UDP 123)')), timeoutMs);
    socket.on('error', error => finish(error));
    socket.on('message', packet => {
      const end = performance.now();
      try { finish(null, parseTimeReply(packet, request, end - started, end)); }
      catch (error) { finish(error); }
    });
    socket.connect(port, host, error => {
      if (settled) return;
      if (error) { finish(error); return; }
      started = performance.now();
      socket.send(request, error => { if (error) finish(error); });
    });
  });
}

export function createPlaybackClock({ sample = sampleNetworkTime, wallNow = Date.now, monotonic = () => performance.now() } = {}) {
  let epoch = wallNow();
  let origin = monotonic();
  let previous = origin;
  let correction = 0;
  let target = 0;
  let lastSync = null;
  let uncertainty = null;
  let error = '';
  let running;
  const now = () => {
    const time = monotonic();
    const step = Math.max(0, time - previous) * 0.1;
    correction += Math.max(-step, Math.min(step, target - correction));
    previous = time;
    return epoch + time - origin + correction;
  };
  return {
    now,
    get state() {
      now();
      return { server: SERVER, lastSync, uncertaintyMs: uncertainty === null ? null : Math.ceil(uncertainty + Math.abs(target - correction)), error, syncing: !!running };
    },
    sync: function sync({ reset = false } = {}) {
      if (running) return reset ? running.then(() => sync({ reset: true })) : running;
      running = (async () => {
        if (reset) { epoch = wallNow(); origin = previous = monotonic(); correction = target = 0; lastSync = null; uncertainty = null; }
        let best;
        let failure;
        for (let i = 0; i < 3; i++) {
          try {
            const value = await sample();
            if (!best || value.uncertaintyMs < best.uncertaintyMs) best = value;
          } catch (e) { failure = e; }
        }
        if (best) {
          now();
          target = best.epochMs - (epoch + best.monotonicMs - origin);
          if (lastSync === null) correction = target;
          lastSync = new Date(now()).toISOString();
          uncertainty = best.uncertaintyMs;
          error = '';
        } else error = failure instanceof Error ? failure.message : '시간 서버 연결 실패';
      })().finally(() => { running = undefined; });
      return running;
    },
  };
}
