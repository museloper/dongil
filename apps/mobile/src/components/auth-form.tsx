import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { AppText } from './ui';

/** 로그인/회원가입 공통 레이아웃 */
export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(500)} style={{ gap: 10 }}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="wallet" size={28} color={colors.onPrimary} />
          </View>
          <AppText variant="title" style={{ fontSize: 28 }}>
            {title}
          </AppText>
          <AppText tone="textSub">{subtitle}</AppText>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.form}>
          {children}
        </Animated.View>
        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 24 },
  logo: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  form: { gap: 14, marginTop: 36 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 'auto', paddingTop: 24 },
});
