import { create } from 'zustand';
import { storage } from './storage';

const KEY = 'current-book';

/**
 * 사용자가 마지막으로 고른 가계부 id.
 * 목록에 없는 id(나갔거나 삭제됨, 다른 계정으로 로그인)면 useCurrentBook 이 개인 가계부로 대체한다.
 */
interface BookState {
  bookId: string | null;
  select: (id: string) => void;
  reset: () => void;
  load: () => Promise<void>;
}

export const useBookStore = create<BookState>((set) => ({
  bookId: null,
  select: (id) => {
    set({ bookId: id });
    storage.setItem(KEY, id);
  },
  reset: () => {
    set({ bookId: null });
    storage.deleteItem(KEY);
  },
  load: async () => {
    const saved = await storage.getItem(KEY);
    if (saved) set({ bookId: saved });
  },
}));
