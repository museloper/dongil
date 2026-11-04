import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatSigned, type TransactionDto } from '@dongil/shared';
import { useCurrentBook } from '@/features/queries';
import { useTheme } from '@/theme/theme';
import { formatTimeLabel, toTimeKey } from '@/lib/date';
import { CategoryIcon } from './category-icon';
import { AppText, PressableScale } from './ui';

export function TransactionRow({ tx }: { tx: TransactionDto }) {
  const { colors } = useTheme();
  const shared = useCurrentBook().book?.type === 'SHARED';
  const isTransfer = tx.type === 'TRANSFER';
  const categoryName = tx.category?.name ?? '미분류';
  // 아이콘이 이미 카테고리를 알려주므로 거래를 구별하는 메모를 제목으로 쓴다. 메모가 없으면 카테고리로 대신한다
  const title = isTransfer ? '이체' : tx.memo || categoryName;
  // 공유 가계부에서는 시간에 이어서 기록한 사람을 표시
  const time = formatTimeLabel(toTimeKey(tx.occurredAt));
  const author = shared ? tx.author.nickname : null;
  const sub = isTransfer
    ? [time, author, `${tx.account.name} → ${tx.toAccount?.name ?? ''}`].filter(Boolean).join(' · ')
    : [tx.memo ? categoryName : null, time, author, tx.account.name].filter(Boolean).join(' · ');

  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      style={[styles.row, { backgroundColor: colors.card }]}
      scaleTo={0.98}>
      <CategoryIcon
        icon={isTransfer ? 'swap-horizontal' : (tx.category?.icon ?? 'help')}
        color={isTransfer ? colors.textSub : (tx.category?.color ?? colors.textMuted)}
      />
      <View style={styles.body}>
        <AppText numberOfLines={1}>{title}</AppText>
        {sub ? (
          <AppText variant="caption" tone="textSub" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
      <AppText variant="heading" tone={tx.type === 'INCOME' ? 'income' : isTransfer ? 'textSub' : 'text'}>
        {formatSigned(tx.amount, tx.type)}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4 },
  body: { flex: 1, gap: 2 },
});
