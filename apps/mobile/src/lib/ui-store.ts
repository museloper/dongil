import { create } from 'zustand';
import { currentMonth, shiftMonth } from '@dongil/shared';

/** 홈/내역/통계/예산 탭이 공유하는 "보고 있는 달" */
interface MonthState {
  month: string;
  shift: (delta: number) => void;
  reset: () => void;
}

export const useMonth = create<MonthState>((set) => ({
  month: currentMonth(),
  shift: (delta) => set((s) => ({ month: shiftMonth(s.month, delta) })),
  reset: () => set({ month: currentMonth() }),
}));
