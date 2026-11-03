import { useState } from 'react';
import { NOTE_MAX_LENGTH, NoteCreateSchema, type BookDto, type NoteDto } from '@dongil/shared';
import { confirm, toast } from '@/components/dialog';
import { SubScreen } from '@/components/screen';
import { AppText, Button, Card, EmptyState, ErrorState, Loading, Pressable, haptic } from '@/components/ui';
import { useCurrentBook, useDeleteNote, useNotes, useSaveNote } from '@/features/queries';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/date';

export default function NotesPage() {
  const { book } = useCurrentBook();
  const notes = useNotes();
  return (
    <SubScreen title="가계부 메모">
      {notes.error ? (
        <ErrorState error={notes.error} onRetry={() => notes.refetch()} />
      ) : !book || !notes.data ? (
        <Loading />
      ) : (
        // 가계부가 바뀌면 작성 중인 내용을 초기화
        <Notes key={book.id} book={book} notes={notes.data} />
      )}
    </SubScreen>
  );
}

function Notes({ book, notes }: { book: BookDto; notes: NoteDto[] }) {
  const [editing, setEditing] = useState<NoteDto | null>(null);
  return (
    <>
      <NoteEditor key={editing?.id ?? 'new'} note={editing ?? undefined} shared={book.type === 'SHARED'} onDone={() => setEditing(null)} />
      {notes.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="아직 메모가 없어요"
          description={book.type === 'SHARED' ? '지출 계획이나 상의할 내용을 함께 적어 보세요' : '지출 계획이나 저축 목표를 적어 보세요'}
        />
      ) : (
        notes.map((n) => <NoteCard key={n.id} note={n} book={book} editing={editing?.id === n.id} onEdit={() => setEditing(n)} />)
      )}
    </>
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
          toast(note ? '수정했어요' : '메모를 남겼어요');
          setContent('');
          onDone();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <Card className={note ? 'fade-in-up' : undefined} style={{ display: 'grid', gap: 12 }}>
      <AppText variant="heading">{note ? '메모 수정' : '새 메모'}</AppText>
      <div className="field">
        <textarea
          className={`input textarea${error ? ' input-error' : ''}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={shared ? '이번 달 계획, 함께 상의할 내용…' : '이번 달 계획, 저축 목표…'}
          maxLength={NOTE_MAX_LENGTH}
          aria-label="메모 내용"
        />
        {error && <AppText variant="caption" tone="expense">{error}</AppText>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        {note && <Button title="취소" kind="ghost" onClick={onDone} style={{ flex: 1 }} />}
        <Button
          title={note ? '수정 완료' : '메모 남기기'}
          onClick={submit}
          loading={save.isPending}
          disabled={!content.trim()}
          style={{ flex: 2 }}
        />
      </div>
    </Card>
  );
}

function NoteCard({ note, book, editing, onEdit }: { note: NoteDto; book: BookDto; editing: boolean; onEdit: () => void }) {
  const me = useAuth((s) => s.user);
  const remove = useDeleteNote();
  const mine = note.author.id === me?.id;
  // 서버 규칙과 같다: 수정은 작성자만, 삭제는 작성자 또는 만든 사람(OWNER)
  const canDelete = mine || book.role === 'OWNER';
  const edited = note.updatedAt !== note.createdAt;

  const onDelete = async () => {
    if (!(await confirm({ title: '이 메모를 삭제할까요?', action: '삭제' }))) return;
    remove.mutate(note.id, { onSuccess: () => toast('삭제했어요'), onError: (e) => toast(e.message) });
  };

  return (
    <Card style={{ display: 'grid', gap: 10, ...(editing && { boxShadow: 'inset 0 0 0 1.5px var(--primary)' }) }}>
      <div className="row" style={{ gap: 8 }}>
        <span
          className="circle-icon"
          style={{ width: 26, height: 26, backgroundColor: mine ? 'var(--primarySoft)' : 'var(--fill)' }}>
          <AppText variant="caption" tone={mine ? 'primary' : 'textSub'}>{note.author.nickname.slice(0, 1)}</AppText>
        </span>
        <AppText variant="label" lines={1} style={{ flex: 1 }}>
          {note.author.nickname}
          {mine ? ' (나)' : ''}
        </AppText>
        <AppText variant="caption" tone="textMuted" className="nowrap">
          {formatDateTime(note.updatedAt)}
          {edited ? ' · 수정됨' : ''}
        </AppText>
      </div>
      <AppText className="note-content">{note.content}</AppText>
      {(mine || canDelete) && (
        <div className="row" style={{ justifyContent: 'flex-end', gap: 16 }}>
          {mine && (
            <Pressable onClick={onEdit}>
              <AppText variant="label" tone="primary">수정</AppText>
            </Pressable>
          )}
          {canDelete && (
            <Pressable onClick={onDelete}>
              <AppText variant="label" tone="expense">삭제</AppText>
            </Pressable>
          )}
        </div>
      )}
    </Card>
  );
}
