import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BOOK_MAX_MEMBERS, BookCreateSchema, JoinBookSchema, type BookDto } from '@/shared';
import { MemberAvatars } from '@/components/book-switcher';
import { toast } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { ModalHeader } from '@/components/screen';
import { AppText, Button, Card, Input, Pressable, haptic } from '@/components/ui';
import { useCreateBook, useCurrentBook, useJoinBook } from '@/features/queries';
import { useBookStore } from '@/lib/book-store';
import { useCloseModal } from '@/lib/nav';

type Panel = 'none' | 'create' | 'join';

/** 가계부 선택: 전환 / 공유 가계부 만들기 / 초대 코드로 참여 */
export default function BooksPage() {
  const close = useCloseModal();
  const { book: current, books } = useCurrentBook();
  const select = useBookStore((s) => s.select);
  const [panel, setPanel] = useState<Panel>('none');

  const choose = (b: BookDto) => {
    select(b.id);
    close();
  };

  return (
    <main className="modal">
      <ModalHeader title="가계부" />
      <div className="modal-body" style={{ gap: 12 }}>
        <Card padded={false} style={{ padding: '6px 0' }}>
          {books.data?.map((b) => {
            const active = b.id === current?.id;
            const shared = b.type === 'SHARED';
            return (
              <Pressable key={b.id} onClick={() => choose(b)} className="list-row" aria-current={active}>
                <span className="circle-icon" style={{ width: 40, height: 40, backgroundColor: shared ? 'var(--primarySoft)' : 'var(--fill)' }}>
                  <Icon name={shared ? 'people' : 'person'} size={20} color={shared ? 'var(--primary)' : 'var(--textSub)'} />
                </span>
                <span style={{ flex: 1, display: 'grid', gap: 2, textAlign: 'left', minWidth: 0 }}>
                  <AppText lines={1} style={{ fontWeight: active ? 700 : 500 }}>{b.name}</AppText>
                  <AppText variant="caption" tone="textSub">
                    {shared ? `공유 · ${b.members.length}/${BOOK_MAX_MEMBERS}명` : '나만 보는 가계부'}
                  </AppText>
                </span>
                {shared && <MemberAvatars names={b.members.map((m) => m.nickname)} size={26} />}
                {active && <Icon name="checkmark-circle" size={22} color="var(--primary)" style={{ marginLeft: 8 }} />}
              </Pressable>
            );
          })}
        </Card>

        {panel === 'none' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <Button title="공유 가계부 만들기" icon="people-outline" kind="secondary" onClick={() => setPanel('create')} />
            <Button title="초대 코드로 참여하기" icon="enter-outline" kind="ghost" onClick={() => setPanel('join')} />
          </div>
        )}
        {panel === 'create' && <CreatePanel onCancel={() => setPanel('none')} />}
        {panel === 'join' && <JoinPanel onCancel={() => setPanel('none')} onJoined={close} />}
      </div>
    </main>
  );
}

function CreatePanel({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
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
        navigate('/book-settings', { replace: true });
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Card className="fade-in-up" style={{ display: 'grid', gap: 14 }}>
      <AppText variant="heading">공유 가계부 만들기</AppText>
      <AppText tone="textSub">만든 뒤 초대 코드를 보내면 한 명과 함께 쓸 수 있어요</AppText>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 우리집 생활비"
        aria-label="가계부 이름"
        maxLength={20}
        error={error}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="row" style={{ gap: 8 }}>
        <Button title="취소" kind="ghost" onClick={onCancel} style={{ flex: 1 }} />
        <Button title="만들기" onClick={submit} loading={create.isPending} style={{ flex: 2 }} />
      </div>
    </Card>
  );
}

function JoinPanel({ onCancel, onJoined }: { onCancel: () => void; onJoined: () => void }) {
  const join = useJoinBook();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = JoinBookSchema.safeParse({ code });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    join.mutate(parsed.data.code, {
      onSuccess: (book) => {
        haptic('success');
        toast(`'${book.name}'에 참여했어요`);
        onJoined();
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Card className="fade-in-up" style={{ display: 'grid', gap: 14 }}>
      <AppText variant="heading">초대 코드로 참여하기</AppText>
      <AppText tone="textSub">상대에게 받은 6자리 코드를 입력하세요</AppText>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC234"
        aria-label="초대 코드"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={6}
        error={error}
        autoFocus
        className="code-input"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="row" style={{ gap: 8 }}>
        <Button title="취소" kind="ghost" onClick={onCancel} style={{ flex: 1 }} />
        <Button title="참여하기" onClick={submit} loading={join.isPending} style={{ flex: 2 }} />
      </div>
    </Card>
  );
}
