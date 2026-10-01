import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { formatWon, type AccountDto, type AccountType } from '@dongil/shared';
import { MoneyInput } from '@/components/money-input';
import { AppText, Button, Card, ErrorState, Input, Loading, PressableScale, Segmented, haptic, type IconName } from '@/components/ui';
import { useAccounts, useDeleteAccount, useSaveAccount, type AccountInput } from '@/features/queries';
import { useTheme } from '@/theme/theme';
import { SWATCHES } from '@/theme/tokens';
import { ColorPicker } from '@/components/color-picker';

const TYPE_META: Record<AccountType, { label: string; icon: IconName }> = {
  CASH: { label: '현금', icon: 'cash-outline' },
  BANK: { label: '은행', icon: 'business-outline' },
  CARD: { label: '카드', icon: 'card-outline' },
};

export default function AccountsScreen() {
  const accounts = useAccounts();
  const [editing, setEditing] = useState<AccountDto | 'new' | null>(null);
  const total = accounts.data?.reduce((a, b) => a + b.balance, 0) ?? 0;

  if (accounts.error) return <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />;
  if (!accounts.data) return <Loading />;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 4 }}>
        <AppText tone="textSub">총 자산</AppText>
        <AppText variant="title">{formatWon(total)}</AppText>
      </Card>

      {editing ? (
        <AccountEditor
          key={editing === 'new' ? 'new' : editing.id}
          account={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <Button title="계좌 추가" icon="add" kind="secondary" onPress={() => setEditing('new')} />
      )}

      <Card padded={false} style={{ paddingVertical: 6 }}>
        {accounts.data.map((a) => (
          <Animated.View key={a.id} layout={LinearTransition} exiting={FadeOut}>
            <AccountRow account={a} onPress={() => setEditing(a)} />
          </Animated.View>
        ))}
      </Card>
    </ScrollView>
  );
}

function AccountRow({ account, onPress }: { account: AccountDto; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} style={styles.row} scaleTo={0.98}>
      <View style={[styles.icon, { backgroundColor: `${account.color}26` }]}>
        <Ionicons name={TYPE_META[account.type].icon} size={20} color={account.color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText>{account.name}</AppText>
        <AppText variant="caption" tone="textSub">{TYPE_META[account.type].label}</AppText>
      </View>
      <AppText variant="heading" tone={account.balance < 0 ? 'expense' : 'text'}>{formatWon(account.balance)}</AppText>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </PressableScale>
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
      { onSuccess: () => (haptic('success'), onDone()), onError: (e) => setError(e.message) },
    );
  };

  const onDelete = () => {
    if (!account) return;
    const run = () => remove.mutate(account.id, { onSuccess: onDone, onError: (e) => setError(e.message) });
    if (Platform.OS === 'web') return run();
    Alert.alert(`'${account.name}' 계좌를 숨길까요?`, '기존 거래 내역은 그대로 남아요', [
      { text: '취소', style: 'cancel' },
      { text: '숨기기', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Card style={{ gap: 16 }}>
        <AppText variant="heading">{account ? '계좌 수정' : '새 계좌'}</AppText>
        <Input label="이름" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder="예: 토스뱅크" maxLength={30} />
        <Segmented<AccountType>
          value={form.type}
          onChange={(type) => setForm((f) => ({ ...f, type }))}
          options={(Object.keys(TYPE_META) as AccountType[]).map((t) => ({ value: t, label: TYPE_META[t].label }))}
        />
        {!account && (
          <View style={{ gap: 6 }}>
            <AppText variant="label" tone="textSub">현재 잔액</AppText>
            <MoneyInput value={form.initialBalance ?? 0} onChange={(initialBalance) => setForm((f) => ({ ...f, initialBalance }))} />
          </View>
        )}
        <ColorPicker value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
        {error && <AppText tone="expense">{error}</AppText>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="취소" kind="ghost" onPress={onDone} style={{ flex: 1 }} />
          <Button title="저장" onPress={submit} loading={save.isPending} style={{ flex: 2 }} />
        </View>
        {account && <Button title="계좌 숨기기" kind="danger" onPress={onDelete} loading={remove.isPending} />}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
