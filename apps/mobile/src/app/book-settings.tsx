import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BOOK_MAX_MEMBERS, BookUpdateSchema, KST_OFFSET_MIN, type BookDto, type InviteDto } from '@dongil/shared';
import { AppText, Button, Card, ErrorState, Input, Loading, PressableScale, haptic } from '@/components/ui';
import { useCreateInvite, useCurrentBook, useLeaveOrRemove, useRenameBook } from '@/features/queries';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/theme';

/** 확인 대화상자 (웹은 바로 실행) */
function confirm(title: string, message: string, action: string, run: () => void) {
  if (Platform.OS === 'web') return run();
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: action, style: 'destructive', onPress: run },
  ]);
}

/** "10월 2일 15:20까지" (KST) */
function formatExpiry(iso: string) {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET_MIN * 60_000);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}까지`;
}

export default function BookSettingsScreen() {
  const { book, books } = useCurrentBook();
  if (books.error) return <ErrorState error={books.error} onRetry={() => books.refetch()} />;
  if (!book) return <Loading />;
  // 가계부가 바뀌면 입력 상태를 초기화
  return <BookSettings key={book.id} book={book} />;
}

function BookSettings({ book }: { book: BookDto }) {
  const { colors } = useTheme();
  const me = useAuth((s) => s.user);
  const rename = useRenameBook();
  const invite = useCreateInvite();
  const leave = useLeaveOrRemove();
  const [name, setName] = useState(book.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [code, setCode] = useState<InviteDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shared = book.type === 'SHARED';
  const isOwner = book.role === 'OWNER';
  const full = book.members.length >= BOOK_MAX_MEMBERS;

  const saveName = () => {
    const parsed = BookUpdateSchema.safeParse({ name });
    if (!parsed.success) return setNameError(parsed.error.issues[0].message);
    setNameError(null);
    rename.mutate({ id: book.id, name: parsed.data.name }, { onSuccess: () => haptic('success'), onError: (e) => setNameError(e.message) });
  };

  const makeInvite = () =>
    invite.mutate(book.id, {
      onSuccess: (inv) => {
        setCode(inv);
        haptic('success');
      },
      onError: (e) => setError(e.message),
    });

  const shareCode = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `[돈길] '${book.name}' 가계부에 초대해요.\n앱에서 가계부 → 초대 코드로 참여하기에 아래 코드를 입력하세요.\n\n초대 코드: ${code.code}\n(${formatExpiry(code.expiresAt)})`,
      });
    } catch {
      /* 공유 시트를 지원하지 않는 환경(데스크톱 웹 등)에서는 화면의 코드를 직접 전달 */
    }
  };

  const goHome = () => router.replace('/');
  const onDone = { onSuccess: goHome, onError: (e: Error) => setError(e.message) };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <AppText variant="heading">가계부 이름</AppText>
        <Input value={name} onChangeText={setName} maxLength={20} error={nameError} onSubmitEditing={saveName} />
        <Button title="이름 저장" kind="secondary" onPress={saveName} loading={rename.isPending} disabled={name.trim() === book.name} />
      </Card>

      <Card style={{ gap: 14 }}>
        <View style={styles.between}>
          <AppText variant="heading">멤버</AppText>
          {shared && (
            <AppText variant="label" tone="textSub">
              {book.members.length}/{BOOK_MAX_MEMBERS}명
            </AppText>
          )}
        </View>
        {book.members.map((m) => {
          const isMe = m.userId === me?.id;
          return (
            <View key={m.userId} style={styles.member}>
              <View style={[styles.avatar, { backgroundColor: isMe ? colors.primarySoft : colors.fill }]}>
                <AppText variant="label" tone={isMe ? 'primary' : 'textSub'}>
                  {m.nickname.slice(0, 1)}
                </AppText>
              </View>
              <AppText style={{ flex: 1 }}>
                {m.nickname}
                {isMe ? ' (나)' : ''}
              </AppText>
              {m.role === 'OWNER' && (
                <View style={[styles.badge, { backgroundColor: colors.fill }]}>
                  <AppText variant="caption" tone="textSub">만든 사람</AppText>
                </View>
              )}
              {shared && isOwner && !isMe && (
                <PressableScale
                  onPress={() =>
                    confirm(`${m.nickname}님을 내보낼까요?`, '내보내도 그동안 기록한 내역은 남아요', '내보내기', () =>
                      leave.mutate({ bookId: book.id, kind: 'member', userId: m.userId }, { onError: (e) => setError(e.message) }),
                    )
                  }>
                  <AppText variant="label" tone="expense">내보내기</AppText>
                </PressableScale>
              )}
            </View>
          );
        })}

        {!shared && (
          <AppText variant="caption" tone="textSub">
            개인 가계부는 나만 볼 수 있어요. 함께 쓰려면 가계부 목록에서 공유 가계부를 만들어 주세요.
          </AppText>
        )}

        {shared && !full && (
          <View style={[styles.inviteBox, { borderTopColor: colors.border }]}>
            {code ? (
              <Animated.View entering={FadeIn} style={{ alignItems: 'center', gap: 8 }}>
                <AppText variant="caption" tone="textSub">초대 코드</AppText>
                <AppText variant="hero" style={{ letterSpacing: 8 }} selectable>
                  {code.code}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {formatExpiry(code.expiresAt)} · 한 번만 사용할 수 있어요
                </AppText>
                <View style={[styles.between, { gap: 8, alignSelf: 'stretch', marginTop: 4 }]}>
                  <Button title="새 코드" kind="ghost" onPress={makeInvite} loading={invite.isPending} style={{ flex: 1 }} />
                  <Button title="공유하기" icon="share-outline" onPress={shareCode} style={{ flex: 2 }} />
                </View>
              </Animated.View>
            ) : (
              <Button title="초대 코드 만들기" icon="person-add-outline" onPress={makeInvite} loading={invite.isPending} />
            )}
          </View>
        )}
      </Card>

      {error && <AppText tone="expense" style={{ textAlign: 'center' }}>{error}</AppText>}

      {shared && (
        <Card padded={false} style={{ paddingVertical: 6 }}>
          {isOwner ? (
            <DangerRow
              label="가계부 삭제"
              onPress={() =>
                confirm(`'${book.name}'을(를) 삭제할까요?`, '모든 멤버의 내역·계좌·예산이 함께 지워지고 되돌릴 수 없어요', '삭제', () =>
                  leave.mutate({ bookId: book.id, kind: 'delete' }, onDone),
                )
              }
            />
          ) : (
            <DangerRow
              label="가계부 나가기"
              onPress={() =>
                confirm('이 가계부에서 나갈까요?', '다시 참여하려면 새 초대 코드가 필요해요', '나가기', () =>
                  leave.mutate({ bookId: book.id, kind: 'member', userId: me!.id }, onDone),
                )
              }
            />
          )}
        </Card>
      )}
    </ScrollView>
  );
}

function DangerRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} style={styles.dangerRow} scaleTo={0.98}>
      <Ionicons name="exit-outline" size={22} color={colors.expense} />
      <AppText tone="expense">{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  inviteBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 56 },
});
