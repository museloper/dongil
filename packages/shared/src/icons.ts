/** w 가 있으면 그 굵기의 둥근 선, 없으면 채운 도형 */
export interface CustomIconPart {
  d: string;
  w?: number;
}

/**
 * Ionicons 에 없어 직접 그린 카테고리 아이콘(viewBox 0 0 512 512).
 * 서버에는 Ionicons 처럼 이름으로 저장하므로 모바일과 웹이 같은 도형을 쓰도록 여기에 둔다.
 */
export const CUSTOM_ICONS: Record<string, readonly CustomIconPart[]> = {
  'baby-crawl': [
    { d: 'M372 86a92 92 0 1 0 0 184a92 92 0 1 0 0-184z' },
    { d: 'M372 72Q388 42 424 52', w: 20 },
    { d: 'M150 240Q215 215 280 265', w: 130 },
    { d: 'M300 300L330 410', w: 58 },
    { d: 'M125 285L190 405L95 415', w: 64 },
  ],
};
