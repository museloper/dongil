import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';
import { useTheme, useThemeStore } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

// 모달(거래 입력 등)로 바로 딥링크해도 아래에 탭이 깔려 있어 닫기/뒤로가기가 동작하도록
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const loadTheme = useThemeStore((s) => s.load);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    Promise.all([bootstrap(), loadTheme()]).finally(() => SplashScreen.hideAsync());
  }, [bootstrap, loadTheme]);

  if (status === 'loading') return null;

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };
  const subHeader = {
    headerShown: true,
    headerShadowVisible: false,
    headerBackTitle: '뒤로',
    headerStyle: { backgroundColor: colors.bg },
  } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Protected guard={status === 'authed'}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="budget-edit" options={{ presentation: 'modal' }} />
              <Stack.Screen name="accounts" options={{ ...subHeader, title: '자산 관리' }} />
              <Stack.Screen name="categories" options={{ ...subHeader, title: '카테고리 관리' }} />
            </Stack.Protected>
            <Stack.Protected guard={status !== 'authed'}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
