import { monthRange } from '@/shared';
import { api } from './api';

/** 가계부의 해당 월 거래를 CSV 파일로 내려받는다 */
export async function exportMonthCsv(bookId: string, month: string) {
  const { start, end } = monthRange(month);
  const csv = await api<string>(`/books/${bookId}/export/csv`, {
    query: { from: start.toISOString(), to: end.toISOString() },
  });
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `dongil-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
