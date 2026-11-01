/** 서비스 기준 시간대: KST(UTC+9). 월/일 경계는 모두 이 기준으로 자른다. */
export const KST_OFFSET_MIN = 540;

const krw = new Intl.NumberFormat('ko-KR');

/** 12345 -> "12,345원" */
export function formatWon(value: number, withUnit = true): string {
  const s = krw.format(Math.round(value));
  return withUnit ? `${s}원` : s;
}

/** 수입 "+12,345원" / 지출 "-12,345원" / 이체는 부호 없음 */
export function formatSigned(value: number, type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): string {
  if (type === 'TRANSFER') return formatWon(value);
  return `${type === 'INCOME' ? '+' : '-'}${formatWon(value)}`;
}

/** 차트 축 등에 쓰는 축약: 17000 -> "1.7만", 1234567 -> "123만", 250000000 -> "2.5억" */
export function compactWon(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `${+(value / 100_000_000).toFixed(1)}억`;
  if (abs >= 100_000) return `${Math.round(value / 10_000)}만`;
  if (abs >= 10_000) return `${+(value / 10_000).toFixed(1)}만`;
  return krw.format(value);
}

/** "2026-09" -> KST 기준 해당 월의 [start, end) 를 UTC Date 로 */
export function monthRange(month: string, tzOffsetMinutes = KST_OFFSET_MIN): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  const off = tzOffsetMinutes * 60_000;
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - off),
    end: new Date(Date.UTC(y, m, 1) - off),
  };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(now = new Date(), tzOffsetMinutes = KST_OFFSET_MIN): string {
  return toLocalDateKey(now, tzOffsetMinutes).slice(0, 7);
}

/** UTC Date -> KST 기준 "YYYY-MM-DD" */
export function toLocalDateKey(date: Date, tzOffsetMinutes = KST_OFFSET_MIN): string {
  return new Date(date.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}
