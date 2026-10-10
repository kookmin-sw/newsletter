/** 숫자 호수는 기존 URL을 유지하고, 월호는 연도까지 넣어 매년 구분한다. */
export function newsletterSlug(issue, dateLabel) {
  const value = issue.trim();
  if (/^\d{1,6}$/.test(value)) return `newsletter-${value}`;
  const month = /^(0?[1-9]|1[0-2])월호$/.exec(value);
  const date = /^(\d{4})\.(0?[1-9]|1[0-2])$/.exec(dateLabel.trim());
  if (!month) throw new Error('호수는 004 같은 숫자 또는 9월호 형식으로 입력하세요.');
  if (!date || Number(date[2]) !== Number(month[1])) throw new Error('월호와 발행 라벨의 월을 맞춰 주세요. 예: 9월호, 2026.09');
  return `newsletter-${date[1]}-${date[2].padStart(2, '0')}`;
}
