import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { palette, type Colors } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'theme-mode';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  load: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: (mode) => {
    set({ mode });
    storage.setItem(KEY, mode);
  },
  load: async () => {
    const saved = await storage.getItem(KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') set({ mode: saved });
  },
}));

export function useTheme(): { colors: Colors; isDark: boolean } {
  const system = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  return { colors: isDark ? palette.dark : palette.light, isDark };
}
