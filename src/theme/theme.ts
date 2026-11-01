import { useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { palette, type Colors } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'theme-mode';

function savedMode(): ThemeMode {
  const saved = storage.getItem(KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: savedMode(),
  setMode: (mode) => {
    set({ mode });
    storage.setItem(KEY, mode);
  },
}));

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const subscribe = (cb: () => void) => {
  darkQuery.addEventListener('change', cb);
  return () => darkQuery.removeEventListener('change', cb);
};

export function useTheme(): { colors: Colors; isDark: boolean } {
  const systemDark = useSyncExternalStore(subscribe, () => darkQuery.matches);
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'system' ? systemDark : mode === 'dark';
  return { colors: isDark ? palette.dark : palette.light, isDark };
}

/** 토큰을 CSS 변수(--bg, --text …)로 내보내 스타일시트에서도 같은 색을 쓰게 한다 */
export function useApplyTheme() {
  const { colors, isDark } = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(colors)) root.style.setProperty(`--${k}`, v);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.dataset.theme = isDark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg);
  }, [colors, isDark]);
}
