import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { formatWon, toLocalDateKey } from '@dongil/shared';
import { groupByDay, TransactionRow } from '@/components/transaction-row';
import { AppText, Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useTags, useTransactions } from '@/features/queries';
import { formatDayLabel } from '@/lib/date';
import { useTheme } from '@/theme/theme';

/** 전체 기간을 보여주므로 올해가 아닌 날짜에는 연도를 붙인다 */
const dayLabel = (day: string) => {
  const year = day.slice(0, 4);
  return year === toLocalDateKey(new Date()).slice(0, 4) ? formatDayLabel(day) : `${year}년 ${formatDayLabel(day)}`;
};

export default function TagScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tag = useTags().data?.find((t) => t.id === id);
  const query = useTransactions({ tagId: id });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const sections = useMemo(() => groupByDay(items), [items]);

  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.isLoading) return <Loading />;
  return (
    <SectionList
      sections={sections}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.body}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.textMuted} />}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        tag ? (
          <Card style={{ gap: 4, marginBottom: 8 }}>
            <AppText tone="primary" numberOfLines={1}>#{tag.name}</AppText>
            <AppText variant="hero" style={{ fontSize: 28 }}>{formatWon(tag.total)}</AppText>
            <AppText variant="caption" tone="textSub">전체 기간 지출 {tag.count}건</AppText>
          </Card>
        ) : null
      }
      ListEmptyComponent={<EmptyState icon="pricetag-outline" title="이 태그가 달린 내역이 없어요" description="태그가 달린 지출을 지우면 태그도 함께 사라져요" />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <AppText variant="label" tone="textSub">{dayLabel(section.day)}</AppText>
        </View>
      )}
      renderItem={({ item }) => <TransactionRow tx={item} />}
      ListFooterComponent={query.isFetchingNextPage ? <Loading /> : null}
    />
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 48 },
  sectionHeader: { paddingTop: 16, paddingBottom: 4 },
});
