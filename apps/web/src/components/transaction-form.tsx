import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { formatWon, toLocalDateKey, TransactionCreateSchema, type TransactionDto, type TxType } from '@dongil/shared';
import { useAccounts, useCategories, useDeleteTransaction, useSaveTransaction } from '@/features/queries';
import { formatDayLabel, shiftDay, withDateKey } from '@/lib/date';
import { useCloseModal } from '@/lib/nav';
import { CategoryIcon, tint } from './category-icon';
import { confirm, toast } from './dialog';
import { Icon } from './icon';
import { Keypad } from './keypad';
import { ModalHeader } from './screen';
import { AppText, Button, Chip, IconButton, Pressable, Segmented, haptic } from './ui';

export function TransactionForm({ initial }: { initial?: TransactionDto }) {
  const close = useCloseModal();
  const accounts = useAccounts();
  const categories = useCategories();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();

  const [type, setType] = useState<TxType>(initial?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category?.id ?? null);
  const [accountId, setAccountId] = useState<string | null>(initial?.account.id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(initial?.toAccount?.id ?? null);
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt ?? new Date().toISOString());
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [keypadOpen, setKeypadOpen] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const accountList = accounts.data ?? [];
  const cats = (categories.data ?? []).filter((c) => c.type === type);
  const fromId = accountId ?? accountList[0]?.id ?? null;
  const dateKey = toLocalDateKey(new Date(occurredAt));

  const changeType = (t: TxType) => {
    setType(t);
    // 수입/지출이 바뀌면 카테고리 종류가 달라지므로 초기화
    if (t !== type) setCategoryId(null);
  };

  const submit = () => {
    const body = {
      type,
      amount,
      accountId: fromId ?? '',
      toAccountId: type === 'TRANSFER' ? toAccountId : null,
      categoryId: type === 'TRANSFER' ? null : categoryId,
      memo: memo.trim() || null,
      occurredAt,
    };
    if (!amount) return setError('금액을 입력하세요');
    const parsed = TransactionCreateSchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    save.mutate(
      { id: initial?.id, body: parsed.data },
      {
        onSuccess: () => {
          haptic('success');
          toast(initial ? '수정했어요' : '기록했어요');
          close();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const onDelete = async () => {
    if (!initial || !(await confirm({ title: '이 기록을 삭제할까요?', message: `${formatWon(initial.amount)} 내역이 삭제돼요`, action: '삭제' }))) return;
    remove.mutate(initial.id, {
      onSuccess: () => {
        toast('삭제했어요');
        close();
      },
      onError: (e) => setError(e.message),
    });
  };

  const amountColor = type === 'INCOME' ? 'var(--income)' : type === 'EXPENSE' ? 'var(--text)' : 'var(--textSub)';

  return (
    <main className="modal">
      <ModalHeader
        title={initial ? '기록 수정' : '새 기록'}
        right={initial ? <IconButton name="trash-outline" label="삭제" tone="expense" onClick={onDelete} /> : undefined}
      />

      <div style={{ padding: '0 20px' }}>
        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'EXPENSE', label: '지출' },
            { value: 'INCOME', label: '수입' },
            { value: 'TRANSFER', label: '이체' },
          ]}
        />
      </div>

      <Pressable onClick={() => setKeypadOpen(true)} className="amount-box" withHaptic={false} aria-label="금액 입력">
        <AppText variant="caption" tone="textSub">
          {type === 'EXPENSE' ? '얼마를 썼나요?' : type === 'INCOME' ? '얼마를 받았나요?' : '얼마를 옮기나요?'}
        </AppText>
        <AppText variant="hero" lines={1} className="tabular" style={{ color: amount ? amountColor : 'var(--textMuted)', fontSize: 40 }}>
          {amount ? formatWon(amount) : '0원'}
        </AppText>
      </Pressable>

      {keypadOpen ? (
        <div className="keypad-wrap fade-in">
          <Keypad value={amount} onChange={setAmount} />
          <div style={{ padding: '8px 20px 0' }}>
            <Button title="다음" onClick={() => setKeypadOpen(false)} disabled={!amount} style={{ width: '100%' }} />
          </div>
        </div>
      ) : (
        <>
          <div className="modal-body fade-in">
            {type !== 'TRANSFER' ? (
              <Field label="카테고리">
                <div className="cat-grid">
                  {cats.map((c) => {
                    const active = c.id === categoryId;
                    return (
                      <Pressable
                        key={c.id}
                        onClick={() => setCategoryId(c.id)}
                        className="cat-item"
                        aria-pressed={active}
                        style={active ? { backgroundColor: tint(c.color, 12), borderColor: c.color } : undefined}>
                        <CategoryIcon icon={c.icon} color={c.color} size={40} />
                        <AppText variant="caption" tone={active ? 'text' : 'textSub'} lines={1}>{c.name}</AppText>
                      </Pressable>
                    );
                  })}
                </div>
              </Field>
            ) : null}

            <Field label={type === 'TRANSFER' ? '보내는 계좌' : type === 'INCOME' ? '입금 계좌' : '결제 수단'}>
              <AccountChips accounts={accountList} value={fromId} onChange={setAccountId} />
            </Field>

            {type === 'TRANSFER' && (
              <Field label="받는 계좌">
                <AccountChips accounts={accountList.filter((a) => a.id !== fromId)} value={toAccountId} onChange={setToAccountId} />
              </Field>
            )}

            <Field label="날짜">
              <div className="date-row">
                <IconButton name="chevron-back" label="전날" onClick={() => setOccurredAt(withDateKey(occurredAt, shiftDay(dateKey, -1)))} tone="textSub" />
                <label className="date-center">
                  <Icon name="calendar-outline" size={16} color="var(--textSub)" />
                  <AppText>{formatDayLabel(dateKey)}</AppText>
                  {/* 투명한 날짜 입력을 덮어 눌렀을 때 브라우저 기본 달력을 연다 */}
                  <input
                    type="date"
                    className="date-overlay"
                    value={dateKey}
                    aria-label="날짜 선택"
                    onChange={(e) => e.target.value && setOccurredAt(withDateKey(occurredAt, e.target.value))}
                  />
                </label>
                <IconButton name="chevron-forward" label="다음날" onClick={() => setOccurredAt(withDateKey(occurredAt, shiftDay(dateKey, 1)))} tone="textSub" />
              </div>
            </Field>

            <Field label="메모">
              <input
                className="input"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="어디에 썼는지 적어두면 검색이 쉬워요"
                maxLength={100}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </Field>
          </div>

          <footer className="modal-footer">
            {error && <AppText tone="expense" style={{ textAlign: 'center' }}>{error}</AppText>}
            <Button title={initial ? '수정 완료' : '저장하기'} onClick={submit} loading={save.isPending} />
          </footer>
        </>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <AppText variant="label" tone="textSub">{label}</AppText>
      {children}
    </section>
  );
}

function AccountChips({ accounts, value, onChange }: {
  accounts: { id: string; name: string; color: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const navigate = useNavigate();
  if (!accounts.length) {
    return (
      <Pressable onClick={() => navigate('/accounts')} style={{ justifySelf: 'start' }}>
        <AppText tone="primary">+ 계좌를 먼저 추가하세요</AppText>
      </Pressable>
    );
  }
  return (
    <div className="hscroll">
      {accounts.map((a) => (
        <Chip key={a.id} label={a.name} active={a.id === value} onClick={() => onChange(a.id)} color={a.color} />
      ))}
    </div>
  );
}
