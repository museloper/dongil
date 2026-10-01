import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { compactWon, formatWon, toLocalDateKey, type TransactionDto, type TxType } from '@dongil/shared';
import { MonthSwitcher } from '@/components/month-switcher';
import { Fab, Screen } from '@/components/screen';
import { TransactionRow } from '@/components/transaction-row';
import { AppText, Card, Chip, EmptyState, ErrorState, Loading, Segmented, haptic } from '@/components/ui';
import { monthFilter, useCalendar, useDeleteTransaction, useTransactions, type TxFilter } from '@/features/queries';
import { dayOfWeek, dayRangeIso, daysInMonth, formatDayLabel } from '@/lib/date';
import { useMonth } from '@/lib/ui-store';
import { useTheme } from '@/theme/theme';

type Mode = 'list' | 'calendar';
const TYPE_FILTERS: { value: TxType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'EXPENSE', label: '지출' },
  { value: 'INCOME', label: '수입' },
  { value: 'TRANSFER', label: '이체' },
];

export default function TransactionsScreen() {
  const [mode, setMode] = useState<Mode>('list');
  return (
    <View style={{ flex: 1 }}>
      <Screen scroll={false} title="내역" right={<MonthSwitcher variant="heading" />}>
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'list', label: '리스트' },
              { value: 'calendar', label: '캘린더' },
            ]}
          />
        </View>
        {mode === 'list' ? <ListView /> : <CalendarView />}
      </Screen>
      <Fab />
    </View>
  );
}

// ---------------- 리스트 ----------------

function groupByDay(items: TransactionDto[]) {
  const map = new Map<string, TransactionDto[]>();
  for (const tx of items) {
    const key = toLocalDateKey(new Date(tx.occurredAt));
    map.set(key, [...(map.get(key) ?? []), tx]);
  }
  return [...map.entries()].map(([day, data]) => ({
    day,
    data,
    net: data.reduce((a, t) => a + (t.type === 'INCOME' ? t.amount : t.type === 'EXPENSE' ? -t.amount : 0), 0),
  }));
}

function ListView() {
  const { colors } = useTheme();
  const month = useMonth((s) => s.month);
  const [type, setType] = useState<TxType | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const filter: TxFilter = { ...monthFilter(month), type: type === 'ALL' ? undefined : type, q: q.trim() || undefined };
  const query = useTransactions(filter);
  const remove = useDeleteTransaction();

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const sections = useMemo(() => groupByDay(items), [items]);

  const confirmDelete = (tx: TransactionDto, close: () => void) => {
    const run = () => remove.mutate(tx.id, { onSuccess: () => haptic('success') });
    if (Platform.OS === 'web') return run();
    Alert.alert('삭제할까요?', `${formatWon(tx.amount)} 내역이 삭제돼요`, [
      { text: '취소', style: 'cancel', onPress: close },
      { text: '삭제', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 8 }}>
        <View style={[styles.search, { backgroundColor: colors.fill }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="메모, 카테고리 검색"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: 15 }}
            returnKeyType="search"
          />
          {q ? <Ionicons name="close-circle" size={18} color={colors.textMuted} onPress={() => setQ('')} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TYPE_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={type === f.value} onPress={() => setType(f.value)} />
          ))}
        </ScrollView>
      </View>

      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Loading />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.textMuted} />}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={q || type !== 'ALL' ? '조건에 맞는 내역이 없어요' : '이 달은 기록이 없어요'}
              description="오른쪽 아래 + 버튼으로 기록해 보세요"
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <AppText variant="label" tone="textSub">{formatDayLabel(section.day)}</AppText>
              <AppText variant="caption" tone="textMuted">
                {section.net > 0 ? '+' : ''}
                {formatWon(section.net)}
              </AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <ReanimatedSwipeable
              friction={2}
              rightThreshold={40}
              renderRightActions={(_p, _d, methods) => (
                <Pressable
                  onPress={() => confirmDelete(item, methods.close)}
                  style={[styles.deleteAction, { backgroundColor: colors.expense }]}>
                  <Ionicons name="trash" size={20} color="#fff" />
                  <AppText variant="caption" style={{ color: '#fff' }}>삭제</AppText>
                </Pressable>
              )}>
              <View style={{ backgroundColor: colors.bg }}>
                <TransactionRow tx={item} />
              </View>
            </ReanimatedSwipeable>
          )}
          ListFooterComponent={query.isFetchingNextPage ? <Loading /> : null}
        />
      )}
    </View>
  );
}

// ---------------- 캘린더 ----------------

function CalendarView() {
  const { colors } = useTheme();
  const month = useMonth((s) => s.month);
  const calendar = useCalendar(month);
  const today = toLocalDateKey(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDay = selected?.startsWith(month) ? selected : null;
  const dayTx = useTransactions(selectedDay ? dayRangeIso(selectedDay) : {}, 50, !!selectedDay);

  const byDay = new Map(calendar.data?.map((d) => [d.date, d]));
  const first = `${month}-01`;
  const lead = dayOfWeek(first);
  const count = daysInMonth(month);
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  while (cells.length % 7) cells.push(null);

  const totalIncome = calendar.data?.reduce((a, d) => a + d.income, 0) ?? 0;
  const totalExpense = calendar.data?.reduce((a, d) => a + d.expense, 0) ?? 0;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}>
      <Card style={{ paddingHorizontal: 8, paddingVertical: 14 }}>
        <View style={styles.summaryRow}>
          <AppText variant="label" tone="income">수입 {formatWon(totalIncome)}</AppText>
          <AppText variant="label" tone="expense">지출 {formatWon(totalExpense)}</AppText>
        </View>
        <View style={styles.week}>
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <AppText key={d} variant="caption" tone={i === 0 ? 'expense' : 'textMuted'} style={styles.weekCell}>
              {d}
            </AppText>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((key, i) => {
            if (!key) return <View key={`e${i}`} style={styles.cell} />;
            const d = byDay.get(key);
            const isSel = key === selectedDay;
            const isToday = key === today;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  haptic();
                  setSelected(isSel ? null : key);
                }}
                style={[styles.cell, isSel && { backgroundColor: colors.primarySoft, borderRadius: 12 }]}>
                <View style={[styles.dayNum, isToday && { backgroundColor: colors.primary }]}>
                  <AppText variant="label" style={isToday ? { color: colors.onPrimary } : undefined}>
                    {Number(key.slice(8))}
                  </AppText>
                </View>
                {d?.income ? (
                  <AppText variant="caption" tone="income" style={styles.amt} numberOfLines={1}>
                    +{compactWon(d.income)}
                  </AppText>
                ) : null}
                {d?.expense ? (
                  <AppText variant="caption" tone="expense" style={styles.amt} numberOfLines={1}>
                    -{compactWon(d.expense)}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {selectedDay && (
        <Card>
          <AppText variant="heading" style={{ marginBottom: 8 }}>{formatDayLabel(selectedDay)}</AppText>
          {dayTx.isLoading ? (
            <Loading />
          ) : dayTx.data?.pages[0]?.items.length ? (
            dayTx.data.pages.flatMap((p) => p.items).map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          ) : (
            <AppText tone="textSub" style={{ paddingVertical: 12 }}>이 날은 기록이 없어요</AppText>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 12, paddingHorizontal: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, paddingBottom: 4 },
  deleteAction: { width: 80, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 14, marginLeft: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  week: { flexDirection: 'row', marginBottom: 6 },
  weekCell: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 64, alignItems: 'center', paddingTop: 4, gap: 1 },
  dayNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  amt: { fontSize: 10, letterSpacing: -0.4 },
});
