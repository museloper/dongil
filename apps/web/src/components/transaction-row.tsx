import { useNavigate } from 'react-router';
import { formatSigned, type TransactionDto } from '@dongil/shared';
import { useCurrentBook } from '@/features/queries';
import { formatTimeLabel, toTimeKey } from '@/lib/date';
import { CategoryIcon } from './category-icon';
import { AppText, Pressable } from './ui';

export function TransactionRow({ tx }: { tx: TransactionDto }) {
  const navigate = useNavigate();
  const shared = useCurrentBook().book?.type === 'SHARED';
  const isTransfer = tx.type === 'TRANSFER';
  const title = isTransfer ? '이체' : (tx.category?.name ?? '미분류');
  // 같은 날 거래의 순서를 알 수 있게 시간을 맨 앞에, 공유 가계부에서는 이어서 기록한 사람을 표시
  const time = formatTimeLabel(toTimeKey(tx.occurredAt));
  const author = shared ? tx.author.nickname : null;
  const sub = isTransfer
    ? [time, author, `${tx.account.name} → ${tx.toAccount?.name ?? ''}`].filter(Boolean).join(' · ')
    : [time, author, tx.memo, tx.account.name].filter(Boolean).join(' · ');

  return (
    <Pressable onClick={() => navigate(`/transaction/${tx.id}`)} className="tx-row">
      <CategoryIcon
        icon={isTransfer ? 'swap-horizontal' : (tx.category?.icon ?? 'help')}
        color={isTransfer ? 'var(--textSub)' : (tx.category?.color ?? 'var(--textMuted)')}
      />
      <div className="tx-body">
        <AppText lines={1}>{title}</AppText>
        {sub ? (
          <AppText variant="caption" tone="textSub" lines={1}>{sub}</AppText>
        ) : null}
      </div>
      <AppText variant="heading" tone={tx.type === 'INCOME' ? 'income' : isTransfer ? 'textSub' : 'text'} className="tabular nowrap">
        {formatSigned(tx.amount, tx.type)}
      </AppText>
    </Pressable>
  );
}
