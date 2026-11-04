import { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { formatWon, toLocalDateKey } from '@dongil/shared';
import { SubScreen } from '@/components/screen';
import { groupByDay, TransactionRow } from '@/components/transaction-row';
import { AppText, Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useTags, useTransactions } from '@/features/queries';
import { formatDayLabel } from '@/lib/date';

/** 전체 기간을 보여주므로 올해가 아닌 날짜에는 연도를 붙인다 */
const dayLabel = (day: string) => {
  const year = day.slice(0, 4);
  return year === toLocalDateKey(new Date()).slice(0, 4) ? formatDayLabel(day) : `${year}년 ${formatDayLabel(day)}`;
};

export default function TagPage() {
  const { id } = useParams<{ id: string }>();
  const tag = useTags().data?.find((t) => t.id === id);
  const query = useTransactions({ tagId: id });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const sections = useMemo(() => groupByDay(items), [items]);

  // 목록 끝이 보이면 다음 페이지
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SubScreen title="태그 내역">
      {tag && (
        <Card style={{ display: 'grid', gap: 4 }}>
          <AppText tone="primary" lines={1}>#{tag.name}</AppText>
          <AppText variant="hero" className="tabular" style={{ fontSize: 28 }}>{formatWon(tag.total)}</AppText>
          <AppText variant="caption" tone="textSub">전체 기간 지출 {tag.count}건</AppText>
        </Card>
      )}
      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Loading />
      ) : sections.length === 0 ? (
        <EmptyState icon="pricetag-outline" title="이 태그가 달린 내역이 없어요" description="태그가 달린 지출을 지우면 태그도 함께 사라져요" />
      ) : (
        <div>
          {sections.map((section) => (
            <section key={section.day}>
              <div className="row between day-header">
                <AppText variant="label" tone="textSub">{dayLabel(section.day)}</AppText>
              </div>
              {section.data.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
            </section>
          ))}
          <div ref={sentinel} />
          {query.isFetchingNextPage && <Loading />}
        </div>
      )}
    </SubScreen>
  );
}
