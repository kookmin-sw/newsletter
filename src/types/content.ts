/**
 * 콘텐츠 스키마 타입 정의
 */

/** 기사(Article) Frontmatter 스키마 */
export interface ArticleFrontmatter {
  /** URL 슬러그 (파일명에서 자동 생성 가능) */
  slug?: string;
  /** 기사 제목 */
  title: string;
  /** 부제 */
  subtitle?: string;
  /** 요약 (목록에 표시, 미입력 시 본문 첫 200자) */
  excerpt?: string;
  /** 사이니지 목록용 짧은 소개 */
  displayExcerpt?: string;
  /** 작성일 (YYYY-MM-DD) */
  publishedAt: string;
  /** 수정일 */
  updatedAt?: string;
  /** 작성자 */
  author: string;
  /** 작성자 역할/소속 */
  authorRole?: string;
  /** 대표 이미지 경로 */
  coverImage?: string;
  /** 썸네일 이미지 (미지정 시 coverImage 사용) */
  thumbnail?: string;
  /** 태그 */
  tags: string[];
  /** 카테고리 */
  category?: ArticleCategory;
  /** 공개 여부 (draft일 때 빌드에서 제외) */
  draft?: boolean;
  /** 외부 링크 (외부 기사 링크 시) */
  externalUrl?: string;
}

export type ArticleCategory =
  | 'notice'    // 공지
  | 'interview' // 인터뷰
  | 'event'     // 행사
  | 'story'     // 스토리
  | 'column'    // 칼럼
  | 'news';     // 뉴스

/** 동문 프로필 스키마 */
export interface AlumniProfile {
  /** 이름 */
  name: string;
  /** 졸업 연도 */
  graduationYear: number;
  /** 전공/학과 */
  department: string;
  /** 현재 소속 */
  currentOrganization?: string;
  /** 현재 직함 */
  currentTitle?: string;
  /** 프로필 이미지 */
  profileImage?: string;
  /** 한줄 소개 */
  bio?: string;
  /** 인터뷰 기사 slug 연결 */
  interviewSlug?: string;
  /** Featured 여부 */
  featured?: boolean;
  /** 링크 */
  links?: {
    linkedin?: string;
    github?: string;
    website?: string;
    email?: string;
  };
}

/** 사이트 설정 스키마 */
export interface SiteConfig {
  /** 사이트 제목 */
  title: string;
  /** 사이트 설명 */
  description: string;
  /** 사이트 URL */
  siteUrl: string;
  /** OG 이미지 */
  ogImage: string;
  /** 동문회 정보 */
  organization: {
    name: string;
    university: string;
    college: string;
    foundedYear: number;
    email: string;
    phone?: string;
  };
  /** 외부 링크 */
  externalLinks: {
    label: string;
    url: string;
    description?: string;
  }[];
  /** 소셜 미디어 */
  social: {
    platform: string;
    url: string;
  }[];
  /** 네비게이션 메뉴 */
  navigation: {
    label: string;
    href: string;
    external?: boolean;
  }[];
}

/** 연혁 항목 */
export interface TimelineEntry {
  year: number;
  month?: number;
  title: string;
  description?: string;
  category?: 'founding' | 'growth' | 'achievement' | 'event';
}

/** 프로그램/활동 */
export interface Program {
  id: string;
  title: string;
  description: string;
  icon?: string;
  schedule?: string;
  link?: string;
  status: 'active' | 'upcoming' | 'past';
}
