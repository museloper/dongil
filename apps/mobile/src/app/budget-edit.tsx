import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentMonth, formatWon, shiftMonth, type BudgetDto, type CategoryDto } from '@dongil/shared';
import { CategoryIcon } from '@/components/category-icon';
import { MoneyInput } from '@/components/money-input';
import { AppText, Button, Card, IconButton, Loading, haptic } from '@/components/ui';
import { useBudget, useCategories, useSaveBudget } from '@/features/queries';
import { closeModal } from '@/lib/nav';
import { api } from '@/lib/api';
import { formatMonthLabel } from '@/lib/date';
import { useTheme } from '@/theme/theme';

export default function BudgetEditScreen() {
  const { month = currentMonth() } = useLocalSearchParams<{ month?: string }>();
  const budget = useBudget(month);
  const categories = useCategories();

  if (!budget.data || !categories.data) return <Loading />;
  return (
    <BudgetEditor
      month={month}
      initial={budget.data}
      categories={categories.data.filter((c) => c.type === 'EXPENSE')}
    />
  );
}

const toState = (b: BudgetDto) => ({
  total: b.items.find((i) => i.categoryId === null)?.amount ?? 0,
  byCat: Object.fromEntries(b.items.filter((i) => i.categoryId).map((i) => [i.categoryId!, i.amount])) as Record<string, number>,
});

function BudgetEditor({ month, initial, categories }: { month: string; initial: BudgetDto; categories: CategoryDto[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const save = useSaveBudget();
  const [state, setState] = useState(() => toState(initial));
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const catSum = Object.values(state.byCat).reduce((a, b) => a + b, 0);

  const copyPrev = async () => {
    setCopying(true);
    try {
      const prev = await api<BudgetDto>('/budgets', { query: { month: shiftMonth(month, -1) } });
      if (!prev.items.length) setError('지난달 예산이 없어요');
      else {
        setState(toState(prev));
        setError(null);
        haptic('success');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCopying(false);
    }
  };

  const submit = () => {
    const items = [
      ...(state.total ? [{ categoryId: null, amount: state.total }] : []),
      ...Object.entries(state.byCat)
        .filter(([, v]) => v > 0)
        .map(([categoryId, amount]) => ({ categoryId, amount })),
    ];
    save.mutate(
      { month, items },
      {
        onSuccess: () => {
          haptic('success');
          closeModal();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 16 }]}>
        <IconButton name="close" label="닫기" onPress={() => closeModal()} />
        <AppText variant="heading">{formatMonthLabel(month)} 예산</AppText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <AppText variant="heading">한 달 전체 예산</AppText>
          <MoneyInput value={state.total} onChange={(total) => setState((s) => ({ ...s, total }))} placeholder="예: 1,000,000" />
          {state.total > 0 && catSum > state.total && (
            <AppText variant="caption" tone="warn">
              카테고리 예산 합계({formatWon(catSum)})가 전체 예산보다 커요
            </AppText>
          )}
        </Card>

        <Card style={{ gap: 14 }}>
          <View style={styles.between}>
            <AppText variant="heading">카테고리별 예산</AppText>
            <AppText variant="caption" tone="textSub">합계 {formatWon(catSum)}</AppText>
          </View>
          {categories.map((c) => (
            <View key={c.id} style={styles.catRow}>
              <CategoryIcon icon={c.icon} color={c.color} size={36} />
              <AppText style={{ width: 56 }} numberOfLines={1}>{c.name}</AppText>
              <View style={{ flex: 1 }}>
                <MoneyInput
                  value={state.byCat[c.id] ?? 0}
                  onChange={(v) => setState((s) => ({ ...s, byCat: { ...s.byCat, [c.id]: v } }))}
                  placeholder="없음"
                />
              </View>
            </View>
          ))}
        </Card>

        <Button title="지난달 예산 불러오기" kind="ghost" icon="copy-outline" onPress={copyPrev} loading={copying} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
        {error && <AppText tone="expense" style={{ textAlign: 'center' }}>{error}</AppText>}
        <Button title="저장하기" onPress={submit} loading={save.isPending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
