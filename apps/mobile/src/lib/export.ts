import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { monthRange } from '@dongil/shared';
import { api } from './api';

/** 해당 월 거래를 CSV 로 받아 공유 시트(네이티브) 또는 다운로드(웹)로 내보낸다 */
export async function exportMonthCsv(month: string) {
  const { start, end } = monthRange(month);
  const csv = await api<string>('/export/csv', { query: { from: start.toISOString(), to: end.toISOString() } });
  const name = `dongil-${month}.csv`;

  if (Platform.OS === 'web') {
    const doc = (globalThis as { document?: Document }).document;
    if (!doc) return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = doc.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: '가계부 내보내기', UTI: 'public.comma-separated-values-text' });
}
