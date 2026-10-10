import { validateManifest, type Manifest } from './core.js';

export interface SignageConfiguration {
  schemaVersion: 1 | 2 | 3;
  pollIntervalSeconds: number;
  sessions: {
    id: string; newsletterId: string; title: string; issue: string; dateLabel: string;
    startsAt: string; defaultDurationSeconds: number; transitionMilliseconds: number;
    detailCount?: 1 | 2;
    items?: { articleId: string; durationSeconds?: number }[];
  }[];
}
export interface PlaylistGroup {
  id: string;
  items: { articleId: string; durationSeconds: number }[];
}

export function splitPlaylist(items: PlaylistGroup['items']): [PlaylistGroup['items'], PlaylistGroup['items']] {
  const middle = Math.ceil(items.length / 2);
  return [items.slice(0, middle), items.slice(middle)];
}

export function makeDisplayPlan(base: SignageConfiguration, catalog: Manifest, groups: PlaylistGroup[], detailCount: 1 | 2 = 1, summaries: Record<string, Record<string, string[]>> = {}) {
  if (groups.length < 1 || groups.length > 2) throw new Error('2대, 3대 또는 4대 구성을 선택하세요.');
  if (detailCount === 2 && groups.length !== 1) throw new Error('3대 구성은 하나의 세션을 사용합니다.');
  const articles = new Map(catalog.sessions.flatMap(s => s.items).map(a => [a.id, a]));
  const sessions = groups.map(group => {
    const template = base.sessions.find(s => s.id === group.id) ?? base.sessions[0];
    return { ...template, id: group.id, detailCount, items: group.items.map(item => ({ ...item })) };
  });
  // The wizard edits the first two pairs; unrelated sessions must survive export.
  const configuration: SignageConfiguration = { ...base, sessions: [...sessions, ...base.sessions.slice(2)] };
  configuration.schemaVersion = base.schemaVersion === 3 || catalog.schemaVersion === 3 ? 3 : configuration.sessions.some(s => s.detailCount === 2) ? 2 : 1;
  const preview = validateManifest({ ...catalog, schemaVersion: configuration.schemaVersion, sessions: sessions.map(session => ({
    id: session.id, title: session.title, issue: session.issue, dateLabel: session.dateLabel,
    startsAt: session.startsAt, transitionMilliseconds: session.transitionMilliseconds, detailCount: session.detailCount,
    items: session.items.map(item => {
      const article = articles.get(item.articleId);
      if (!article) throw new Error(`기사를 사용할 수 없습니다: ${item.articleId}`);
      return { ...article, summary: summaries[session.newsletterId]?.[article.id] ?? article.summary, durationSeconds: item.durationSeconds };
    }),
  })) });
  const paths = new Set([preview.branding.logo, preview.branding.fontRegular, preview.branding.fontBold,
    ...preview.sessions.flatMap(s => s.items.flatMap(a => a.image ? [a.image] : []))]);
  preview.assets = preview.assets.filter(a => paths.has(a.path));
  return { configuration, preview };
}

export function assignMonitorPairs(displayIds: number[], sessionIds: string[], detailCount: 1 | 2 = 1) {
  if (detailCount === 2 && sessionIds.length !== 1) throw new Error('3대 구성은 하나의 세션을 선택하세요.');
  const screens = detailCount + 1;
  if (sessionIds.length < 1 || sessionIds.length > 2 || new Set(sessionIds).size !== sessionIds.length || sessionIds.some(id => !id)) {
    throw new Error('화면 쌍마다 서로 다른 세션을 선택하세요.');
  }
  if (displayIds.length < sessionIds.length * screens || new Set(displayIds).size !== displayIds.length) {
    throw new Error(`연결된 모니터 ${sessionIds.length * screens}대가 필요합니다.`);
  }
  return sessionIds.flatMap((sessionId, i) => [
    { displayId: displayIds[i * screens], sessionId, role: 'list' as const },
    { displayId: displayIds[i * screens + 1], sessionId, role: 'detail' as const },
    ...(detailCount === 2 ? [{ displayId: displayIds[i * screens + 2], sessionId, role: 'detail-secondary' as const }] : []),
  ]);
}
