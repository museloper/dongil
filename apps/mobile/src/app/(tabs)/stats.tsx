import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatWon, type Importance, type SummaryDto } from '@dongil/shared';
import { CategoryIcon } from '@/components/category-icon';
import { DonutChart, TrendBars } from '@/components/charts';
import { CountUp } from '@/components/money';
import { MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { AppText, Card, Chip, EmptyState, ErrorState, PressableScale, ProgressBar, SectionTitle } from '@/components/ui';
import { useAccounts, useByCategory, useByImportance, useByTag, useCurrentBook, useSummary, useTrend, type StatFilter } from '@/features/queries';
import { useMonth } from '@/lib/ui-store';
import { useTheme } from '@/theme/theme';

type Picked = { id: string; name: string };

const importanceLabel = (level: Importance | null) => level ?? '미지정';

export default function StatsScreen() {
  const { book } = useCurrentBook();
  // 가계부를 바꾸면 그 가계부에 없는 계좌·카테고리·태그 조건을 함께 비운다
  return <Stats key={book?.id} />;
}

function Stats() {
  const { colors } = useTheme();
  const month = useMonth((s) => s.month);
  const accounts = useAccounts().data ?? [];
  const [picked, setPicked] = useState<string>();
  // 보관(삭제)된 계좌를 고른 채로 남지 않게, 목록에 없으면 전체로 본다
  const account = accounts.find((a) => a.id === picked);
  const accountId = account?.id;
  const summary = useSummary(month, accountId);
  const [importance, setImportance] = useState<StatFilter['importance']>();
  const [category, setCategory] = useState<Picked>();
  const [tag, setTag] = useState<Picked>();
  const categoryId = category?.id;
  const tagId = tag?.id;
  // 카드마다 자기 조건을 뺀 나머지 조건으로 계산해, 고른 뒤에도 다른 항목을 비교하고 바꿀 수 있게 한다
  const byCat = useByCategory(month, accountId, { importance, tagId });
  const byImportance = useByImportance(month, accountId, { categoryId, tagId });
  const byTag = useByTag(month, accountId, { importance, categoryId });
  const trend = useTrend(month, 6, accountId);

  const refresh = () => {
    summary.refetch();
    byCat.refetch();
    byImportance.refetch();
    byTag.refetch();
    trend.refetch();
  };
  const cats = byCat.data ?? [];
  const importanceRows = byImportance.data ?? [];
  const tags = byTag.data ?? [];
  const catTotal = cats.reduce((sum, c) => sum + c.amount, 0);
  const hasFilter = !!(importance || category || tag);
  const filteredTotal = importance
    ? (importanceRows.find((row) => (row.importance ?? 'NONE') === importance)?.amount ?? 0)
    : importanceRows.reduce((sum, row) => sum + row.amount, 0);
  const error = byCat.error ?? byImportance.error ?? byTag.error;

  return (
    <Screen title="통계" right={<MonthSwitcher variant="heading" />} refreshing={byCat.isRefetching} onRefresh={refresh}>
      {accounts.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="전체" active={!accountId} onPress={() => setPicked(undefined)} />
          {accounts.map((a) => (
            <Chip key={a.id} label={a.name} active={a.id === accountId} color={a.color} onPress={() => setPicked(a.id)} />
          ))}
        </ScrollView>
      )}
      {error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : (
        <>
          {hasFilter ? (
            <Card style={{ gap: 12 }}>
              <View style={styles.between}>
                <AppText variant="label" tone="textSub">선택한 조건의 지출</AppText>
                <AppText variant="heading">{formatWon(filteredTotal)}</AppText>
              </View>
              <View style={styles.chips}>
                {importance && <Chip label={`${importance === 'NONE' ? '미지정' : importance} ×`} active onPress={() => setImportance(undefined)} />}
                {category && <Chip label={`${category.name} ×`} active onPress={() => setCategory(undefined)} />}
                {tag && <Chip label={`#${tag.name} ×`} active onPress={() => setTag(undefined)} />}
              </View>
            </Card>
          ) : (
            <AppText variant="caption" tone="textMuted">항목을 누르면 중요도·카테고리·태그를 겹쳐서 볼 수 있어요</AppText>
          )}

          <Animated.View entering={FadeInDown.duration(450)}>
            <Card style={{ alignItems: 'center', gap: 20 }}>
              <View style={{ alignSelf: 'stretch' }}>
                <AppText variant="heading">카테고리별 지출</AppText>
              </View>
              {cats.length ? (
                <>
                  <DonutChart data={cats.map((c) => ({ key: c.categoryId, value: c.amount, color: c.color }))}>
                    <AppText variant="caption" tone="textSub">{importance || tag ? '조건의 지출' : '총 지출'}</AppText>
                    <CountUp value={catTotal} variant="heading" />
                  </DonutChart>
                  <View style={{ alignSelf: 'stretch', gap: 14 }}>
                    {cats.map((c, i) => (
                      <Animated.View key={c.categoryId} entering={FadeInDown.delay(120 + i * 40).duration(400)}>
                        <PressableScale
                          scaleTo={0.98}
                          onPress={() => setCategory(c.categoryId === categoryId ? undefined : { id: c.categoryId, name: c.name })}
                          style={[styles.statRow, styles.catRow, c.categoryId === categoryId && { backgroundColor: colors.primarySoft }]}>
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
                        </PressableScale>
                      </Animated.View>
                    ))}
                  </View>
                </>
              ) : (
                !byCat.isLoading && <EmptyState icon="pie-chart-outline" title="지출 기록이 없어요" />
              )}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(450)}>
            <Card style={{ gap: 14 }}>
              <AppText variant="heading">중요도별 지출</AppText>
              {importanceRows.map((row) => {
                const value = row.importance ?? 'NONE';
                const active = importance === value;
                return (
                  <PressableScale
                    key={value}
                    scaleTo={0.98}
                    onPress={() => setImportance(active ? undefined : value)}
                    style={[styles.statRow, styles.catRow, active && { backgroundColor: colors.primarySoft }]}>
                    <View style={[styles.level, { backgroundColor: row.importance ? colors.primarySoft : colors.fill }]}>
                      <AppText variant="label" tone={row.importance ? 'primary' : 'textSub'}>{row.importance ?? '-'}</AppText>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.between}>
                        <AppText>
                          {importanceLabel(row.importance)}{' '}
                          <AppText variant="label" tone="textMuted">{Math.round(row.ratio * 100)}%</AppText>
                        </AppText>
                        <AppText variant="heading">{formatWon(row.amount)}</AppText>
                      </View>
                      <ProgressBar ratio={row.ratio} height={6} color={row.importance ? colors.primary : colors.textMuted} />
                    </View>
                  </PressableScale>
                );
              })}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(450)}>
            <Card style={{ gap: 14 }}>
              <AppText variant="heading">태그별 지출</AppText>
              {tags.length ? (
                <>
                  {tags.map((t) => {
                    const active = t.tagId === tagId;
                    return (
                      <PressableScale
                        key={t.tagId}
                        scaleTo={0.98}
                        onPress={() => setTag(active ? undefined : { id: t.tagId, name: t.name })}
                        style={[styles.statRow, { gap: 6 }, active && { backgroundColor: colors.primarySoft }]}>
                        <View style={styles.between}>
                          <AppText numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
                            #{t.name}{' '}
                            <AppText variant="label" tone="textMuted">{t.count}건 · {Math.round(t.ratio * 100)}%</AppText>
                          </AppText>
                          <AppText variant="heading">{formatWon(t.amount)}</AppText>
                        </View>
                        <ProgressBar ratio={t.ratio} height={6} color={colors.primary} />
                      </PressableScale>
                    );
                  })}
                  <AppText variant="caption" tone="textMuted">태그가 여러 개인 지출은 태그마다 더해서, 합계가 총 지출보다 클 수 있어요</AppText>
                </>
              ) : (
                <AppText tone="textSub">{hasFilter ? '이 조건에 태그가 달린 지출이 없어요' : '지출에 태그를 달면 여기에 모여요'}</AppText>
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
                <AppText variant="heading">{account ? `${account.name} 이번 달` : '이번 달 한눈에'}</AppText>
                <Row label="수입" value={formatWon(summary.data.income)} tone="income" />
                <Row label="지출" value={formatWon(summary.data.expense)} tone="expense" />
                <Row label="지난달 지출" value={formatWon(summary.data.prevExpense)} />
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <Row label="순수익" value={formatWon(summary.data.net)} tone={summary.data.net < 0 ? 'expense' : 'text'} bold />
                {account ? (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                    <Row label="다른 통장에서 받은 돈" value={formatWon(summary.data.transferIn)} />
                    <Row label="다른 통장으로 보낸 돈" value={formatWon(summary.data.transferOut)} />
                    <Row label="통장 잔액 변화" value={signedWon(balanceChange(summary.data))} bold />
                  </>
                ) : (
                  summary.data.transferOut > 0 && (
                    <>
                      <View style={{ height: 1, backgroundColor: colors.border }} />
                      <Row label="통장 간 이체" value={formatWon(summary.data.transferOut)} />
                      <AppText variant="caption" tone="textMuted">통장끼리 옮긴 돈은 수입·지출에 넣지 않아요</AppText>
                    </>
                  )
                )}
              </Card>
            </Animated.View>
          )}
        </>
      )}
    </Screen>
  );
}

/** 수입·지출에 이체까지 더한 그 통장의 이번 달 잔액 변화 */
const balanceChange = (s: SummaryDto) => s.income - s.expense + s.transferIn - s.transferOut;

const signedWon = (v: number) => (v > 0 ? '+' : v < 0 ? '-' : '') + formatWon(Math.abs(v));

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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statRow: { padding: 6, margin: -6, borderRadius: 12 },
  level: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
