/**
 * base path 헬퍼
 *
 * astro.config.mjs의 base 설정과 동일한 값을 여기서 관리합니다.
 * 서브디렉토리 배포 시 이 값만 변경하면 모든 경로에 자동 반영됩니다.
 *
 * 예: base = '' (루트 배포), base = '/kmucs-alumni' (서브디렉토리 배포)
 */
export const BASE = '';

/** 내부 페이지 경로에 base prefix 추가 */
export function url(path: string): string {
  if (!BASE) return path;
  return `${BASE}${path}`;
}

/** public 에셋(이미지, 폰트 등) 경로에 base prefix 추가 */
export function asset(path: string): string {
  if (!BASE) return path;
  return `${BASE}${path}`;
}
