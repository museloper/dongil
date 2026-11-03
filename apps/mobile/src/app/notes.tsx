import { useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { NOTE_MAX_LENGTH, NoteCreateSchema, type BookDto, type NoteDto } from '@dongil/shared';
import { AppText, Button, Card, EmptyState, ErrorState, Input, Loading, PressableScale, haptic } from '@/components/ui';
import { useCurrentBook, useDeleteNote, useNotes, useSaveNote } from '@/features/queries';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/date';
import { useTheme } from '@/theme/theme';

export default function NotesScreen() {
  const { book } = useCurrentBook();
  const notes = useNotes();

  if (notes.error) return <ErrorState error={notes.error} onRetry={() => notes.refetch()} />;
  if (!book || !notes.data) return <Loading />;
  // 가계부가 바뀌면 작성 중인 내용을 초기화
  return <Notes key={book.id} book={book} notes={notes.data} refreshing={notes.isRefetching} onRefresh={() => notes.refetch()} />;
}

function Notes({ book, notes, refreshing, onRefresh }: {
  book: BookDto;
  notes: NoteDto[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState<NoteDto | null>(null);

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
      <NoteEditor key={editing?.id ?? 'new'} note={editing ?? undefined} shared={book.type === 'SHARED'} onDone={() => setEditing(null)} />

      {notes.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="아직 메모가 없어요"
          description={book.type === 'SHARED' ? '지출 계획이나 상의할 내용을 함께 적어 보세요' : '지출 계획이나 저축 목표를 적어 보세요'}
        />
      ) : (
        notes.map((n) => (
          <Animated.View key={n.id} layout={LinearTransition} entering={FadeInDown} exiting={FadeOut}>
            <NoteCard note={n} book={book} editing={editing?.id === n.id} onEdit={() => setEditing(n)} />
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

function NoteEditor({ note, shared, onDone }: { note?: NoteDto; shared: boolean; onDone: () => void }) {
  const save = useSaveNote();
  const [content, setContent] = useState(note?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = NoteCreateSchema.safeParse({ content });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    save.mutate(
      { id: note?.id, content: parsed.data.content },
      {
        onSuccess: () => {
          haptic('success');
          setContent('');
          onDone();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <Card style={{ gap: 12 }}>
      <AppText variant="heading">{note ? '메모 수정' : '새 메모'}</AppText>
      <Input
        value={content}
        onChangeText={setContent}
        placeholder={shared ? '이번 달 계획, 함께 상의할 내용…' : '이번 달 계획, 저축 목표…'}
        multiline
        maxLength={NOTE_MAX_LENGTH}
        error={error}
        style={styles.textarea}
        textAlignVertical="top"
      />
      <View style={styles.actions}>
        {note && <Button title="취소" kind="ghost" onPress={onDone} style={{ flex: 1 }} />}
        <Button
          title={note ? '수정 완료' : '메모 남기기'}
          onPress={submit}
          loading={save.isPending}
          disabled={!content.trim()}
          style={{ flex: 2 }}
        />
      </View>
    </Card>
  );
}

function NoteCard({ note, book, editing, onEdit }: { note: NoteDto; book: BookDto; editing: boolean; onEdit: () => void }) {
  const { colors } = useTheme();
  const me = useAuth((s) => s.user);
  const remove = useDeleteNote();
  const mine = note.author.id === me?.id;
  // 서버 규칙과 같다: 수정은 작성자만, 삭제는 작성자 또는 만든 사람(OWNER)
  const canDelete = mine || book.role === 'OWNER';
  const edited = note.updatedAt !== note.createdAt;

  const onDelete = () => {
    const run = () => remove.mutate(note.id, { onError: (e) => Alert.alert('삭제하지 못했어요', e.message) });
    if (Platform.OS === 'web') return run();
    Alert.alert('이 메모를 삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Card style={[{ gap: 10 }, editing && { borderWidth: 1.5, borderColor: colors.primary }]}>
      <View style={styles.meta}>
        <View style={[styles.avatar, { backgroundColor: mine ? colors.primarySoft : colors.fill }]}>
          <AppText variant="caption" tone={mine ? 'primary' : 'textSub'}>
            {note.author.nickname.slice(0, 1)}
          </AppText>
        </View>
        <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
          {note.author.nickname}
          {mine ? ' (나)' : ''}
        </AppText>
        <AppText variant="caption" tone="textMuted">
          {formatDateTime(note.updatedAt)}
          {edited ? ' · 수정됨' : ''}
        </AppText>
      </View>
      <AppText selectable>{note.content}</AppText>
      {(mine || canDelete) && (
        <View style={styles.cardActions}>
          {mine && (
            <PressableScale onPress={onEdit}>
              <AppText variant="label" tone="primary">수정</AppText>
            </PressableScale>
          )}
          {canDelete && (
            <PressableScale onPress={onDelete}>
              <AppText variant="label" tone="expense">삭제</AppText>
            </PressableScale>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  textarea: { height: 120, paddingTop: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
});
