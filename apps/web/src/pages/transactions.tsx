import { useEffect, useMemo, useRef, useState } from 'react';
import { compactWon, formatWon, toLocalDateKey, type TxType } from '@dongil/shared';
import { Icon } from '@/components/icon';
import { MonthSwitcher } from '@/components/month-switcher';
import { Fab, Screen } from '@/components/screen';
import { groupByDay, TransactionRow } from '@/components/transaction-row';
import { AppText, Card, Chip, EmptyState, ErrorState, Loading, Segmented, haptic } from '@/components/ui';
import { monthFilter, useCalendar, useTransactions, type TxFilter } from '@/features/queries';
import { dayOfWeek, dayRangeIso, daysInMonth, formatDayLabel } from '@/lib/date';
import { useMonth } from '@/lib/ui-store';

type Mode = 'list' | 'calendar';
const TYPE_FILTERS: { value: TxType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'EXPENSE', label: '지출' },
  { value: 'INCOME', label: '수입' },
  { value: 'TRANSFER', label: '이체' },
];

export default function TransactionsPage() {
  const [mode, setMode] = useState<Mode>('list');
  return (
    <>
      <Screen title="내역" right={<MonthSwitcher />}>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'list', label: '리스트' },
            { value: 'calendar', label: '캘린더' },
          ]}
        />
        {mode === 'list' ? <ListView /> : <CalendarView />}
      </Screen>
      <Fab />
    </>
  );
}

// ---------------- 리스트 ----------------

/** 입력이 멈춘 뒤에만 검색하도록 */
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ListView() {
  const month = useMonth((s) => s.month);
  const [type, setType] = useState<TxType | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const query_ = useDebounced(q.trim());
  const filter: TxFilter = { ...monthFilter(month), type: type === 'ALL' ? undefined : type, q: query_ || undefined };
  const query = useTransactions(filter);

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
    <>
      <div className="search">
        <Icon name="search" size={18} color="var(--textMuted)" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="메모, 카테고리, 태그 검색" aria-label="검색" enterKeyHint="search" />
        {q ? (
          <button type="button" className="plain" onClick={() => setQ('')} aria-label="검색어 지우기">
            <Icon name="close-circle" size={18} color="var(--textMuted)" />
          </button>
        ) : null}
      </div>
      <div className="hscroll">
        {TYPE_FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} active={type === f.value} onClick={() => setType(f.value)} />
        ))}
      </div>

      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Loading />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={q || type !== 'ALL' ? '조건에 맞는 내역이 없어요' : '이 달은 기록이 없어요'}
          description="오른쪽 아래 + 버튼으로 기록해 보세요"
        />
      ) : (
        <div>
          {sections.map((section) => (
            <section key={section.day}>
              <div className="row between day-header">
                <AppText variant="label" tone="textSub">{formatDayLabel(section.day)}</AppText>
                <AppText variant="caption" tone="textMuted" className="tabular">
                  {section.net > 0 ? '+' : ''}
                  {formatWon(section.net)}
                </AppText>
              </div>
              {section.data.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
            </section>
          ))}
          <div ref={sentinel} />
          {query.isFetchingNextPage && <Loading />}
        </div>
      )}
    </>
  );
}

// ---------------- 캘린더 ----------------

function CalendarView() {
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
    <>
      <Card style={{ padding: '14px 8px' }}>
        <div className="row" style={{ justifyContent: 'space-around', marginBottom: 14 }}>
          <AppText variant="label" tone="income" className="tabular">수입 {formatWon(totalIncome)}</AppText>
          <AppText variant="label" tone="expense" className="tabular">지출 {formatWon(totalExpense)}</AppText>
        </div>
        <div className="cal-grid" style={{ marginBottom: 6 }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <AppText key={d} variant="caption" tone={i === 0 ? 'expense' : 'textMuted'} style={{ textAlign: 'center' }}>{d}</AppText>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((key, i) => {
            if (!key) return <span key={`e${i}`} className="cal-cell" />;
            const d = byDay.get(key);
            const isSel = key === selectedDay;
            const isToday = key === today;
            return (
              <button
                key={key}
                type="button"
                className={`cal-cell${isSel ? ' cal-selected' : ''}`}
                aria-pressed={isSel}
                aria-label={formatDayLabel(key)}
                onClick={() => {
                  haptic();
                  setSelected(isSel ? null : key);
                }}>
                <span className={`cal-day${isToday ? ' cal-today' : ''}`}>
                  <AppText variant="label" style={isToday ? { color: 'var(--onPrimary)' } : undefined}>{Number(key.slice(8))}</AppText>
                </span>
                {d?.income ? <AppText variant="caption" tone="income" lines={1} className="cal-amt">+{compactWon(d.income)}</AppText> : null}
                {d?.expense ? <AppText variant="caption" tone="expense" lines={1} className="cal-amt">-{compactWon(d.expense)}</AppText> : null}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card>
          <AppText variant="heading" style={{ display: 'block', marginBottom: 8 }}>{formatDayLabel(selectedDay)}</AppText>
          {dayTx.isLoading ? (
            <Loading />
          ) : dayTx.data?.pages[0]?.items.length ? (
            dayTx.data.pages.flatMap((p) => p.items).map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          ) : (
            <AppText tone="textSub" style={{ display: 'block', padding: '12px 0' }}>이 날은 기록이 없어요</AppText>
          )}
        </Card>
      )}
    </>
  );
}
