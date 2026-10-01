import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/screen';
import { AppText, Card, PressableScale, Segmented, haptic, type IconName } from '@/components/ui';
import { useCurrentBook } from '@/features/queries';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMonthLabel } from '@/lib/date';
import { exportMonthCsv } from '@/lib/export';
import { useMonth } from '@/lib/ui-store';
import { useTheme, useThemeStore, type ThemeMode } from '@/theme/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { mode, setMode } = useThemeStore();
  const month = useMonth((s) => s.month);
  const { book } = useCurrentBook();
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      if (!book) return;
      await exportMonthCsv(book.id, month);
      haptic('success');
    } catch (e) {
      Alert.alert('내보내기 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const onLogout = () => {
    if (Platform.OS === 'web') return void logout();
    Alert.alert('로그아웃할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen title="설정">
      <Card style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="title" tone="primary">
            {user?.nickname.slice(0, 1) ?? '?'}
          </AppText>
        </View>
        <View style={{ gap: 2 }}>
          <AppText variant="heading">{user?.nickname}</AppText>
          <AppText variant="caption" tone="textSub">{user?.email}</AppText>
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <AppText variant="heading">화면 테마</AppText>
        <Segmented<ThemeMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'system', label: '시스템' },
            { value: 'light', label: '라이트' },
            { value: 'dark', label: '다크' },
          ]}
        />
      </Card>

      <Card padded={false} style={{ paddingVertical: 6 }}>
        <MenuRow
          icon={book?.type === 'SHARED' ? 'people-outline' : 'book-outline'}
          label="가계부 설정"
          onPress={() => router.push('/book-settings')}
          right={
            <AppText variant="label" tone="textSub" numberOfLines={1} style={{ maxWidth: 140 }}>
              {book?.name}
            </AppText>
          }
        />
        <MenuRow icon="swap-horizontal-outline" label="가계부 전환 · 참여" onPress={() => router.push('/books')} />
      </Card>

      <Card padded={false} style={{ paddingVertical: 6 }}>
        <MenuRow icon="card-outline" label="자산 관리" onPress={() => router.push('/accounts')} />
        <MenuRow icon="pricetags-outline" label="카테고리 관리" onPress={() => router.push('/categories')} />
        <MenuRow
          icon="download-outline"
          label={`${formatMonthLabel(month)} CSV 내보내기`}
          onPress={onExport}
          right={exporting ? <ActivityIndicator color={colors.textMuted} /> : undefined}
        />
      </Card>

      <Card padded={false} style={{ paddingVertical: 6 }}>
        <MenuRow icon="log-out-outline" label="로그아웃" onPress={onLogout} danger />
      </Card>

      <AppText variant="caption" tone="textMuted" style={{ textAlign: 'center', marginTop: 8 }}>
        돈길 v0.1 · {API_BASE}
      </AppText>
    </Screen>
  );
}

function MenuRow({ icon, label, onPress, right, danger }: {
  icon: IconName;
  label: string;
  onPress: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} style={styles.menuRow} scaleTo={0.98}>
      <Ionicons name={icon} size={22} color={danger ? colors.expense : colors.textSub} />
      <AppText style={{ flex: 1 }} tone={danger ? 'expense' : 'text'}>
        {label}
      </AppText>
      {right ?? (!danger && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />)}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 56 },
});
