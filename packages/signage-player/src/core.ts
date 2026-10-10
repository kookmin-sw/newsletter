export function issueLabel(issue: string): string {
  const value = issue.trim();
  return /^\d+$/.test(value) ? `Vol. ${value}` : value;
}

export interface DisplayArticle {
  id: string;
  title: string;
  excerpt: string;
  summary: string[];
  author: string;
  category: string;
  tags: string[];
  image?: string;
  url: string;
  qr: string;
  durationSeconds: number;
}

export interface DisplaySession {
  id: string;
  title: string;
  issue: string;
  dateLabel: string;
  startsAt: string;
  transitionMilliseconds: number;
  detailCount?: 1 | 2;
  items: DisplayArticle[];
}

export interface Manifest {
  schemaVersion: 1 | 2 | 3;
  revision: string;
  pollIntervalSeconds: number;
  branding: { siteUrl: string; logo: string; fontRegular: string; fontBold: string; qr: string };
  assets: { path: string; sha256: string }[];
  sessions: DisplaySession[];
}

export interface Playback {
  manifest: Manifest;
  sessionId: string;
  epoch: number;
}

export interface Timeline {
  current: Playback;
  pending?: { playback: Playback; activateAt: number };
}

function fail(message: string): never { throw new Error(`사이니지 설정: ${message}`); }
function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name}은 객체여야 합니다.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, name: string, max: number): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${name}: 1~${max}자 필요`);
}
function number(value: unknown, name: string, min: number, max: number): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${name}: ${min}~${max} 범위 필요`);
}
function array(value: unknown, name: string, min: number, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${name}: ${min}~${max}개 필요`);
}
function id(value: unknown, name: string): asserts value is string {
  text(value, name, 100);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) fail(`${name}: 영문 소문자, 숫자, 하이픈만 허용`);
}
function https(value: unknown, name: string): asserts value is string {
  text(value, name, 2000);
  let url: URL;
  try { url = new URL(value); } catch { return fail(`${name}: 올바른 URL 필요`); }
  if (url.protocol !== 'https:' || url.username || url.password) fail(`${name}: 인증 정보 없는 HTTPS URL 필요`);
}
function qr(value: unknown): void {
  text(value, 'QR', 100000);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)) fail('QR은 PNG 데이터여야 합니다.');
}

export function validateManifest(value: unknown): Manifest {
  const m = object(value, 'manifest');
  if (m.schemaVersion !== 1 && m.schemaVersion !== 2 && m.schemaVersion !== 3) fail('지원하지 않는 schemaVersion입니다. 앱 업데이트가 필요합니다.');
  if (typeof m.revision !== 'string' || !/^[a-f0-9]{64}$/.test(m.revision)) fail('revision 형식 오류');
  number(m.pollIntervalSeconds, 'pollIntervalSeconds', 15, 3600);
  array(m.assets, 'assets', 3, 500);
  const paths = new Set<string>();
  for (const raw of m.assets) {
    const a = object(raw, 'asset');
    text(a.path, 'asset.path', 500);
    if (!/^\/(images|fonts)\/[a-zA-Z0-9_./-]+$/.test(a.path) || a.path.includes('..') || a.path.includes('//')) fail('허용하지 않는 asset 경로');
    if (!/\.(png|jpe?g|webp|svg|ttf|woff2?)$/i.test(a.path)) fail('허용하지 않는 asset 확장자');
    if (paths.has(a.path)) fail(`중복 asset: ${a.path}`);
    paths.add(a.path);
    if (typeof a.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(a.sha256)) fail('asset 해시 오류');
  }
  const branding = object(m.branding, 'branding');
  https(branding.siteUrl, 'siteUrl');
  qr(branding.qr);
  for (const key of ['logo', 'fontRegular', 'fontBold']) {
    if (!paths.has(branding[key] as string)) fail(`branding.${key} asset 누락`);
  }
  array(m.sessions, 'sessions', 1, 20);
  const ids = new Set<string>();
  for (const raw of m.sessions) {
    const s = object(raw, 'session');
    id(s.id, 'session.id');
    if (ids.has(s.id)) fail(`중복 session: ${s.id}`);
    ids.add(s.id);
    text(s.title, 'session.title', 60);
    text(s.issue, 'session.issue', 20);
    text(s.dateLabel, 'session.dateLabel', 30);
    text(s.startsAt, 'startsAt', 40);
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(s.startsAt) || !Number.isFinite(Date.parse(s.startsAt))) fail('startsAt에 시간대가 포함된 ISO 시각 필요');
    if (s.detailCount !== undefined && s.detailCount !== 1 && s.detailCount !== 2) fail('detailCount는 1 또는 2여야 합니다.');
    if (s.detailCount === 2 && m.schemaVersion === 1) fail('상세 화면 2대는 schemaVersion 2 이상과 앱 1.1.0 이상이 필요합니다.');
    number(s.transitionMilliseconds, 'transitionMilliseconds', 0, 2000);
    array(s.items, 'items', 1, 100);
    const articleIds = new Set<string>();
    for (const rawItem of s.items) {
      const a = object(rawItem, 'article');
      id(a.id, 'article.id');
      if (articleIds.has(a.id)) fail(`중복 article: ${a.id}`);
      articleIds.add(a.id);
      text(a.title, `${a.id}.title`, 140);
      text(a.excerpt, `${a.id}.excerpt`, 180);
      text(a.author, 'author', 80);
      text(a.category, 'category', 20);
      array(a.summary, `${a.id}.summary`, 1, 4);
      a.summary.forEach((p) => text(p, `${a.id}.summary`, m.schemaVersion === 3 ? 800 : 180));
      const summaryLimit = m.schemaVersion === 3 ? 800 : 480;
      if ((a.summary as string[]).join('').length > summaryLimit) fail(`${a.id}.summary: 합계 ${summaryLimit}자 이하 필요`);
      array(a.tags, 'tags', 0, 3);
      a.tags.forEach((t) => text(t, 'tag', 24));
      https(a.url, 'article.url');
      qr(a.qr);
      if (a.image !== undefined && !paths.has(a.image as string)) fail(`${a.id}.image asset 누락`);
      number(a.durationSeconds, 'durationSeconds', 5, 600);
      if (s.transitionMilliseconds >= a.durationSeconds * 1000) fail('전환 시간은 재생 시간보다 짧아야 합니다.');
    }
  }
  return value as Manifest;
}

export function getSession(playback: Playback): DisplaySession {
  const session = playback.manifest.sessions.find((s) => s.id === playback.sessionId);
  if (!session) fail(`세션을 찾을 수 없습니다: ${playback.sessionId}`);
  return session;
}

export function stepIndices(session: DisplaySession, index: number): number[] {
  if (session.detailCount !== 2 || session.items.length === 1) return [index];
  return index + 1 < session.items.length ? [index, index + 1] : [index - 1, index];
}

export function stepDurationSeconds(session: DisplaySession, index: number): number {
  return Math.max(...stepIndices(session, index).map(i => session.items[i].durationSeconds));
}

export function articleOffsetMilliseconds(session: DisplaySession, index: number): number {
  const stride = session.detailCount ?? 1;
  const target = Math.floor(index / stride) * stride;
  let total = 0;
  for (let i = 0; i < target; i += stride) total += stepDurationSeconds(session, i) * 1000;
  return total;
}

export function listPageIndices(session: DisplaySession, index: number): number[] {
  const count = session.items.length;
  let start = Math.floor(index / 6) * 6;
  let end = Math.min(start + 6, count);
  // A final single article becomes a 4+3 split, keeping the final pair on one page.
  if (count > 6 && count % 6 === 1) {
    const lastStart = count - 3;
    if (index >= lastStart) { start = lastStart; end = count; }
    else if (end > lastStart) end = lastStart;
  }
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function cycleMilliseconds(session: DisplaySession): number {
  let total = 0;
  for (let i = 0; i < session.items.length; i += session.detailCount ?? 1) total += stepDurationSeconds(session, i) * 1000;
  return total;
}

export function frameAt(session: DisplaySession, epoch: number, now: number) {
  if (!session.items.length) fail('빈 재생 목록');
  const stride = session.detailCount ?? 1;
  const cycle = cycleMilliseconds(session);
  const elapsed = Math.max(0, now - epoch);
  const position = elapsed % cycle;
  let offset = 0;
  let index = 0;
  for (; index + stride < session.items.length; index += stride) {
    const duration = stepDurationSeconds(session, index) * 1000;
    if (position < offset + duration) break;
    offset += duration;
  }
  const previousIndex = index === 0 ? Math.floor((session.items.length - 1) / stride) * stride : index - stride;
  const duration = stepDurationSeconds(session, index) * 1000;
  const within = position - offset;
  return {
    index, previousIndex, indices: stepIndices(session, index), previousIndices: stepIndices(session, previousIndex),
    progress: within / duration,
    transition: session.transitionMilliseconds === 0 ? 1 : Math.min(1, within / session.transitionMilliseconds),
    remainingSeconds: Math.ceil((duration - within) / 1000),
    waiting: now < epoch,
    first: elapsed < session.transitionMilliseconds,
    cycle: Math.floor(elapsed / cycle),
  };
}

export function nextCycleAt(playback: Playback, after: number): number {
  if (after < playback.epoch) return playback.epoch;
  const cycle = cycleMilliseconds(getSession(playback));
  return playback.epoch + (Math.floor((after - playback.epoch) / cycle) + 1) * cycle;
}

export function playbackAt(timeline: Timeline, now: number): Playback {
  return timeline.pending && now >= timeline.pending.activateAt ? timeline.pending.playback : timeline.current;
}

export function initialTimelines(manifest: Manifest): Record<string, Timeline> {
  return Object.fromEntries(manifest.sessions.map((s) => [s.id, {
    current: { manifest, sessionId: s.id, epoch: Date.parse(s.startsAt) },
  }]));
}

export function scheduleManifest(timelines: Record<string, Timeline>, manifest: Manifest, now: number, retainedSessionIds: string[] = []) {
  const next = Object.fromEntries(Object.entries(timelines).filter(([id]) => retainedSessionIds.includes(id)));
  for (const session of manifest.sessions) {
    const existing = Object.hasOwn(timelines, session.id) ? timelines[session.id] : undefined;
    if (!existing) {
      next[session.id] = initialTimelines(manifest)[session.id];
      continue;
    }
    const current = playbackAt(existing, now);
    const activateAt = nextCycleAt(current, now + 2000);
    const epoch = session.startsAt === getSession(current).startsAt ? activateAt : Date.parse(session.startsAt);
    next[session.id] = { current, pending: { activateAt, playback: { manifest, sessionId: session.id, epoch } } };
  }
  // Only assigned removed sessions retain their last playlist.
  return next;
}
