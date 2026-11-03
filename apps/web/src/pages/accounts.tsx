import { useState } from 'react';
import { formatWon, type AccountDto, type AccountType } from '@dongil/shared';
import { tint } from '@/components/category-icon';
import { ColorPicker } from '@/components/color-picker';
import { confirm } from '@/components/dialog';
import { Icon, type IconName } from '@/components/icon';
import { MoneyInput } from '@/components/money-input';
import { SubScreen } from '@/components/screen';
import { AppText, Button, Card, ErrorState, Input, Loading, Pressable, Segmented, haptic } from '@/components/ui';
import { useAccounts, useDeleteAccount, useSaveAccount, type AccountInput } from '@/features/queries';
import { SWATCHES } from '@/theme/tokens';

const TYPE_META: Record<AccountType, { label: string; icon: IconName }> = {
  CASH: { label: '현금', icon: 'cash-outline' },
  BANK: { label: '은행', icon: 'business-outline' },
  CARD: { label: '카드', icon: 'card-outline' },
};

export default function AccountsPage() {
  const accounts = useAccounts();
  const [editing, setEditing] = useState<AccountDto | 'new' | null>(null);
  const total = accounts.data?.reduce((a, b) => a + b.balance, 0) ?? 0;

  return (
    <SubScreen title="자산 관리">
      {accounts.error ? (
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      ) : !accounts.data ? (
        <Loading />
      ) : (
        <>
          <Card style={{ display: 'grid', gap: 4 }}>
            <AppText tone="textSub">총 자산</AppText>
            <AppText variant="title" className="tabular">{formatWon(total)}</AppText>
          </Card>

          {editing ? (
            <AccountEditor
              key={editing === 'new' ? 'new' : editing.id}
              account={editing === 'new' ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          ) : (
            <Button title="계좌 추가" icon="add" kind="secondary" onClick={() => setEditing('new')} />
          )}

          {accounts.data.length > 0 && (
            <Card padded={false} style={{ padding: '6px 0' }}>
              {accounts.data.map((a) => (
                <Pressable key={a.id} onClick={() => setEditing(a)} className="list-row">
                  <span className="circle-icon" style={{ width: 40, height: 40, backgroundColor: tint(a.color) }}>
                    <Icon name={TYPE_META[a.type].icon} size={20} color={a.color} />
                  </span>
                  <span style={{ flex: 1, display: 'grid', textAlign: 'left', minWidth: 0 }}>
                    <AppText lines={1}>{a.name}</AppText>
                    <AppText variant="caption" tone="textSub">{TYPE_META[a.type].label}</AppText>
                  </span>
                  <AppText variant="heading" tone={a.balance < 0 ? 'expense' : 'text'} className="tabular nowrap">{formatWon(a.balance)}</AppText>
                  <Icon name="chevron-forward" size={16} color="var(--textMuted)" />
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}
    </SubScreen>
  );
}

function AccountEditor({ account, onDone }: { account?: AccountDto; onDone: () => void }) {
  const save = useSaveAccount();
  const remove = useDeleteAccount();
  const [form, setForm] = useState<AccountInput>({
    name: account?.name ?? '',
    type: account?.type ?? 'BANK',
    color: account?.color ?? SWATCHES[0],
    initialBalance: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!form.name.trim()) return setError('계좌 이름을 입력하세요');
    save.mutate(
      { id: account?.id, body: { ...form, name: form.name.trim() } },
      {
        onSuccess: () => {
          haptic('success');
          onDone();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const onDelete = async () => {
    if (!account) return;
    if (!(await confirm({ title: `'${account.name}' 계좌를 숨길까요?`, message: '기존 거래 내역은 그대로 남아요', action: '숨기기' }))) return;
    remove.mutate(account.id, { onSuccess: onDone, onError: (e) => setError(e.message) });
  };

  return (
    <Card className="fade-in-up" style={{ display: 'grid', gap: 16 }}>
      <AppText variant="heading">{account ? '계좌 수정' : '새 계좌'}</AppText>
      <Input label="이름" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="예: 토스뱅크" maxLength={30} />
      <Segmented<AccountType>
        value={form.type}
        onChange={(type) => setForm((f) => ({ ...f, type }))}
        options={(Object.keys(TYPE_META) as AccountType[]).map((t) => ({ value: t, label: TYPE_META[t].label }))}
      />
      {!account && (
        <div style={{ display: 'grid', gap: 6 }}>
          <AppText variant="label" tone="textSub">현재 잔액</AppText>
          <MoneyInput label="현재 잔액" value={form.initialBalance ?? 0} onChange={(initialBalance) => setForm((f) => ({ ...f, initialBalance }))} />
        </div>
      )}
      <ColorPicker value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
      {error && <AppText tone="expense">{error}</AppText>}
      <div className="row" style={{ gap: 8 }}>
        <Button title="취소" kind="ghost" onClick={onDone} style={{ flex: 1 }} />
        <Button title="저장" onClick={submit} loading={save.isPending} style={{ flex: 2 }} />
      </div>
      {account && <Button title="계좌 숨기기" kind="danger" onClick={onDelete} loading={remove.isPending} />}
    </Card>
  );
}
