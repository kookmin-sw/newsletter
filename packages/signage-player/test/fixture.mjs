export function fixture() {
  const qr = 'data:image/png;base64,aGVsbG8=';
  return {
    schemaVersion: 1, revision: 'a'.repeat(64), pollIntervalSeconds: 60,
    branding: { siteUrl: 'https://alumni.cs.kookmin.ac.kr', logo: '/images/logo.png', fontRegular: '/fonts/regular.ttf', fontBold: '/fonts/bold.ttf', qr },
    assets: ['/images/logo.png', '/fonts/regular.ttf', '/fonts/bold.ttf'].map((path) => ({ path, sha256: 'b'.repeat(64) })),
    sessions: [{ id: 'lobby-a', title: '뉴스', issue: '003', dateLabel: '2026.10', startsAt: '2026-10-10T00:00:00+09:00', transitionMilliseconds: 600,
      items: [20, 30, 10].map((durationSeconds, i) => ({ id: `article-${i}`, title: `기사 ${i}`, excerpt: '짧은 소개', summary: ['요약입니다.'], author: '기자', category: '뉴스', tags: ['태그'], url: `https://alumni.cs.kookmin.ac.kr/articles/article-${i}/`, qr, durationSeconds })),
    }],
  };
}
