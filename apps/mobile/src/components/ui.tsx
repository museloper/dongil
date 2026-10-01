import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/theme';
import { radius, space, type ColorToken } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function haptic(kind: 'select' | 'success' | 'warn' = 'select') {
  if (Platform.OS === 'web') return;
  if (kind === 'select') Haptics.selectionAsync();
  else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
}

// ---------- Text ----------

const textVariants = StyleSheet.create({
  hero: { fontSize: 34, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
});

export type TextVariant = keyof typeof textVariants;

export function AppText({
  variant = 'body',
  tone = 'text',
  style,
  ...rest
}: TextProps & { variant?: TextVariant; tone?: ColorToken }) {
  const { colors } = useTheme();
  return <Text style={[textVariants[variant], { color: colors[tone] }, style]} {...rest} />;
}

// ---------- Surfaces ----------

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg }, padded && { padding: space.xl }, style]}>
      {children}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 누르면 살짝 작아지는 Pressable + 햅틱 */
export function PressableScale({
  style,
  onPress,
  withHaptic = true,
  scaleTo = 0.97,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; withHaptic?: boolean; scaleTo?: number }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 18, stiffness: 400 }));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 300 }));
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (withHaptic) haptic();
        onPress?.(e);
      }}
      style={[style, animated]}
    />
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.primary, secondary: colors.primarySoft, danger: colors.fill, ghost: 'transparent' }[kind];
  const fg = { primary: colors.onPrimary, secondary: colors.primary, danger: colors.expense, ghost: colors.textSub }[kind];
  const off = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      style={[styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 6 }} />}
          <Text style={[textVariants.heading, { color: fg }]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

export function IconButton({ name, onPress, size = 22, tone = 'text', style, label }: {
  name: IconName;
  label?: string;
  onPress: () => void;
  size?: number;
  tone?: ColorToken;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} hitSlop={10} style={[styles.iconButton, style]} scaleTo={0.9} aria-label={label}>
      <Ionicons name={name} size={size} color={colors[tone]} />
    </PressableScale>
  );
}

export function Input({ label, error, style, ...rest }: TextInputProps & { label?: string; error?: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <AppText variant="label" tone="textSub">{label}</AppText>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          { backgroundColor: colors.fill, color: colors.text, borderColor: error ? colors.expense : 'transparent' },
          style,
        ]}
        {...rest}
      />
      {error ? <AppText variant="caption" tone="expense">{error}</AppText> : null}
    </View>
  );
}

// ---------- Controls ----------

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.fill }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (!active) haptic();
              onChange(o.value);
            }}
            style={[
              styles.segment,
              active && { backgroundColor: isDark ? colors.border : colors.card },
              active && !isDark && styles.segmentShadow,
            ]}>
            <AppText variant="label" tone={active ? 'text' : 'textSub'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? accent : colors.fill },
      ]}>
      <AppText variant="label" style={{ color: active ? colors.onPrimary : colors.textSub }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

// ---------- Feedback ----------

/** 사용률에 따라 색이 바뀌는 진행 바 (80% 경고, 100% 초과) */
export function ProgressBar({ ratio, height = 8, color }: { ratio: number; height?: number; color?: string }) {
  const { colors } = useTheme();
  const width = useSharedValue(0);
  useEffect(() => {
    width.set(withTiming(Math.min(Math.max(ratio, 0), 1) * 100, { duration: 700 }));
  }, [ratio, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  const fill = color ?? (ratio >= 1 ? colors.expense : ratio >= 0.8 ? colors.warn : colors.primary);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.fill, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: fill }, animated]} />
    </View>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.fill }]}>
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <AppText variant="heading">{title}</AppText>
      {description && (
        <AppText tone="textSub" style={{ textAlign: 'center' }}>
          {description}
        </AppText>
      )}
      {action}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="불러오지 못했어요"
      description={error instanceof Error ? error.message : undefined}
      action={onRetry && <Button title="다시 시도" kind="secondary" onPress={onRetry} style={{ marginTop: 8 }} />}
    />
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: space.md }]}>
      <AppText variant="heading">{title}</AppText>
      {right}
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: { height: 52, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: 16, borderWidth: 1.5 },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segment: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentShadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: space.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
