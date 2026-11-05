import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { currentMonth, formatWon, groupCategories, shiftMonth, type BudgetDto, type CategoryDto } from '@dongil/shared';
import { CategoryIcon } from '@/components/category-icon';
import { toast } from '@/components/dialog';
import { MoneyInput } from '@/components/money-input';
import { ModalHeader } from '@/components/screen';
import { AppText, Button, Card, Loading, haptic } from '@/components/ui';
import { bookPath, useBookId, useBudget, useCategories, useSaveBudget } from '@/features/queries';
import { api } from '@/lib/api';
import { formatMonthLabel } from '@/lib/date';
import { useCloseModal } from '@/lib/nav';

export default function BudgetEditPage() {
  const [params] = useSearchParams();
  const raw = params.get('month');
  const month = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : currentMonth();
  const budget = useBudget(month);
  const categories = useCategories();

  if (!budget.data || !categories.data) {
    return (
      <main className="modal">
        <ModalHeader title={`${formatMonthLabel(month)} 예산`} />
        <Loading />
      </main>
    );
  }
  return <BudgetEditor month={month} initial={budget.data} categories={groupCategories(categories.data.filter((c) => c.type === 'EXPENSE')).flatMap((g) => [g.parent, ...g.children])} />;
}

const toState = (b: BudgetDto) => ({
  total: b.items.find((i) => i.categoryId === null)?.amount ?? 0,
  byCat: Object.fromEntries(b.items.filter((i) => i.categoryId).map((i) => [i.categoryId!, i.amount])) as Record<string, number>,
});

function BudgetEditor({ month, initial, categories }: { month: string; initial: BudgetDto; categories: CategoryDto[] }) {
  const close = useCloseModal();
  const save = useSaveBudget();
  const bookId = useBookId();
  const [state, setState] = useState(() => toState(initial));
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const catSum = Object.values(state.byCat).reduce((a, b) => a + b, 0);

  const copyPrev = async () => {
    setCopying(true);
    try {
      const prev = await api<BudgetDto>(bookPath(bookId!, '/budgets'), { query: { month: shiftMonth(month, -1) } });
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
          toast('예산을 저장했어요');
          close();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <main className="modal">
      <ModalHeader title={`${formatMonthLabel(month)} 예산`} />
      <div className="modal-body" style={{ gap: 12 }}>
        <Card style={{ display: 'grid', gap: 12 }}>
          <AppText variant="heading">한 달 전체 예산</AppText>
          <MoneyInput label="한 달 전체 예산" value={state.total} onChange={(total) => setState((s) => ({ ...s, total }))} placeholder="예: 1,000,000" />
          {state.total > 0 && catSum > state.total && (
            <AppText variant="caption" tone="warn">카테고리 예산 합계({formatWon(catSum)})가 전체 예산보다 커요</AppText>
          )}
        </Card>

        <Card style={{ display: 'grid', gap: 14 }}>
          <div className="row between">
            <AppText variant="heading">카테고리별 예산</AppText>
            <AppText variant="caption" tone="textSub" className="tabular">합계 {formatWon(catSum)}</AppText>
          </div>
          {categories.map((c) => (
            <div key={c.id} className="row" style={{ gap: 10, paddingLeft: c.parentId ? 20 : 0 }}>
              <CategoryIcon icon={c.icon} color={c.color} size={c.parentId ? 28 : 36} />
              <AppText lines={1} style={{ width: 64, flexShrink: 0 }}>{c.name}</AppText>
              <div style={{ flex: 1, minWidth: 0 }}>
                <MoneyInput
                  label={`${c.name} 예산`}
                  value={state.byCat[c.id] ?? 0}
                  onChange={(v) => setState((s) => ({ ...s, byCat: { ...s.byCat, [c.id]: v } }))}
                  placeholder="없음"
                />
              </div>
            </div>
          ))}
        </Card>

        <Button title="지난달 예산 불러오기" kind="ghost" icon="copy-outline" onClick={copyPrev} loading={copying} />
      </div>

      <footer className="modal-footer">
        {error && <AppText tone="expense" style={{ textAlign: 'center' }}>{error}</AppText>}
        <Button title="저장하기" onClick={submit} loading={save.isPending} />
      </footer>
    </main>
  );
}
