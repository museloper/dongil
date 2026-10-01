import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useCurrentBook } from '@/features/queries';
import { useTheme } from '@/theme/theme';
import { AppText, PressableScale } from './ui';

/** 홈 상단: 현재 가계부 이름 ▾ — 누르면 가계부 선택 모달 */
export function BookSwitcher() {
  const { colors } = useTheme();
  const { book } = useCurrentBook();
  const shared = book?.type === 'SHARED';
  return (
    <PressableScale onPress={() => router.push('/books')} style={styles.row} scaleTo={0.96}>
      <View style={{ flexShrink: 1 }}>
        <AppText variant="caption" tone={shared ? 'primary' : 'textSub'}>
          {shared ? `공유 · ${book.members.map((m) => m.nickname).join(', ')}` : '개인 가계부'}
        </AppText>
        <View style={styles.row}>
          <AppText variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
            {book?.name ?? ' '}
          </AppText>
          <Ionicons name="chevron-down" size={20} color={colors.textSub} style={{ marginLeft: 4, marginTop: 2 }} />
        </View>
      </View>
    </PressableScale>
  );
}

/** 멤버 이니셜 아바타 묶음 */
export function MemberAvatars({ names, size = 28 }: { names: string[]; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {names.map((n, i) => (
        <View
          key={`${n}-${i}`}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: i === 0 ? colors.primarySoft : colors.fill,
              borderColor: colors.card,
              marginLeft: i === 0 ? 0 : -size / 4,
            },
          ]}>
          <AppText variant="caption" tone={i === 0 ? 'primary' : 'textSub'} style={{ fontWeight: '700' }}>
            {n.slice(0, 1)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
