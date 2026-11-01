import { currentMonth } from '@/shared';
import { formatMonthLabel } from '@/lib/date';
import { useMonth } from '@/lib/ui-store';
import { AppText, IconButton, Pressable } from './ui';

export function MonthSwitcher() {
  const { month, shift, reset } = useMonth();
  const isCurrent = month === currentMonth();
  return (
    <div className="row" style={{ gap: 2 }}>
      <IconButton name="chevron-back" label="이전 달" onClick={() => shift(-1)} tone="textSub" />
      <Pressable onClick={reset} withHaptic={!isCurrent} title="이번 달로">
        <AppText variant="heading">{formatMonthLabel(month)}</AppText>
      </Pressable>
      <IconButton name="chevron-forward" label="다음 달" onClick={() => shift(1)} tone={isCurrent ? 'textMuted' : 'textSub'} />
    </div>
  );
}
