import { useNavigate } from 'react-router';
import { formatWon } from '@dongil/shared';
import { BookSwitcher } from '@/components/book-switcher';
import { tint } from '@/components/category-icon';
import { Icon } from '@/components/icon';
import { CountUp } from '@/components/money';
import { MonthSwitcher } from '@/components/month-switcher';
import { Fab, Screen } from '@/components/screen';
import { TransactionRow } from '@/components/transaction-row';
import { AppText, Button, Card, EmptyState, ErrorState, Pressable, ProgressBar, SectionTitle } from '@/components/ui';
import { monthFilter, useAccounts, useBudget, useSummary, useTransactions } from '@/features/queries';
import { useMonth } from '@/lib/ui-store';

const enter = (i: number) => ({ animationDelay: `${i * 70}ms` });

export default function HomePage() {
  const navigate = useNavigate();
  const month = useMonth((s) => s.month);
  const summary = useSummary(month);
  const budget = useBudget(month);
  const accounts = useAccounts();
  const recent = useTransactions(monthFilter(month), 5);

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
    <>
      <Screen title={<BookSwitcher />} right={<MonthSwitcher />}>
        {summary.error ? (
          <ErrorState error={summary.error} onRetry={refresh} />
        ) : (
          <>
            {/* 이번 달 요약 */}
            <Card className="fade-in-up" style={{ ...enter(0), display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <AppText tone="textSub">이번 달 남은 돈</AppText>
                <CountUp value={s?.net ?? 0} tone={(s?.net ?? 0) < 0 ? 'expense' : 'text'} />
                {s?.expenseChangeRate != null && <ChangeBadge rate={s.expenseChangeRate} />}
              </div>
              <div className="split">
                <Stat label="수입" value={s?.income ?? 0} color="var(--income)" icon="arrow-down" />
                <span className="split-line" />
                <Stat label="지출" value={s?.expense ?? 0} color="var(--expense)" icon="arrow-up" />
              </div>
            </Card>

            {/* 예산 */}
            <Pressable onClick={() => navigate('/budget')} className="fade-in-up block" style={enter(1)}>
              <Card style={{ display: 'grid', gap: 12 }}>
                {total ? (
                  <>
                    <div className="row between">
                      <AppText variant="heading">한 달 예산</AppText>
                      <AppText tone={total.ratio >= 1 ? 'expense' : 'textSub'} variant="label">
                        {Math.round(total.ratio * 100)}% 사용
                      </AppText>
                    </div>
                    <ProgressBar ratio={total.ratio} height={10} />
                    <AppText tone="textSub">
                      {total.amount - total.spent >= 0
                        ? `${formatWon(total.amount - total.spent)} 남았어요`
                        : `${formatWon(total.spent - total.amount)} 초과했어요`}
                    </AppText>
                  </>
                ) : (
                  <div className="row between">
                    <div style={{ display: 'grid', gap: 4 }}>
                      <AppText variant="heading">예산을 세워볼까요?</AppText>
                      <AppText tone="textSub">목표를 정하면 지출이 보여요</AppText>
                    </div>
                    <Icon name="chevron-forward" size={20} color="var(--textMuted)" />
                  </div>
                )}
              </Card>
            </Pressable>

            {/* 자산 */}
            <Card padded={false} className="fade-in-up" style={{ ...enter(2), padding: '20px 0' }}>
              <div className="row between" style={{ padding: '0 20px', marginBottom: 14 }}>
                <div style={{ display: 'grid', gap: 2 }}>
                  <AppText tone="textSub" variant="label">총 자산</AppText>
                  <AppText variant="heading" className="tabular">{formatWon(totalAssets)}</AppText>
                </div>
                <Pressable onClick={() => navigate('/accounts')}>
                  <AppText tone="primary" variant="label">관리</AppText>
                </Pressable>
              </div>
              <div className="hscroll" style={{ padding: '0 20px' }}>
                {accounts.data?.map((a) => (
                  <div key={a.id} className="account-tile">
                    <span className="dot" style={{ backgroundColor: a.color }} />
                    <AppText variant="caption" tone="textSub" lines={1}>{a.name}</AppText>
                    <AppText variant="label" lines={1} className="tabular">{formatWon(a.balance)}</AppText>
                  </div>
                ))}
              </div>
            </Card>

            {/* 최근 거래 */}
            <Card className="fade-in-up" style={enter(3)}>
              <SectionTitle
                title="최근 내역"
                right={
                  <Pressable onClick={() => navigate('/transactions')}>
                    <AppText tone="primary" variant="label">전체보기</AppText>
                  </Pressable>
                }
              />
              {recentItems.length ? (
                recentItems.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              ) : recent.isLoading ? null : (
                <EmptyState
                  icon="sparkles-outline"
                  title="아직 기록이 없어요"
                  description="첫 거래를 기록해 보세요"
                  action={<Button title="기록하기" kind="secondary" icon="add" onClick={() => navigate('/transaction/new')} />}
                />
              )}
            </Card>
          </>
        )}
      </Screen>
      <Fab />
    </>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon: 'arrow-up' | 'arrow-down' }) {
  return (
    <div style={{ flex: 1, display: 'grid', gap: 4, minWidth: 0 }}>
      <span className="row" style={{ gap: 4 }}>
        <Icon name={icon} size={14} color={color} />
        <AppText variant="label" tone="textSub">{label}</AppText>
      </span>
      <CountUp value={value} variant="heading" />
    </div>
  );
}

function ChangeBadge({ rate }: { rate: number }) {
  const up = rate > 0;
  const color = up ? 'var(--expense)' : 'var(--success)';
  return (
    <span className="badge" style={{ backgroundColor: tint(color, 12) }}>
      <Icon name={up ? 'trending-up' : 'trending-down'} size={14} color={color} />
      <AppText variant="caption" style={{ color, fontWeight: 700 }}>
        지난달보다 지출 {Math.abs(Math.round(rate * 100))}% {up ? '늘었어요' : '줄었어요'}
      </AppText>
    </span>
  );
}
