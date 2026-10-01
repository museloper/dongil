import { KST_OFFSET_MIN, toLocalDateKey } from '@dongil/shared';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026-09-26" -> "9월 26일 토요일" (오늘/어제 치환) */
export function formatDayLabel(key: string, today = toLocalDateKey(new Date())): string {
  if (key === today) return '오늘';
  if (key === shiftDay(today, -1)) return '어제';
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일 ${DOW[dayOfWeek(key)]}요일`;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
}

/** "2026-09-26" (KST) 의 요일 0~6 */
export function dayOfWeek(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** KST 날짜 키의 [00:00, 다음날 00:00) 를 ISO 문자열로 */
export function dayRangeIso(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const off = KST_OFFSET_MIN * 60_000;
  return {
    from: new Date(Date.UTC(y, m - 1, d) - off).toISOString(),
    to: new Date(Date.UTC(y, m - 1, d + 1) - off).toISOString(),
  };
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 날짜 키는 바꾸고 시:분은 유지한 ISO 문자열 */
export function withDateKey(iso: string, key: string): string {
  const time = new Date(new Date(iso).getTime() + KST_OFFSET_MIN * 60_000).toISOString().slice(11, 19);
  return new Date(`${key}T${time}+09:00`).toISOString();
}
