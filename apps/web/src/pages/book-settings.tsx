import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BOOK_MAX_MEMBERS, BookUpdateSchema, KST_OFFSET_MIN, type BookDto, type InviteDto } from '@dongil/shared';
import { confirm, toast } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { SubScreen } from '@/components/screen';
import { AppText, Button, Card, ErrorState, Input, Loading, Pressable, haptic } from '@/components/ui';
import { useCreateInvite, useCurrentBook, useLeaveOrRemove, useRenameBook } from '@/features/queries';
import { useAuth } from '@/lib/auth';

/** "10월 2일 15:20까지" (KST) */
function formatExpiry(iso: string) {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET_MIN * 60_000);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}까지`;
}

export default function BookSettingsPage() {
  const { book, books } = useCurrentBook();
  return (
    <SubScreen title="가계부 설정">
      {books.error ? (
        <ErrorState error={books.error} onRetry={() => books.refetch()} />
      ) : !book ? (
        <Loading />
      ) : (
        // 가계부가 바뀌면 입력 상태를 초기화
        <BookSettings key={book.id} book={book} />
      )}
    </SubScreen>
  );
}

function BookSettings({ book }: { book: BookDto }) {
  const navigate = useNavigate();
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
    rename.mutate(
      { id: book.id, name: parsed.data.name },
      {
        onSuccess: () => {
          haptic('success');
          toast('이름을 바꿨어요');
        },
        onError: (e) => setNameError(e.message),
      },
    );
  };

  const makeInvite = () =>
    invite.mutate(book.id, {
      onSuccess: (inv) => {
        setCode(inv);
        haptic('success');
      },
      onError: (e) => setError(e.message),
    });

  /** 공유 시트가 있으면(모바일) 공유, 없으면(데스크톱) 클립보드에 복사 */
  const shareCode = async () => {
    if (!code) return;
    const text = `[돈길] '${book.name}' 가계부에 초대해요.\n가계부 → 초대 코드로 참여하기에 아래 코드를 입력하세요.\n\n초대 코드: ${code.code}\n(${formatExpiry(code.expiresAt)})`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* 사용자가 공유를 취소 */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('초대 메시지를 복사했어요');
    } catch {
      toast('복사하지 못했어요. 화면의 코드를 직접 전달해 주세요');
    }
  };

  const goHome = () => navigate('/', { replace: true });
  const onDone = { onSuccess: goHome, onError: (e: Error) => setError(e.message) };

  const kick = async (userId: string, nickname: string) => {
    if (!(await confirm({ title: `${nickname}님을 내보낼까요?`, message: '내보내도 그동안 기록한 내역은 남아요', action: '내보내기' }))) return;
    leave.mutate({ bookId: book.id, kind: 'member', userId }, { onError: (e) => setError(e.message) });
  };

  const removeBook = async () => {
    const ok = await confirm({
      title: `'${book.name}'을(를) 삭제할까요?`,
      message: '모든 멤버의 내역·계좌·예산이 함께 지워지고 되돌릴 수 없어요',
      action: '삭제',
    });
    if (ok) leave.mutate({ bookId: book.id, kind: 'delete' }, onDone);
  };

  const leaveBook = async () => {
    if (!me) return;
    if (await confirm({ title: '이 가계부에서 나갈까요?', message: '다시 참여하려면 새 초대 코드가 필요해요', action: '나가기' })) {
      leave.mutate({ bookId: book.id, kind: 'member', userId: me.id }, onDone);
    }
  };

  return (
    <>
      <Card style={{ display: 'grid', gap: 12 }}>
        <AppText variant="heading">가계부 이름</AppText>
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="가계부 이름" maxLength={20} error={nameError} onKeyDown={(e) => e.key === 'Enter' && saveName()} />
        <Button title="이름 저장" kind="secondary" onClick={saveName} loading={rename.isPending} disabled={name.trim() === book.name} />
      </Card>

      <Card style={{ display: 'grid', gap: 14 }}>
        <div className="row between">
          <AppText variant="heading">멤버</AppText>
          {shared && (
            <AppText variant="label" tone="textSub">{book.members.length}/{BOOK_MAX_MEMBERS}명</AppText>
          )}
        </div>
        {book.members.map((m) => {
          const isMe = m.userId === me?.id;
          return (
            <div key={m.userId} className="row" style={{ gap: 12 }}>
              <span className="avatar" style={{ width: 36, height: 36, backgroundColor: isMe ? 'var(--primarySoft)' : 'var(--fill)' }}>
                <AppText variant="label" tone={isMe ? 'primary' : 'textSub'}>{m.nickname.slice(0, 1)}</AppText>
              </span>
              <AppText style={{ flex: 1 }} lines={1}>
                {m.nickname}
                {isMe ? ' (나)' : ''}
              </AppText>
              {m.role === 'OWNER' && (
                <span className="badge" style={{ backgroundColor: 'var(--fill)' }}>
                  <AppText variant="caption" tone="textSub">만든 사람</AppText>
                </span>
              )}
              {shared && isOwner && !isMe && (
                <Pressable onClick={() => kick(m.userId, m.nickname)}>
                  <AppText variant="label" tone="expense">내보내기</AppText>
                </Pressable>
              )}
            </div>
          );
        })}

        {!shared && (
          <AppText variant="caption" tone="textSub">
            개인 가계부는 나만 볼 수 있어요. 함께 쓰려면 가계부 목록에서 공유 가계부를 만들어 주세요.
          </AppText>
        )}

        {shared && !full && (
          <div className="invite-box">
            {code ? (
              <div className="fade-in" style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
                <AppText variant="caption" tone="textSub">초대 코드</AppText>
                <AppText variant="hero" className="invite-code">{code.code}</AppText>
                <AppText variant="caption" tone="textMuted">{formatExpiry(code.expiresAt)} · 한 번만 사용할 수 있어요</AppText>
                <div className="row" style={{ gap: 8, alignSelf: 'stretch', justifySelf: 'stretch', marginTop: 4 }}>
                  <Button title="새 코드" kind="ghost" onClick={makeInvite} loading={invite.isPending} style={{ flex: 1 }} />
                  <Button title={'share' in navigator ? '공유하기' : '복사하기'} icon={'share' in navigator ? 'share-outline' : 'copy-outline'} onClick={shareCode} style={{ flex: 2 }} />
                </div>
              </div>
            ) : (
              <Button title="초대 코드 만들기" icon="person-add-outline" onClick={makeInvite} loading={invite.isPending} />
            )}
          </div>
        )}
      </Card>

      {error && <AppText tone="expense" style={{ textAlign: 'center' }}>{error}</AppText>}

      {shared && (
        <Card padded={false} style={{ padding: '6px 0' }}>
          <Pressable onClick={isOwner ? removeBook : leaveBook} className="menu-row">
            <Icon name="exit-outline" size={22} color="var(--expense)" />
            <AppText tone="expense">{isOwner ? '가계부 삭제' : '가계부 나가기'}</AppText>
          </Pressable>
        </Card>
      )}
    </>
  );
}
