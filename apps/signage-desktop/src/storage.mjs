import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { validateManifest, getSession } from '@kmucs/signage-player';

export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const assetName = (asset) => asset.sha256 + extname(asset.path).toLowerCase();

export async function atomicJson(file, value) {
  const temp = `${file}.tmp`;
  await writeFile(temp, JSON.stringify(value), 'utf8');
  await rename(temp, file);
}

export async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

export function feedUrl(value, development = false) {
  const url = new URL(value);
  if (url.username || url.password || url.hash) throw new Error('설정 URL에 인증 정보나 fragment를 넣을 수 없습니다.');
  const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(development && localhost && url.protocol === 'http:')) throw new Error('HTTPS 설정 URL이 필요합니다.');
  return url;
}

async function download(url, limit, fetcher) {
  const response = await fetcher(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    if (!response.ok || !response.body) throw new Error(`수신 실패: HTTP ${response.status} (${url})`);
    throw new Error(`다운로드 용량 제한 초과 (${limit / 1024 / 1024}MiB): ${url}`);
  }
  const chunks = [];
  let length = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error(`다운로드 용량 제한 초과 (${limit / 1024 / 1024}MiB): ${url}`);
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}

export async function fetchManifest(url, fetcher = fetch) {
  return validateManifest(JSON.parse((await download(url, 5 * 1024 * 1024, fetcher)).toString('utf8')));
}

export async function cacheAssets(manifest, source, directory, fetcher = fetch) {
  await mkdir(directory, { recursive: true });
  // Hashes bind the manifest to one exact set of files, including when a deployment is in flight.
  for (const asset of manifest.assets) {
    const file = join(directory, assetName(asset));
    try { if (digest(await readFile(file)) === asset.sha256) continue; }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    const url = new URL(asset.path, source);
    url.searchParams.set('v', asset.sha256);
    const data = await download(url, 25 * 1024 * 1024, fetcher);
    if (digest(data) !== asset.sha256) throw new Error(`이미지 또는 폰트 버전 불일치: ${asset.path}`);
    await writeFile(`${file}.tmp`, data);
    await rename(`${file}.tmp`, file);
  }
}

export function validateTimelines(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('저장된 타임라인 형식 오류');
  for (const [id, timeline] of Object.entries(value)) {
    for (const playback of [timeline.current, timeline.pending?.playback].filter(Boolean)) {
      validateManifest(playback.manifest);
      if (playback.sessionId !== id || !Number.isFinite(playback.epoch)) throw new Error('저장된 세션 시각 오류');
      getSession(playback);
    }
    if (!timeline.current || (timeline.pending && !Number.isFinite(timeline.pending.activateAt))) throw new Error('저장된 타임라인 누락');
  }
  return value;
}

export async function pruneAssets(directory, manifests) {
  const keep = new Set(manifests.flatMap((m) => m.assets.map(assetName)));
  for (const name of await readdir(directory)) {
    if (/^[a-f0-9]{64}\.[a-z0-9]+(\.tmp)?$/.test(name) && !keep.has(name)) await rm(join(directory, name));
  }
}

export function validateAssignments(assignments, displays, sessions, detailCounts = {}) {
  if (!Array.isArray(assignments) || assignments.length > displays.length) throw new Error('모니터 설정 형식 오류');
  const seen = new Set();
  const roles = new Map();
  for (const row of assignments) {
    if (!row || !Number.isInteger(row.displayId) || !displays.some((d) => d.id === row.displayId) || seen.has(row.displayId)) throw new Error('모니터가 없거나 중복 배정됐습니다.');
    if (!sessions.includes(row.sessionId) || !['list', 'detail', 'detail-secondary'].includes(row.role)) throw new Error('세션 또는 화면 역할 오류');
    seen.add(row.displayId);
    const set = roles.get(row.sessionId) ?? new Set();
    set.add(row.role); roles.set(row.sessionId, set);
  }
  for (const [id, set] of roles) {
    if (detailCounts[id] === 1 && set.has('detail-secondary')) throw new Error('상세 2를 사용하려면 사이트에서 3대 편성을 적용하세요.');
  }
  return assignments;
}
