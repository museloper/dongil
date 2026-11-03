import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useCloseModal } from '@/lib/nav';
import { Icon, type IconName } from './icon';
import { AppText, IconButton, Pressable } from './ui';

/** 탭 화면 공통 레이아웃: 큰 제목 + 오른쪽 요소 */
export function Screen({ title, right, children, flush }: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  /** 본문 좌우 여백을 직접 관리할 때 */
  flush?: boolean;
}) {
  return (
    <main className="screen">
      {(title || right) && (
        <header className="screen-header">
          {typeof title === 'string' ? <h1 className="t t-title">{title}</h1> : (title ?? <span />)}
          {right}
        </header>
      )}
      <div className={flush ? 'screen-body-flush' : 'screen-body'}>{children}</div>
    </main>
  );
}

/** 하위 화면(자산 관리 등) 헤더: 뒤로 + 제목 */
export function SubScreen({ title, children }: { title: string; children: ReactNode }) {
  const close = useCloseModal();
  return (
    <main className="screen">
      <header className="sub-header">
        <IconButton name="chevron-back" label="뒤로" onClick={close} />
        <AppText variant="heading">{title}</AppText>
        <span style={{ width: 40 }} />
      </header>
      <div className="screen-body" style={{ paddingTop: 8 }}>{children}</div>
    </main>
  );
}

/** 모달 화면(거래 입력 등) 헤더: 닫기 + 제목 + 오른쪽 */
export function ModalHeader({ title, right }: { title: string; right?: ReactNode }) {
  const close = useCloseModal();
  return (
    <header className="sub-header">
      <IconButton name="close" label="닫기" onClick={close} />
      <AppText variant="heading">{title}</AppText>
      {right ?? <span style={{ width: 40 }} />}
    </header>
  );
}

/** 우측 하단 + 버튼: 거래 추가 */
export function Fab() {
  const navigate = useNavigate();
  return (
    <Pressable aria-label="거래 추가" title="거래 추가" onClick={() => navigate('/transaction/new')} className="fab">
      <Icon name="add" size={30} color="var(--onPrimary)" />
    </Pressable>
  );
}

const TABS: { to: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { to: '/', title: '홈', icon: 'home-outline', activeIcon: 'home' },
  { to: '/transactions', title: '내역', icon: 'receipt-outline', activeIcon: 'receipt' },
  { to: '/stats', title: '통계', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
  { to: '/budget', title: '예산', icon: 'wallet-outline', activeIcon: 'wallet' },
  { to: '/settings', title: '설정', icon: 'settings-outline', activeIcon: 'settings' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end className="tab">
          {({ isActive }) => (
            <>
              <Icon name={isActive ? t.activeIcon : t.icon} size={24} color={isActive ? 'var(--text)' : 'var(--textMuted)'} />
              <span className="tab-label" style={{ color: isActive ? 'var(--text)' : 'var(--textMuted)' }}>{t.title}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
