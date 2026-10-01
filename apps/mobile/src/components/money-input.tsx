import { StyleSheet, TextInput, View } from 'react-native';
import { formatWon } from '@dongil/shared';
import { useTheme } from '@/theme/theme';
import { AppText } from './ui';

/** 숫자만 받는 금액 입력칸 (천 단위 콤마 자동) */
export function MoneyInput({ value, onChange, placeholder = '0' }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.fill }]}>
      <TextInput
        value={value ? formatWon(value, false) : ''}
        onChangeText={(t) => onChange(Math.min(Number(t.replace(/[^0-9]/g, '') || 0), 1_000_000_000_000))}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text }]}
      />
      <AppText tone="textSub">원</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12, paddingHorizontal: 14, gap: 6 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'right' },
});
