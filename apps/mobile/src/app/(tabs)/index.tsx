import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatWon } from '@dongil/shared';
import { CountUp } from '@/components/money';
import { MonthSwitcher } from '@/components/month-switcher';
import { Fab, Screen } from '@/components/screen';
import { TransactionRow } from '@/components/transaction-row';
import { AppText, Button, Card, EmptyState, ErrorState, PressableScale, ProgressBar, SectionTitle } from '@/components/ui';
import { monthFilter, useAccounts, useBudget, useSummary, useTransactions } from '@/features/queries';
import { useAuth } from '@/lib/auth';
import { useMonth } from '@/lib/ui-store';
import { useTheme } from '@/theme/theme';

const enter = (i: number) => FadeInDown.delay(i * 70).duration(450);

export default function HomeScreen() {
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const month = useMonth((s) => s.month);
  const summary = useSummary(month);
  const budget = useBudget(month);
  const accounts = useAccounts();
  const recent = useTransactions(monthFilter(month), 5);

  const refreshing = summary.isRefetching || recent.isRefetching;
  const refresh = () => {
    summary.refetch();
    budget.refetch();
    accounts.refetch();
    recent.refetch();
  };

  const s = summary.data;
  const total = budget.data?.items.find((i) => i.categoryId === null);
  const totalAssets = accounts.data?.reduce((a, b) => a + b.balance, 0) ?? 0;
  const recentItems = recent.data?.pages[0]?.items ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen
        right={<MonthSwitcher variant="heading" />}
        title={user ? `${user.nickname}님` : undefined}
        refreshing={refreshing}
        onRefresh={refresh}>
        {summary.error ? (
          <ErrorState error={summary.error} onRetry={refresh} />
        ) : (
          <>
            {/* 이번 달 요약 */}
            <Animated.View entering={enter(0)}>
              <Card style={{ gap: 18 }}>
                <View style={{ gap: 6 }}>
                  <AppText tone="textSub">이번 달 남은 돈</AppText>
                  <CountUp value={s?.net ?? 0} tone={(s?.net ?? 0) < 0 ? 'expense' : 'text'} />
                  {s?.expenseChangeRate != null && <ChangeBadge rate={s.expenseChangeRate} />}
                </View>
                <View style={[styles.split, { borderTopColor: colors.border }]}>
                  <Stat label="수입" value={s?.income ?? 0} color={colors.income} icon="arrow-down" />
                  <View style={{ width: 1, backgroundColor: colors.border }} />
                  <Stat label="지출" value={s?.expense ?? 0} color={colors.expense} icon="arrow-up" />
                </View>
              </Card>
            </Animated.View>

            {/* 예산 */}
            <Animated.View entering={enter(1)}>
              <PressableScale onPress={() => router.navigate('/budget')} scaleTo={0.98}>
                <Card style={{ gap: 12 }}>
                  {total ? (
                    <>
                      <View style={styles.between}>
                        <AppText variant="heading">한 달 예산</AppText>
                        <AppText tone={total.ratio >= 1 ? 'expense' : 'textSub'} variant="label">
                          {Math.round(total.ratio * 100)}% 사용
                        </AppText>
                      </View>
                      <ProgressBar ratio={total.ratio} height={10} />
                      <AppText tone="textSub">
                        {total.amount - total.spent >= 0
                          ? `${formatWon(total.amount - total.spent)} 남았어요`
                          : `${formatWon(total.spent - total.amount)} 초과했어요`}
                      </AppText>
                    </>
                  ) : (
                    <View style={styles.between}>
                      <View style={{ gap: 4, flex: 1 }}>
                        <AppText variant="heading">예산을 세워볼까요?</AppText>
                        <AppText tone="textSub">목표를 정하면 지출이 보여요</AppText>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </View>
                  )}
                </Card>
              </PressableScale>
            </Animated.View>

            {/* 자산 */}
            <Animated.View entering={enter(2)}>
              <Card padded={false} style={{ paddingVertical: 20 }}>
                <View style={[styles.between, { paddingHorizontal: 20, marginBottom: 14 }]}>
                  <View style={{ gap: 2 }}>
                    <AppText tone="textSub" variant="label">총 자산</AppText>
                    <AppText variant="heading">{formatWon(totalAssets)}</AppText>
                  </View>
                  <PressableScale onPress={() => router.push('/accounts')}>
                    <AppText tone="primary" variant="label">관리</AppText>
                  </PressableScale>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                  {accounts.data?.map((a) => (
                    <View key={a.id} style={[styles.account, { backgroundColor: colors.fill }]}>
                      <View style={[styles.dot, { backgroundColor: a.color }]} />
                      <AppText variant="caption" tone="textSub" numberOfLines={1}>
                        {a.name}
                      </AppText>
                      <AppText variant="label" numberOfLines={1}>
                        {formatWon(a.balance)}
                      </AppText>
                    </View>
                  ))}
                </ScrollView>
              </Card>
            </Animated.View>

            {/* 최근 거래 */}
            <Animated.View entering={enter(3)}>
              <Card>
                <SectionTitle
                  title="최근 내역"
                  right={
                    <PressableScale onPress={() => router.navigate('/transactions')}>
                      <AppText tone="primary" variant="label">전체보기</AppText>
                    </PressableScale>
                  }
                />
                {recentItems.length ? (
                  recentItems.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
                ) : recent.isLoading ? null : (
                  <EmptyState
                    icon="sparkles-outline"
                    title="아직 기록이 없어요"
                    description="첫 거래를 기록해 보세요"
                    action={<Button title="기록하기" kind="secondary" icon="add" onPress={() => router.push('/transaction/new')} />}
                  />
                )}
              </Card>
            </Animated.View>
          </>
        )}
      </Screen>
      <Fab />
    </View>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon: 'arrow-up' | 'arrow-down' }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={14} color={color} />
        <AppText variant="label" tone="textSub">{label}</AppText>
      </View>
      <CountUp value={value} variant="heading" />
    </View>
  );
}

function ChangeBadge({ rate }: { rate: number }) {
  const { colors } = useTheme();
  const up = rate > 0;
  const color = up ? colors.expense : colors.success;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1F` }]}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={14} color={color} />
      <AppText variant="caption" style={{ color, fontWeight: '700' }}>
        지난달보다 지출 {Math.abs(Math.round(rate * 100))}% {up ? '늘었어요' : '줄었어요'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', gap: 16, borderTopWidth: 1, paddingTop: 16 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  account: { width: 130, padding: 14, borderRadius: 16, gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
});
