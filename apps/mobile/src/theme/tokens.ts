export const palette = {
  light: {
    bg: '#F7F8FA',
    card: '#FFFFFF',
    fill: '#F2F4F6',
    border: '#EEF0F3',
    text: '#191F28',
    textSub: '#6B7684',
    textMuted: '#B0B8C1',
    primary: '#3182F6',
    primarySoft: '#E8F3FF',
    onPrimary: '#FFFFFF',
    income: '#3182F6',
    expense: '#F04452',
    warn: '#FF9F0A',
    success: '#00C471',
  },
  dark: {
    bg: '#0E0F12',
    card: '#1A1B20',
    fill: '#24262D',
    border: '#26282F',
    text: '#F2F4F6',
    textSub: '#9EA4AD',
    textMuted: '#5F6670',
    primary: '#4C9AFF',
    primarySoft: '#1B2A42',
    onPrimary: '#FFFFFF',
    income: '#4C9AFF',
    expense: '#FF5A66',
    warn: '#FFB340',
    success: '#2ED18A',
  },
} as const;

export type ColorToken = keyof typeof palette.light;
export type Colors = Record<ColorToken, string>;

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/** 카테고리/계좌 색상 선택지 */
export const SWATCHES = [
  '#3182F6', '#4DABF7', '#20C997', '#69DB7C', '#FAB005', '#FF922B',
  '#FF6B6B', '#F783AC', '#9775FA', '#748FFC', '#C08457', '#ADB5BD',
];
