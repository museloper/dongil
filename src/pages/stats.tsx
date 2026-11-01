import { formatWon } from '@/shared';
import { CategoryIcon } from '@/components/category-icon';
import { DonutChart, TrendBars } from '@/components/charts';
import { CountUp } from '@/components/money';
import { MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { AppText, Card, EmptyState, ErrorState, ProgressBar, SectionTitle } from '@/components/ui';
import { useByCategory, useSummary, useTrend } from '@/features/queries';
import { useMonth } from '@/lib/ui-store';
import type { ColorToken } from '@/theme/tokens';

export default function StatsPage() {
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
    <Screen title="통계" right={<MonthSwitcher />}>
      {byCat.error ? (
        <ErrorState error={byCat.error} onRetry={refresh} />
      ) : (
        <>
          <Card className="fade-in-up" style={{ display: 'grid', justifyItems: 'center', gap: 20 }}>
            <AppText variant="heading" style={{ justifySelf: 'stretch' }}>카테고리별 지출</AppText>
            {cats.length ? (
              <>
                <DonutChart data={cats.map((c) => ({ key: c.categoryId, value: c.amount, color: c.color }))}>
                  <AppText variant="caption" tone="textSub">총 지출</AppText>
                  <CountUp value={expense} variant="heading" />
                </DonutChart>
                <div style={{ justifySelf: 'stretch', display: 'grid', gap: 14 }}>
                  {cats.map((c, i) => (
                    <div key={c.categoryId} className="row fade-in-up" style={{ gap: 12, animationDelay: `${120 + i * 40}ms` }}>
                      <CategoryIcon icon={c.icon} color={c.color} size={36} />
                      <div style={{ flex: 1, display: 'grid', gap: 6, minWidth: 0 }}>
                        <div className="row between" style={{ gap: 8 }}>
                          <AppText lines={1}>
                            {c.name}{' '}
                            <AppText variant="label" tone="textMuted">{Math.round(c.ratio * 100)}%</AppText>
                          </AppText>
                          <AppText variant="heading" className="tabular nowrap">{formatWon(c.amount)}</AppText>
                        </div>
                        <ProgressBar ratio={c.ratio} height={6} color={c.color} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              !byCat.isLoading && <EmptyState icon="pie-chart-outline" title="지출 기록이 없어요" />
            )}
          </Card>

          <Card className="fade-in-up" style={{ animationDelay: '80ms' }}>
            <SectionTitle
              title="최근 6개월"
              right={
                <span className="row" style={{ gap: 10 }}>
                  <Legend color="var(--income)" label="수입" />
                  <Legend color="var(--expense)" label="지출" />
                </span>
              }
            />
            {trend.data && <TrendBars data={trend.data} />}
          </Card>

          {summary.data && (
            <Card className="fade-in-up" style={{ animationDelay: '160ms', display: 'grid', gap: 12 }}>
              <AppText variant="heading">이번 달 한눈에</AppText>
              <Row label="수입" value={formatWon(summary.data.income)} tone="income" />
              <Row label="지출" value={formatWon(summary.data.expense)} tone="expense" />
              <Row label="지난달 지출" value={formatWon(summary.data.prevExpense)} />
              <hr className="divider" />
              <Row label="순수익" value={formatWon(summary.data.net)} tone={summary.data.net < 0 ? 'expense' : 'text'} bold />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="row" style={{ gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <AppText variant="caption" tone="textSub">{label}</AppText>
    </span>
  );
}

function Row({ label, value, tone = 'text', bold }: { label: string; value: string; tone?: ColorToken; bold?: boolean }) {
  return (
    <div className="row between">
      <AppText tone="textSub">{label}</AppText>
      <AppText variant={bold ? 'heading' : 'body'} tone={tone} className="tabular">{value}</AppText>
    </div>
  );
}
