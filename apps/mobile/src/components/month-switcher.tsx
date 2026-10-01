import { currentMonth } from '@dongil/shared';
import { View } from 'react-native';
import { formatMonthLabel } from '@/lib/date';
import { useMonth } from '@/lib/ui-store';
import { AppText, IconButton, PressableScale, styles } from './ui';

export function MonthSwitcher({ variant = 'title' }: { variant?: 'title' | 'heading' }) {
  const { month, shift, reset } = useMonth();
  const isCurrent = month === currentMonth();
  return (
    <View style={[styles.row, { gap: 2 }]}>
      <IconButton name="chevron-back" onPress={() => shift(-1)} tone="textSub" />
      <PressableScale onPress={reset} withHaptic={!isCurrent}>
        <AppText variant={variant}>{formatMonthLabel(month)}</AppText>
      </PressableScale>
      <IconButton name="chevron-forward" onPress={() => shift(1)} tone={isCurrent ? 'textMuted' : 'textSub'} />
    </View>
  );
}
