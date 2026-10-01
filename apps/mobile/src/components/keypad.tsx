import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { AppText, PressableScale } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'] as const;
const MAX = 1_000_000_000_000;

/** 금액 입력 전용 큰 숫자 키패드 */
export function Keypad({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { colors } = useTheme();

  const press = (key: (typeof KEYS)[number]) => {
    const s = value ? String(value) : '';
    const next = key === 'back' ? s.slice(0, -1) : s + key;
    const n = Number(next || 0);
    if (n <= MAX) onChange(n);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((k) => (
        <PressableScale key={k} onPress={() => press(k)} onLongPress={k === 'back' ? () => onChange(0) : undefined} style={styles.key} scaleTo={0.9}>
          {k === 'back' ? (
            <Ionicons name="backspace-outline" size={26} color={colors.text} />
          ) : (
            <AppText variant="title">{k}</AppText>
          )}
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  key: { width: '33.333%', height: 58, alignItems: 'center', justifyContent: 'center' },
});
