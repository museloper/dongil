import type { CategoryType } from '@prisma/client';

/** 가입 시 자동 생성되는 기본 카테고리. icon 은 앱의 Ionicons 이름. */
export const DEFAULT_CATEGORIES: { name: string; type: CategoryType; icon: string; color: string }[] = [
  { name: '식비', type: 'EXPENSE', icon: 'restaurant', color: '#FF6B6B' },
  { name: '카페', type: 'EXPENSE', icon: 'cafe', color: '#C08457' },
  { name: '교통', type: 'EXPENSE', icon: 'bus', color: '#4DABF7' },
  { name: '쇼핑', type: 'EXPENSE', icon: 'bag-handle', color: '#F783AC' },
  { name: '생활', type: 'EXPENSE', icon: 'home', color: '#69DB7C' },
  { name: '문화', type: 'EXPENSE', icon: 'film', color: '#9775FA' },
  { name: '의료', type: 'EXPENSE', icon: 'medkit', color: '#FF922B' },
  { name: '구독', type: 'EXPENSE', icon: 'repeat', color: '#748FFC' },
  { name: '기타', type: 'EXPENSE', icon: 'ellipsis-horizontal', color: '#ADB5BD' },
  { name: '월급', type: 'INCOME', icon: 'wallet', color: '#3182F6' },
  { name: '용돈', type: 'INCOME', icon: 'gift', color: '#20C997' },
  { name: '부수입', type: 'INCOME', icon: 'trending-up', color: '#FAB005' },
  { name: '기타수입', type: 'INCOME', icon: 'add-circle', color: '#ADB5BD' },
];
