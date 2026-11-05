import { categoryLabel, formatWon, type Importance, type SummaryDto } from '@dongil/shared';
import { CategoryIcon } from '@/components/category-icon';
import { Icon } from '@/components/icon';
import { DonutChart, TrendBars } from '@/components/charts';
import { CountUp } from '@/components/money';
import { MonthSwitcher } from '@/components/month-switcher';
import { Screen } from '@/components/screen';
import { useState } from 'react';
import { AppText, Card, Chip, EmptyState, ErrorState, Pressable, ProgressBar, SectionTitle } from '@/components/ui';
import { useAccounts, useByCategory, useByImportance, useByTag, useCurrentBook, useSummary, useTrend, type StatFilter } from '@/features/queries';
import { useMonth } from '@/lib/ui-store';
import type { ColorToken } from '@/theme/tokens';

type Picked = { id: string; name: string };

const importanceLabel = (level: Importance | null) => level ?? '미지정';

export default function StatsPage() {
  const { book } = useCurrentBook();
  // 가계부를 바꾸면 그 가계부에 없는 계좌·카테고리·태그 조건을 함께 비운다
  return <Stats key={book?.id} />;
}

function Stats() {
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
    <Screen title="통계" right={<MonthSwitcher />}>
      {accounts.length > 1 && (
        <div className="hscroll">
          <Chip label="전체" active={!accountId} onClick={() => setPicked(undefined)} />
          {accounts.map((a) => (
            <Chip key={a.id} label={a.name} active={a.id === accountId} color={a.color} onClick={() => setPicked(a.id)} />
          ))}
        </div>
      )}
      {error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : (
        <>
          {hasFilter ? (
            <Card className="fade-in" style={{ display: 'grid', gap: 12 }}>
              <div className="row between" style={{ gap: 8 }}>
                <AppText variant="label" tone="textSub">선택한 조건의 지출</AppText>
                <AppText variant="heading" className="tabular nowrap">{formatWon(filteredTotal)}</AppText>
              </div>
              <div className="tag-wrap">
                {importance && <Chip label={`${importance === 'NONE' ? '미지정' : importance} ×`} active onClick={() => setImportance(undefined)} />}
                {category && <Chip label={`${category.name} ×`} active onClick={() => setCategory(undefined)} />}
                {tag && <Chip label={`#${tag.name} ×`} active onClick={() => setTag(undefined)} />}
              </div>
            </Card>
          ) : (
            <AppText variant="caption" tone="textMuted">항목을 누르면 중요도·카테고리·태그를 겹쳐서 볼 수 있어요</AppText>
          )}

          <Card className="fade-in-up" style={{ display: 'grid', justifyItems: 'center', gap: 20 }}>
            <AppText variant="heading" style={{ justifySelf: 'stretch' }}>카테고리별 지출</AppText>
            {cats.length ? (
              <>
                <DonutChart data={cats.map((c) => ({ key: c.categoryId, value: c.amount, color: c.color }))}>
                  <AppText variant="caption" tone="textSub">{importance || tag ? '조건의 지출' : '총 지출'}</AppText>
                  <CountUp value={catTotal} variant="heading" />
                </DonutChart>
                <div style={{ justifySelf: 'stretch', display: 'grid', gap: 14 }}>
                  {cats.map((c, i) => {
                    const open = c.categoryId === categoryId || c.children.some((sub) => sub.categoryId === categoryId);
                    return (
                    <div key={c.categoryId} style={{ display: 'grid', gap: 10 }}>
                    <Pressable
                      className={`stat-row row fade-in-up${c.categoryId === categoryId ? ' stat-row-active' : ''}`}
                      aria-pressed={c.categoryId === categoryId}
                      style={{ gap: 12, animationDelay: `${120 + i * 40}ms` }}
                      onClick={() => setCategory(c.categoryId === categoryId ? undefined : { id: c.categoryId, name: c.name })}>
                      <CategoryIcon icon={c.icon} color={c.color} size={36} />
                      <div style={{ flex: 1, display: 'grid', gap: 6, minWidth: 0 }}>
                        <div className="row between" style={{ gap: 8 }}>
                          <AppText lines={1}>
                            {c.name}{' '}
                            <AppText variant="label" tone="textMuted">{Math.round(c.ratio * 100)}%</AppText>
                            {c.children.length > 0 && <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color="var(--textMuted)" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                          </AppText>
                          <AppText variant="heading" className="tabular nowrap">{formatWon(c.amount)}</AppText>
                        </div>
                        <ProgressBar ratio={c.ratio} height={6} color={c.color} />
                      </div>
                    </Pressable>
                    {open &&
                      c.children.map((sub) =>
                        // 상위에 바로 기록한 지출은 따로 고를 조건이 없으므로 보여 주기만 한다
                        sub.categoryId === c.categoryId ? (
                          <div key={sub.categoryId} style={{ paddingLeft: 48 }}>
                            <SubcategoryRow name="세부 없음" ratio={sub.ratio} amount={sub.amount} color={c.color} />
                          </div>
                        ) : (
                          <Pressable
                            key={sub.categoryId}
                            className={`stat-row${sub.categoryId === categoryId ? ' stat-row-active' : ''}`}
                            aria-pressed={sub.categoryId === categoryId}
                            style={{ paddingLeft: 54 }}
                            onClick={() =>
                              setCategory(
                                sub.categoryId === categoryId
                                  ? { id: c.categoryId, name: c.name }
                                  : { id: sub.categoryId, name: categoryLabel({ name: sub.name, parentName: c.name }) },
                              )
                            }>
                            <SubcategoryRow name={sub.name} ratio={sub.ratio} amount={sub.amount} color={c.color} />
                          </Pressable>
                        ),
                      )}
                    </div>
                    );
                  })}
                </div>
              </>
            ) : (
              !byCat.isLoading && <EmptyState icon="pie-chart-outline" title="지출 기록이 없어요" />
            )}
          </Card>

          <Card className="fade-in-up" style={{ animationDelay: '40ms', display: 'grid', gap: 14 }}>
            <AppText variant="heading">중요도별 지출</AppText>
            {importanceRows.map((row) => {
              const value = row.importance ?? 'NONE';
              const active = importance === value;
              return (
                <Pressable
                  key={value}
                  className={`stat-row row${active ? ' stat-row-active' : ''}`}
                  aria-pressed={active}
                  style={{ gap: 12 }}
                  onClick={() => setImportance(active ? undefined : value)}>
                  <span className="circle-icon" style={{ width: 36, height: 36, backgroundColor: row.importance ? 'var(--primarySoft)' : 'var(--fill)' }}>
                    <AppText variant="label" tone={row.importance ? 'primary' : 'textSub'}>{row.importance ?? '-'}</AppText>
                  </span>
                  <div style={{ flex: 1, display: 'grid', gap: 6, minWidth: 0 }}>
                    <div className="row between" style={{ gap: 8 }}>
                      <AppText lines={1}>
                        {importanceLabel(row.importance)}{' '}
                        <AppText variant="label" tone="textMuted">{Math.round(row.ratio * 100)}%</AppText>
                      </AppText>
                      <AppText variant="heading" className="tabular nowrap">{formatWon(row.amount)}</AppText>
                    </div>
                    <ProgressBar ratio={row.ratio} height={6} color={row.importance ? 'var(--primary)' : 'var(--textMuted)'} />
                  </div>
                </Pressable>
              );
            })}
          </Card>

          <Card className="fade-in-up" style={{ animationDelay: '60ms', display: 'grid', gap: 14 }}>
            <AppText variant="heading">태그별 지출</AppText>
            {tags.length ? (
              <>
                {tags.map((t) => {
                  const active = t.tagId === tagId;
                  return (
                    <Pressable
                      key={t.tagId}
                      className={`stat-row${active ? ' stat-row-active' : ''}`}
                      aria-pressed={active}
                      style={{ display: 'grid', gap: 6 }}
                      onClick={() => setTag(active ? undefined : { id: t.tagId, name: t.name })}>
                      <div className="row between" style={{ gap: 8 }}>
                        <AppText lines={1} style={{ minWidth: 0 }}>
                          #{t.name}{' '}
                          <AppText variant="label" tone="textMuted">{t.count}건 · {Math.round(t.ratio * 100)}%</AppText>
                        </AppText>
                        <AppText variant="heading" className="tabular nowrap">{formatWon(t.amount)}</AppText>
                      </div>
                      <ProgressBar ratio={t.ratio} height={6} color="var(--primary)" />
                    </Pressable>
                  );
                })}
                <AppText variant="caption" tone="textMuted">태그가 여러 개인 지출은 태그마다 더해서, 합계가 총 지출보다 클 수 있어요</AppText>
              </>
            ) : (
              <AppText tone="textSub">{hasFilter ? '이 조건에 태그가 달린 지출이 없어요' : '지출에 태그를 달면 여기에 모여요'}</AppText>
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
              <AppText variant="heading">{account ? `${account.name} 이번 달` : '이번 달 한눈에'}</AppText>
              <Row label="수입" value={formatWon(summary.data.income)} tone="income" />
              <Row label="지출" value={formatWon(summary.data.expense)} tone="expense" />
              <Row label="지난달 지출" value={formatWon(summary.data.prevExpense)} />
              <hr className="divider" />
              <Row label="순수익" value={formatWon(summary.data.net)} tone={summary.data.net < 0 ? 'expense' : 'text'} bold />
              {account ? (
                <>
                  <hr className="divider" />
                  <Row label="다른 통장에서 받은 돈" value={formatWon(summary.data.transferIn)} />
                  <Row label="다른 통장으로 보낸 돈" value={formatWon(summary.data.transferOut)} />
                  <Row label="통장 잔액 변화" value={signedWon(balanceChange(summary.data))} bold />
                </>
              ) : (
                summary.data.transferOut > 0 && (
                  <>
                    <hr className="divider" />
                    <Row label="통장 간 이체" value={formatWon(summary.data.transferOut)} />
                    <AppText variant="caption" tone="textMuted">통장끼리 옮긴 돈은 수입·지출에 넣지 않아요</AppText>
                  </>
                )
              )}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

/** 수입·지출에 이체까지 더한 그 통장의 이번 달 잔액 변화 */
const balanceChange = (s: SummaryDto) => s.income - s.expense + s.transferIn - s.transferOut;

const signedWon = (v: number) => (v > 0 ? '+' : v < 0 ? '-' : '') + formatWon(Math.abs(v));

function SubcategoryRow({ name, ratio, amount, color }: { name: string; ratio: number; amount: number; color: string }) {
  return (
    <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
      <div className="row between" style={{ gap: 8 }}>
        <AppText variant="label" tone="textSub" lines={1}>{name} {Math.round(ratio * 100)}%</AppText>
        <AppText variant="label" className="tabular nowrap">{formatWon(amount)}</AppText>
      </div>
      <ProgressBar ratio={ratio} height={4} color={color} />
    </div>
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
