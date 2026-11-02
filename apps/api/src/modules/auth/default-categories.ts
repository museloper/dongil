import type { CategoryType } from '@prisma/client';

/** 가입 시 자동 생성되는 기본 카테고리. icon 은 앱의 Ionicons 이름. */
export const DEFAULT_CATEGORIES: { name: string; type: CategoryType; icon: string; color: string }[] = [
  { name: '식비', type: 'EXPENSE', icon: 'restaurant', color: '#FF6B6B' },
  { name: '카페', type: 'EXPENSE', icon: 'cafe', color: '#C08457' },
  { name: '간식', type: 'EXPENSE', icon: 'fast-food', color: '#FFA94D' },
  { name: '교통', type: 'EXPENSE', icon: 'bus', color: '#4DABF7' },
  { name: '쇼핑', type: 'EXPENSE', icon: 'bag-handle', color: '#F783AC' },
  { name: '의류', type: 'EXPENSE', icon: 'shirt', color: '#DA77F2' },
  { name: '생활', type: 'EXPENSE', icon: 'home', color: '#69DB7C' },
  { name: '통신', type: 'EXPENSE', icon: 'phone-portrait', color: '#22B8CF' },
  { name: '문화', type: 'EXPENSE', icon: 'film', color: '#9775FA' },
  { name: '교육', type: 'EXPENSE', icon: 'school', color: '#5C7CFA' },
  { name: '의료', type: 'EXPENSE', icon: 'medkit', color: '#FF922B' },
  { name: '보험', type: 'EXPENSE', icon: 'heart', color: '#F06595' },
  { name: '경조사', type: 'EXPENSE', icon: 'gift', color: '#E64980' },
  { name: '구독', type: 'EXPENSE', icon: 'repeat', color: '#748FFC' },
  // 저축·투자도 이번 달에 쓸 수 있는 돈에서 빠져나가므로 지출로 기록한다
  { name: '저금', type: 'EXPENSE', icon: 'cash', color: '#38D9A9' },
  { name: '적금', type: 'EXPENSE', icon: 'business', color: '#20C997' },
  { name: '주식', type: 'EXPENSE', icon: 'trending-up', color: '#12B886' },
  { name: '기타', type: 'EXPENSE', icon: 'ellipsis-horizontal', color: '#ADB5BD' },
  { name: '월급', type: 'INCOME', icon: 'wallet', color: '#3182F6' },
  { name: '용돈', type: 'INCOME', icon: 'gift', color: '#20C997' },
  { name: '부수입', type: 'INCOME', icon: 'trending-up', color: '#FAB005' },
  { name: '기타수입', type: 'INCOME', icon: 'add-circle', color: '#ADB5BD' },
];
