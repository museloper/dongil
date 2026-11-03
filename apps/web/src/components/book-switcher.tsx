import { useNavigate } from 'react-router';
import { useCurrentBook } from '@/features/queries';
import { Icon } from './icon';
import { AppText, Pressable } from './ui';

/** 홈 상단: 현재 가계부 이름 ▾ — 누르면 가계부 선택 화면 */
export function BookSwitcher() {
  const navigate = useNavigate();
  const { book } = useCurrentBook();
  const shared = book?.type === 'SHARED';
  return (
    <Pressable onClick={() => navigate('/books')} className="book-switcher" aria-label="가계부 전환">
      <AppText variant="caption" tone={shared ? 'primary' : 'textSub'} lines={1}>
        {shared ? `공유 · ${book.members.map((m) => m.nickname).join(', ')}` : '개인 가계부'}
      </AppText>
      <span className="row" style={{ gap: 4, minWidth: 0 }}>
        <AppText variant="title" lines={1}>{book?.name ?? ' '}</AppText>
        <Icon name="chevron-down" size={20} color="var(--textSub)" />
      </span>
    </Pressable>
  );
}

/** 멤버 이니셜 아바타 묶음 */
export function MemberAvatars({ names, size = 28 }: { names: string[]; size?: number }) {
  return (
    <span className="row">
      {names.map((n, i) => (
        <span
          key={`${n}-${i}`}
          className="avatar-stack"
          style={{
            width: size,
            height: size,
            backgroundColor: i === 0 ? 'var(--primarySoft)' : 'var(--fill)',
            marginLeft: i === 0 ? 0 : -size / 4,
          }}>
          <AppText variant="caption" tone={i === 0 ? 'primary' : 'textSub'} style={{ fontWeight: 700 }}>
            {n.slice(0, 1)}
          </AppText>
        </span>
      ))}
    </span>
  );
}
