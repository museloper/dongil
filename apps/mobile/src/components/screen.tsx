import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { AppText, PressableScale } from './ui';

/** 탭 화면 공통 레이아웃: 상단 safe-area + 큰 제목 + 당겨서 새로고침 */
export function Screen({
  title,
  right,
  children,
  refreshing,
  onRefresh,
  scroll = true,
  ...rest
}: ScrollViewProps & {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const header = (title || right) && (
    <View style={styles.header}>
      {title ? <AppText variant="title">{title}</AppText> : <View />}
      {right}
    </View>
  );

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        {header}
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
      refreshControl={
        onRefresh && <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
      }
      showsVerticalScrollIndicator={false}
      {...rest}>
      {header}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

/** 우측 하단 + 버튼: 거래 추가 */
export function Fab() {
  const { colors } = useTheme();
  return (
    <PressableScale
      aria-label="거래 추가"
      onPress={() => router.push('/transaction/new')}
      style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
      scaleTo={0.9}>
      <Ionicons name="add" size={30} color={colors.onPrimary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.lg,
    minHeight: 60,
  },
  body: { paddingHorizontal: space.lg, gap: space.md },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
