import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { SWATCHES } from '@/theme/tokens';
import { PressableScale } from './ui';

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.swatches}>
      {SWATCHES.map((c) => (
        <PressableScale key={c} onPress={() => onChange(c)} scaleTo={0.85}>
          <View style={[styles.swatch, { backgroundColor: c, borderColor: c === value ? colors.text : 'transparent' }]}>
            {c === value && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
