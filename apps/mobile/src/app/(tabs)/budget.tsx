import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { currentMonth, formatWon, toLocalDateKey } from '@dongil/shared';
import { CategoryIcon } from '@/components/category-icon';
import { CountUp } from '@/components/money';
import { MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { AppText, Button, Card, EmptyState, ErrorState, ProgressBar } from '@/components/ui';
import { useBudget } from '@/features/queries';
import { daysInMonth } from '@/lib/date';
import { useMonth } from '@/lib/ui-store';
import { useTheme } from '@/theme/theme';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const month = useMonth((s) => s.month);
  const budget = useBudget(month);
  const items = budget.data?.items ?? [];
  const total = items.find((i) => i.categoryId === null);
  const perCategory = items.filter((i) => i.categoryId !== null);

  // 이번 달이면 남은 일수로 "하루 권장 지출" 계산
  const isCurrent = month === currentMonth();
  const daysLeft = isCurrent ? daysInMonth(month) - Number(toLocalDateKey(new Date()).slice(8)) + 1 : 0;
  const remaining = total ? total.amount - total.spent : 0;

  const edit = () => router.push({ pathname: '/budget-edit', params: { month } });

  return (
    <Screen
      title="예산"
      right={<MonthSwitcher variant="heading" />}
      refreshing={budget.isRefetching}
      onRefresh={() => budget.refetch()}>
      {budget.error ? (
        <ErrorState error={budget.error} onRetry={() => budget.refetch()} />
      ) : !budget.isLoading && items.length === 0 ? (
        <Card>
          <EmptyState
            icon="flag-outline"
            title="이 달 예산이 없어요"
            description={'한 달 예산과 카테고리별 한도를 정해두면\n얼마나 썼는지 한눈에 보여요'}
            action={<Button title="예산 만들기" icon="add" onPress={edit} style={{ marginTop: 8, alignSelf: 'stretch' }} />}
          />
        </Card>
      ) : (
        <>
          {total && (
            <Animated.View entering={FadeInDown.duration(450)}>
              <Card style={{ gap: 14 }}>
                <AppText tone="textSub">{remaining >= 0 ? '쓸 수 있는 돈' : '예산 초과'}</AppText>
                <CountUp value={Math.abs(remaining)} tone={remaining < 0 ? 'expense' : 'text'} />
                <ProgressBar ratio={total.ratio} height={12} />
                <View style={styles.between}>
                  <AppText variant="label" tone="textSub">
                    {formatWon(total.spent)} / {formatWon(total.amount)}
                  </AppText>
                  <AppText variant="label" tone={total.ratio >= 1 ? 'expense' : total.ratio >= 0.8 ? 'warn' : 'primary'}>
                    {Math.round(total.ratio * 100)}%
                  </AppText>
                </View>
                {isCurrent && remaining > 0 && daysLeft > 0 && (
                  <View style={[styles.tip, { borderTopColor: colors.border }]}>
                    <AppText variant="label" tone="textSub">
                      남은 {daysLeft}일 동안 하루 {formatWon(Math.floor(remaining / daysLeft))}씩 쓸 수 있어요
                    </AppText>
                  </View>
                )}
              </Card>
            </Animated.View>
          )}

          {perCategory.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(450)}>
              <Card style={{ gap: 18 }}>
                <AppText variant="heading">카테고리 예산</AppText>
                {perCategory.map((b) => (
                  <View key={b.categoryId} style={styles.catRow}>
                    <CategoryIcon icon={b.icon ?? 'help'} color={b.color ?? '#ADB5BD'} size={38} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.between}>
                        <AppText>{b.categoryName}</AppText>
                        <AppText variant="label" tone={b.ratio >= 1 ? 'expense' : b.ratio >= 0.8 ? 'warn' : 'textSub'}>
                          {b.ratio >= 1 ? `${formatWon(b.spent - b.amount)} 초과` : `${formatWon(b.amount - b.spent)} 남음`}
                        </AppText>
                      </View>
                      <ProgressBar ratio={b.ratio} />
                      <AppText variant="caption" tone="textMuted">
                        {formatWon(b.spent)} / {formatWon(b.amount)}
                      </AppText>
                    </View>
                  </View>
                ))}
              </Card>
            </Animated.View>
          )}

          <Button title="예산 편집" kind="secondary" icon="create-outline" onPress={edit} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tip: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
