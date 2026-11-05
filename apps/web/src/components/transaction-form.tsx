import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  formatWon,
  groupCategories,
  IMPORTANCE_LEVELS,
  TAG_MAX_LENGTH,
  TAG_MAX_PER_TRANSACTION,
  TagNameSchema,
  toLocalDateKey,
  TransactionCreateSchema,
  type Importance,
  type TransactionDto,
  type TxType,
} from '@dongil/shared';
import { useAccounts, useCategories, useCurrentBook, useDeleteTransaction, useSaveTransaction, useTags } from '@/features/queries';
import { formatDayLabel, formatTimeLabel, shiftDay, toTimeKey, withDateKey, withTimeKey } from '@/lib/date';
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
  const { book } = useCurrentBook();
  const categories = useCategories();
  const save = useSaveTransaction();
  const usedTags = useTags();
  const remove = useDeleteTransaction();

  const [type, setType] = useState<TxType>(initial?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category?.id ?? null);
  const [accountId, setAccountId] = useState<string | null>(initial?.account.id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(initial?.toAccount?.id ?? null);
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt ?? new Date().toISOString());
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [importance, setImportance] = useState<Importance | null>(initial?.importance ?? null);
  const [tags, setTags] = useState<string[]>(initial?.tags.map((t) => t.name) ?? []);
  const [tagInput, setTagInput] = useState('');
  const [keypadOpen, setKeypadOpen] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  // 주 자산을 맨 앞에 두어 먼저 선택되게 한다. 수정 화면은 accountId 가 있어 기존 계좌가 그대로 유지된다
  const accountList = [...(accounts.data ?? [])].sort(
    (a, b) => Number(b.id === book?.defaultAccountId) - Number(a.id === book?.defaultAccountId),
  );
  const cats = (categories.data ?? []).filter((c) => c.type === type);
  const groups = groupCategories(cats);
  // 세부를 골라도 상위 칸이 선택된 것으로 보이고, 그 아래에 세부 선택지가 열린다
  const picked = cats.find((c) => c.id === categoryId);
  const openGroup = groups.find((g) => g.parent.id === (picked?.parentId ?? picked?.id));
  const suggestions = (usedTags.data ?? []).filter((t) => !tags.includes(t.name));
  const fromId = accountId ?? accountList[0]?.id ?? null;
  const dateKey = toLocalDateKey(new Date(occurredAt));
  const timeKey = toTimeKey(occurredAt);

  const changeType = (t: TxType) => {
    setType(t);
    // 수입/지출이 바뀌면 카테고리 종류가 달라지므로 초기화
    if (t !== type) setCategoryId(null);
  };

  const addTag = (raw: string) => {
    const parsed = TagNameSchema.safeParse(raw);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (tags.length >= TAG_MAX_PER_TRANSACTION && !tags.includes(parsed.data)) return setError(`태그는 ${TAG_MAX_PER_TRANSACTION}개까지 달 수 있습니다`);
    setError(null);
    if (!tags.includes(parsed.data)) setTags([...tags, parsed.data]);
    // 추천 태그를 눌렀을 때는 입력 중인 내용을 지우지 않는다
    if (raw === tagInput) setTagInput('');
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
      importance: type === 'EXPENSE' ? importance : null,
      // 입력해 두고 추가를 누르지 않은 태그도 함께 저장한다
      tags: type === 'EXPENSE' ? (tagInput.trim() ? [...tags, tagInput] : tags) : [],
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
                  {groups.map(({ parent: c }) => {
                    const active = c.id === openGroup?.parent.id;
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
                {openGroup && openGroup.children.length > 0 && (
                  <div className="hscroll">
                    <Chip label="세부 없음" active={categoryId === openGroup.parent.id} onClick={() => setCategoryId(openGroup.parent.id)} />
                    {openGroup.children.map((c) => (
                      <Chip key={c.id} label={c.name} active={c.id === categoryId} color={c.color} onClick={() => setCategoryId(c.id)} />
                    ))}
                  </div>
                )}
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

            <Field label="시간">
              <label className="date-row time-row">
                <Icon name="time-outline" size={16} color="var(--textSub)" />
                <AppText>{formatTimeLabel(timeKey)}</AppText>
                {/* 날짜와 같이 투명한 시간 입력을 덮어 브라우저 기본 시간 선택을 연다. 값은 KST 시:분 */}
                <input
                  type="time"
                  className="date-overlay"
                  value={timeKey}
                  aria-label="시간 선택"
                  onChange={(e) => e.target.value && setOccurredAt(withTimeKey(occurredAt, e.target.value))}
                />
              </label>
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

            {type === 'EXPENSE' && (
              <>
                <Field label="중요도">
                  <div className="row" style={{ gap: 8 }}>
                    {IMPORTANCE_LEVELS.map((level) => (
                      <Chip key={level} label={level} active={importance === level} onClick={() => setImportance(importance === level ? null : level)} />
                    ))}
                  </div>
                </Field>

                <Field label="태그">
                  {tags.length > 0 && (
                    <div className="tag-wrap">
                      {tags.map((name) => (
                        <Chip key={name} label={`#${name} ×`} active onClick={() => setTags(tags.filter((t) => t !== name))} />
                      ))}
                    </div>
                  )}
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="여행, 명절처럼 묶어 볼 이름"
                      maxLength={TAG_MAX_LENGTH + 1}
                      aria-label="태그 입력"
                      enterKeyHint="done"
                      onKeyDown={(e) => {
                        // 한글 조합을 끝내는 Enter 는 태그 추가로 치지 않는다
                        if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                        e.preventDefault();
                        if (tagInput.trim()) addTag(tagInput);
                      }}
                    />
                    <Chip label="추가" active={false} onClick={() => addTag(tagInput)} />
                  </div>
                  {suggestions.length > 0 && (
                    <div className="hscroll">
                      {suggestions.map((t) => (
                        <Chip key={t.id} label={`#${t.name}`} active={false} onClick={() => addTag(t.name)} />
                      ))}
                    </div>
                  )}
                </Field>
              </>
            )}
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
