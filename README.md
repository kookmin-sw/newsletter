# KMU-CS Alumni

국민대학교 소프트웨어융합대학 졸업 동문회 웹사이트입니다.

## Windows 뉴스 사이니지

이 저장소는 pnpm workspace로 웹사이트와 Windows 사이니지 앱을 함께 관리합니다.
설치, 모니터 배정, 기사·요약·재생 시간 설정과 개발 방법은 [사이니지 문서](docs/signage/README.md)를 확인하세요.
웹 미리보기는 `/signage/`, 운영 설정은 `src/content/config/signage.json`입니다.

```sh
pnpm dev              # 웹사이트와 사이니지 미리보기
pnpm signage:demo     # 별도 터미널에서 목록·상세 창 실행, 첫 세션 설정에 따라 2개 또는 3개
pnpm signage:dist     # Windows x64 설치 파일 생성
```

## 기술 스택

- **Framework**: Astro 6 (SSG)
- **UI**: React + TypeScript
- **Styling**: vanilla-extract (컴포넌트), Astro scoped styles (페이지)
- **Content**: MDX (Astro Content Collections)
- **Design**: Atomic Design (atoms / molecules / organisms / templates)
- **Font**: 국민체(Kookminche) + Pretendard
- **Hosting**: GitHub Pages

## 시작하기

```bash
# 의존성 설치
pnpm install

# 개발 서버
pnpm dev

# 빌드
pnpm build

# 빌드 미리보기
pnpm preview
```

## 프로젝트 구조

```
src/
├── components/          # React 컴포넌트 (Atomic Design)
│   ├── atoms/           # Button, Badge, Heading, Text, Tag
│   ├── molecules/       # ArticleCard, ProgramCard, TimelineItem, SectionHeader
│   ├── organisms/       # Header, Footer, Hero
│   └── templates/       # MainLayout
├── content/
│   ├── articles/        # 소식 MDX 파일
│   ├── news/            # 뉴스 MDX 파일
│   └── config/          # site.json, programs.json, timeline.json, initiatives.json
├── layouts/             # BaseLayout, ArticleLayout
├── pages/               # Astro 페이지 라우팅
├── styles/              # 디자인 토큰, 테마
│   ├── tokens/          # colors, typography, spacing
│   └── pages/           # 페이지별 스타일 (레거시)
└── content.config.ts    # Content Collections 스키마
public/
├── fonts/               # 국민체 woff2
└── images/              # 로고, hero, articles 이미지
```

## 콘텐츠 작성

### 소식 (Articles)

`src/content/articles/`에 MDX 파일을 추가합니다.

```yaml
---
title: "제목"
excerpt: "요약"
publishedAt: "2025-03-24"
author: "작성자"
coverImage: "/images/articles/photo.jpg"  # 선택
tags: ["태그1", "태그2"]
category: "notice"  # notice | interview | event | story | column | news
---
```

### 뉴스 (News)

`src/content/news/`에 MDX 파일을 추가합니다.

```yaml
---
title: "뉴스 제목"
excerpt: "요약"
publishedAt: "2025-03-24"
author: "편집팀"
tags: ["태그"]
source: "출처 이름"       # 선택
sourceUrl: "https://..."  # 선택
---
```

### 이미지

- 대표 이미지: frontmatter의 `coverImage` 필드
- 본문 이미지: `![설명](/images/articles/photo.jpg)`
- Hero 캐러셀: `public/images/hero/`에 이미지를 넣으면 자동 반영

## 주요 설정 파일

| 파일 | 설명 |
|------|------|
| `src/content/config/site.json` | 사이트 메타, 네비게이션, 외부 링크 |
| `src/content/config/programs.json` | 동문회 프로그램 목록 |
| `src/content/config/initiatives.json` | 대학 주요 사업 목록 |
| `src/content/config/timeline.json` | 연혁 타임라인 |

## 배포 URL / Base Path 변경 가이드

현재 GitHub Pages 서브디렉토리(`https://ymw0407.github.io/KMUCS-Alumni/`)에 배포 중입니다.
도메인이나 base path가 변경될 경우 아래 **4개 설정 파일**과 **콘텐츠 파일**을 수정해야 합니다.

### 설정 파일

#### 1. `astro.config.mjs`

```js
export default defineConfig({
  site: 'https://ymw0407.github.io',   // ← 도메인
  base: '/KMUCS-Alumni/',               // ← base path (sitemap 생성에 사용)
});
```

#### 2. `src/lib/path.ts`

```ts
export const BASE = '/KMUCS-Alumni';    // ← astro.config.mjs의 base와 동일값 (trailing slash 없이)
```

> `url()`, `asset()` 함수가 이 값을 사용해 내부 링크와 에셋 경로에 prefix를 추가합니다.

#### 3. `src/content/config/site.json`

```json
{
  "siteUrl": "https://ymw0407.github.io"   // ← 도메인 (canonical, OG, JSON-LD에 사용)
}
```

#### 4. `public/robots.txt`

```
Sitemap: https://ymw0407.github.io/KMUCS-Alumni/sitemap-index.xml
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
         도메인 + base path 조합
```

### 콘텐츠 MDX 파일

아래 파일들에 `/KMUCS-Alumni/` 경로가 이미지·링크 경로에 직접 들어가 있습니다.
base path 변경 시 **일괄 치환(Find & Replace)** 이 필요합니다.

| 파일 | 하드코딩 내용 |
|------|-------------|
| `src/content/articles/2025-kmu-cs-expo.mdx` | 기사 내 이미지 경로 |
| `src/content/articles/2025-algorithm-contest.mdx` | 기사 내 이미지 경로 |
| `src/content/news/newsletter-001.mdx` | 뉴스레터 이미지 + 기사 링크 |

> 향후 콘텐츠 추가 시에도 MDX 본문에 `/KMUCS-Alumni/` prefix를 포함해야 합니다.

### 변경 체크리스트

- [ ] `astro.config.mjs` — `site`, `base` 수정
- [ ] `src/lib/path.ts` — `BASE` 상수 수정
- [ ] `src/content/config/site.json` — `siteUrl` 수정
- [ ] `public/robots.txt` — Sitemap URL 수정
- [ ] MDX 콘텐츠 파일 — `/KMUCS-Alumni/` → 새 base path로 일괄 치환
- [ ] 커스텀 도메인 사용 시 — `public/CNAME` 파일 생성
- [ ] `pnpm build` 후 canonical URL, OG 태그, sitemap 검증

### 예시: 루트 도메인 배포 (`https://kmucs-alumni.com`)

```
# astro.config.mjs
site: 'https://kmucs-alumni.com'
base: '/'

# src/lib/path.ts
export const BASE = '';

# site.json
"siteUrl": "https://kmucs-alumni.com"

# robots.txt
Sitemap: https://kmucs-alumni.com/sitemap-index.xml

# public/CNAME (새로 생성)
kmucs-alumni.com

# MDX 파일 일괄 치환
/KMUCS-Alumni/ → /
```
