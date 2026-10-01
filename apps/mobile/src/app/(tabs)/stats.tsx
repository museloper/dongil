import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatWon } from '@dongil/shared';
import { CategoryIcon } from '@/components/category-icon';
import { DonutChart, TrendBars } from '@/components/charts';
import { CountUp } from '@/components/money';
import { MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { AppText, Card, EmptyState, ErrorState, ProgressBar, SectionTitle } from '@/components/ui';
import { useByCategory, useSummary, useTrend } from '@/features/queries';
import { useMonth } from '@/lib/ui-store';
import { useTheme } from '@/theme/theme';

export default function StatsScreen() {
  const { colors } = useTheme();
  const month = useMonth((s) => s.month);
  const summary = useSummary(month);
  const byCat = useByCategory(month);
  const trend = useTrend(month, 6);

  const refresh = () => {
    summary.refetch();
    byCat.refetch();
    trend.refetch();
  };
  const cats = byCat.data ?? [];
  const expense = summary.data?.expense ?? 0;

  return (
    <Screen title="통계" right={<MonthSwitcher variant="heading" />} refreshing={byCat.isRefetching} onRefresh={refresh}>
      {byCat.error ? (
        <ErrorState error={byCat.error} onRetry={refresh} />
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(450)}>
            <Card style={{ alignItems: 'center', gap: 20 }}>
              <View style={{ alignSelf: 'stretch' }}>
                <AppText variant="heading">카테고리별 지출</AppText>
              </View>
              {cats.length ? (
                <>
                  <DonutChart data={cats.map((c) => ({ key: c.categoryId, value: c.amount, color: c.color }))}>
                    <AppText variant="caption" tone="textSub">총 지출</AppText>
                    <CountUp value={expense} variant="heading" />
                  </DonutChart>
                  <View style={{ alignSelf: 'stretch', gap: 14 }}>
                    {cats.map((c, i) => (
                      <Animated.View key={c.categoryId} entering={FadeInDown.delay(120 + i * 40).duration(400)} style={styles.catRow}>
                        <CategoryIcon icon={c.icon} color={c.color} size={36} />
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.between}>
                            <AppText>
                              {c.name}{' '}
                              <AppText variant="label" tone="textMuted">
                                {Math.round(c.ratio * 100)}%
                              </AppText>
                            </AppText>
                            <AppText variant="heading">{formatWon(c.amount)}</AppText>
                          </View>
                          <ProgressBar ratio={c.ratio} height={6} color={c.color} />
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                </>
              ) : (
                !byCat.isLoading && <EmptyState icon="pie-chart-outline" title="지출 기록이 없어요" />
              )}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(450)}>
            <Card>
              <SectionTitle
                title="최근 6개월"
                right={
                  <View style={styles.legend}>
                    <Legend color={colors.income} label="수입" />
                    <Legend color={colors.expense} label="지출" />
                  </View>
                }
              />
              {trend.data && <TrendBars data={trend.data} />}
            </Card>
          </Animated.View>

          {summary.data && (
            <Animated.View entering={FadeInDown.delay(160).duration(450)}>
              <Card style={{ gap: 12 }}>
                <AppText variant="heading">이번 달 한눈에</AppText>
                <Row label="수입" value={formatWon(summary.data.income)} tone="income" />
                <Row label="지출" value={formatWon(summary.data.expense)} tone="expense" />
                <Row label="지난달 지출" value={formatWon(summary.data.prevExpense)} />
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <Row label="순수익" value={formatWon(summary.data.net)} tone={summary.data.net < 0 ? 'expense' : 'text'} bold />
              </Card>
            </Animated.View>
          )}
        </>
      )}
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <AppText variant="caption" tone="textSub">{label}</AppText>
    </View>
  );
}

function Row({ label, value, tone = 'text', bold }: { label: string; value: string; tone?: 'text' | 'income' | 'expense'; bold?: boolean }) {
  return (
    <View style={styles.between}>
      <AppText tone="textSub">{label}</AppText>
      <AppText variant={bold ? 'heading' : 'body'} tone={tone}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', gap: 10 },
});
