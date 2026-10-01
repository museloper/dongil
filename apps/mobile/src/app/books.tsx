import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookCreateSchema, JoinBookSchema, type BookDto } from '@dongil/shared';
import { MemberAvatars } from '@/components/book-switcher';
import { AppText, Button, Card, IconButton, Input, PressableScale, haptic } from '@/components/ui';
import { useCreateBook, useCurrentBook, useJoinBook } from '@/features/queries';
import { useBookStore } from '@/lib/book-store';
import { closeModal } from '@/lib/nav';
import { useTheme } from '@/theme/theme';

type Panel = 'none' | 'create' | 'join';

/** 가계부 선택 모달: 전환 / 공유 가계부 만들기 / 초대 코드로 참여 */
export default function BooksScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { book: current, books } = useCurrentBook();
  const select = useBookStore((s) => s.select);
  const [panel, setPanel] = useState<Panel>('none');

  const choose = (b: BookDto) => {
    haptic();
    select(b.id);
    closeModal();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 16 }]}>
        <IconButton name="close" label="닫기" onPress={closeModal} />
        <AppText variant="heading">가계부</AppText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card padded={false} style={{ paddingVertical: 6 }}>
          {books.data?.map((b) => {
            const active = b.id === current?.id;
            const shared = b.type === 'SHARED';
            return (
              <PressableScale key={b.id} onPress={() => choose(b)} style={styles.bookRow} scaleTo={0.98}>
                <View style={[styles.bookIcon, { backgroundColor: shared ? colors.primarySoft : colors.fill }]}>
                  <Ionicons name={shared ? 'people' : 'person'} size={20} color={shared ? colors.primary : colors.textSub} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText style={{ fontWeight: active ? '700' : '500' }}>{b.name}</AppText>
                  <AppText variant="caption" tone="textSub">
                    {shared ? `공유 · ${b.members.length}/2명` : '나만 보는 가계부'}
                  </AppText>
                </View>
                {shared && <MemberAvatars names={b.members.map((m) => m.nickname)} size={26} />}
                {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={{ marginLeft: 8 }} />}
              </PressableScale>
            );
          })}
        </Card>

        {panel === 'none' && (
          <View style={{ gap: 10 }}>
            <Button title="공유 가계부 만들기" icon="people-outline" kind="secondary" onPress={() => setPanel('create')} />
            <Button title="초대 코드로 참여하기" icon="enter-outline" kind="ghost" onPress={() => setPanel('join')} />
          </View>
        )}
        {panel === 'create' && <CreatePanel onCancel={() => setPanel('none')} />}
        {panel === 'join' && <JoinPanel onCancel={() => setPanel('none')} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CreatePanel({ onCancel }: { onCancel: () => void }) {
  const create = useCreateBook();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = BookCreateSchema.safeParse({ name });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    create.mutate(parsed.data.name, {
      onSuccess: () => {
        haptic('success');
        // 만든 직후 바로 초대할 수 있도록 설정 화면으로
        router.replace('/book-settings');
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <Card style={{ gap: 14 }}>
        <AppText variant="heading">공유 가계부 만들기</AppText>
        <AppText tone="textSub">만든 뒤 초대 코드를 보내면 한 명과 함께 쓸 수 있어요</AppText>
        <Input value={name} onChangeText={setName} placeholder="예: 우리집 생활비" maxLength={20} error={error} onSubmitEditing={submit} />
        <View style={styles.actions}>
          <Button title="취소" kind="ghost" onPress={onCancel} style={{ flex: 1 }} />
          <Button title="만들기" onPress={submit} loading={create.isPending} style={{ flex: 2 }} />
        </View>
      </Card>
    </Animated.View>
  );
}

function JoinPanel({ onCancel }: { onCancel: () => void }) {
  const join = useJoinBook();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = JoinBookSchema.safeParse({ code });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    join.mutate(parsed.data.code, {
      onSuccess: () => {
        haptic('success');
        closeModal();
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <Card style={{ gap: 14 }}>
        <AppText variant="heading">초대 코드로 참여하기</AppText>
        <AppText tone="textSub">상대에게 받은 6자리 코드를 입력하세요</AppText>
        <Input
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="ABC234"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          error={error}
          style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: '700' }}
          onSubmitEditing={submit}
        />
        <View style={styles.actions}>
          <Button title="취소" kind="ghost" onPress={onCancel} style={{ flex: 1 }} />
          <Button title="참여하기" onPress={submit} loading={join.isPending} style={{ flex: 2 }} />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  bookIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
});
