import { z } from 'astro/zod';
import rawData from '@/content/config/achievements.json';

/**
 * 재학생·동문 성과(실적) 데이터
 *
 * 데이터는 src/content/config/achievements.json 에서 관리합니다.
 * 이 모듈은 빌드 타임에 데이터를 검증·정렬하고, 페이지에서 쓰는 헬퍼를 제공합니다.
 * (스키마에 맞지 않는 데이터가 있으면 빌드가 실패합니다.)
 */

/** 카테고리별 라벨 + 배지 색상 */
export const ACHIEVEMENT_CATEGORIES = {
  award: { label: '수상', color: '#1A5BC4', background: '#E8F0FE' },
  paper: { label: '논문', color: '#0B7285', background: '#E3FAFC' },
  patent: { label: '특허', color: '#5F3DC4', background: '#EDE7FB' },
  etc: { label: '기타', color: '#A66B00', background: '#FFF4E0' },
} as const;

export type AchievementCategory = keyof typeof ACHIEVEMENT_CATEGORIES;

/** 카테고리 표준 순서 (필터 칩 순서) */
const CATEGORY_ORDER = Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[];

const achievementSchema = z.object({
  /** 일자 (YYYY-MM-DD) — 1차 정렬 기준 */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date는 YYYY-MM-DD 형식이어야 합니다'),
  /** 카테고리 (etc = 그 외 뛰어난 성과) */
  category: z.enum(['award', 'paper', 'patent', 'etc']),
  /** 대회·학회·자격증명 — 같은 날짜일 때 2차 정렬 기준 */
  title: z.string().min(1),
  /** 수상 등급 / 게재 상태 등 세부 (예: 대상, 우수논문상) */
  award: z.string().default(''),
  /** 이름 — 한 줄에 한 명 (팀 수상은 사람 수만큼 행을 나눔) */
  name: z.string().min(1),
  /** 학번 (예: "22") — "08" 등 보존을 위해 문자열로 관리 */
  cohort: z.string().min(1),
  /** 주최/게재처 (선택) */
  host: z.string().default(''),
  /** 관련 링크 (선택) */
  link: z.union([z.string().url(), z.literal('')]).default(''),
});

export type Achievement = z.infer<typeof achievementSchema>;

/** 빌드 타임 검증 — 잘못된 데이터가 있으면 여기서 빌드가 실패합니다. */
const validated = z.array(achievementSchema).parse(rawData);

/**
 * 정렬: 일자 내림차순 → 같은 날짜면 title 오름차순(국문)
 * → 같은 대회(팀 수상)면 학번 오름차순 → 이름 오름차순으로 안정 정렬
 */
export const achievements: Achievement[] = [...validated].sort((a, b) => {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.title !== b.title) return a.title.localeCompare(b.title, 'ko');
  if (a.cohort !== b.cohort) return a.cohort.localeCompare(b.cohort, 'ko', { numeric: true });
  return a.name.localeCompare(b.name, 'ko');
});

/** 연도별 그룹 (연도 내림차순). 각 그룹 내부는 위 정렬 순서 유지 */
export function groupByYear(items: Achievement[] = achievements): [string, Achievement[]][] {
  const map = new Map<string, Achievement[]>();
  for (const item of items) {
    const year = item.date.slice(0, 4);
    const bucket = map.get(year);
    if (bucket) bucket.push(item);
    else map.set(year, [item]);
  }
  return [...map.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
}

/** 데이터에 실제로 존재하는 카테고리만 표준 순서로 반환 (필터 칩용) */
export function usedCategories(items: Achievement[] = achievements): AchievementCategory[] {
  const present = new Set(items.map((i) => i.category));
  return CATEGORY_ORDER.filter((c) => present.has(c));
}

/** 참여자 표시 문자열 — "22학번 윤민우" */
export function formatPerson(item: Pick<Achievement, 'name' | 'cohort'>): string {
  return `${item.cohort}학번 ${item.name}`;
}

/** 일자 표시 — "MM.DD" (연도는 그룹 헤더에 표기) */
export function formatMonthDay(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(8, 10)}`;
}

export interface AchievementStats {
  /** 전체 항목 수 */
  total: number;
  /** 참여 학생 수 (학번+이름 기준 중복 제거) */
  people: number;
  /** 카테고리별 카운트 (데이터에 존재하는 카테고리만, 표준 순서) */
  categories: { category: AchievementCategory; label: string; color: string; count: number }[];
  /** 연도별 카운트 (최소~최대 연도 연속, 오름차순 — 막대그래프용) */
  byYear: { year: string; count: number }[];
}

/** 상단 요약 통계 계산 */
export function getStats(items: Achievement[] = achievements): AchievementStats {
  const people = new Set(items.map((i) => `${i.cohort}/${i.name}`)).size;

  const categories = usedCategories(items).map((c) => ({
    category: c,
    label: ACHIEVEMENT_CATEGORIES[c].label,
    color: ACHIEVEMENT_CATEGORIES[c].color,
    count: items.filter((i) => i.category === c).length,
  }));

  const yearCount = new Map<number, number>();
  for (const i of items) {
    const y = Number(i.date.slice(0, 4));
    yearCount.set(y, (yearCount.get(y) ?? 0) + 1);
  }
  const years = [...yearCount.keys()];
  const byYear: { year: string; count: number }[] = [];
  if (years.length > 0) {
    const min = Math.min(...years);
    const max = Math.max(...years);
    for (let y = min; y <= max; y++) {
      byYear.push({ year: String(y), count: yearCount.get(y) ?? 0 });
    }
  }

  return { total: items.length, people, categories, byYear };
}
