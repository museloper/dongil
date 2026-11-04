import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { confirm, toast } from '@/components/dialog';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { AppText, Card, Pressable, Segmented, Spinner, haptic } from '@/components/ui';
import { useCurrentBook } from '@/features/queries';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMonthLabel } from '@/lib/date';
import { exportMonthCsv } from '@/lib/export';
import { useInstall } from '@/lib/install';
import { useMonth } from '@/lib/ui-store';
import { useThemeStore, type ThemeMode } from '@/theme/theme';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, setMode } = useThemeStore();
  const month = useMonth((s) => s.month);
  const { book } = useCurrentBook();
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    if (!book) return;
    setExporting(true);
    try {
      await exportMonthCsv(book.id, month);
      haptic('success');
    } catch (e) {
      toast(`내보내기 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const onLogout = async () => {
    if (await confirm({ title: '로그아웃할까요?', action: '로그아웃' })) logout();
  };

  return (
    <Screen title="설정">
      <Card className="row" style={{ gap: 14 }}>
        <span className="avatar" style={{ width: 52, height: 52 }}>
          <AppText variant="title" tone="primary">{user?.nickname.slice(0, 1) ?? '?'}</AppText>
        </span>
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <AppText variant="heading" lines={1}>{user?.nickname}</AppText>
          <AppText variant="caption" tone="textSub" lines={1}>{user?.email}</AppText>
        </div>
      </Card>

      <InstallCard />

      <Card style={{ display: 'grid', gap: 12 }}>
        <AppText variant="heading">화면 테마</AppText>
        <Segmented<ThemeMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'system', label: '시스템' },
            { value: 'light', label: '라이트' },
            { value: 'dark', label: '다크' },
          ]}
        />
      </Card>

      <Card padded={false} style={{ padding: '6px 0' }}>
        <MenuRow
          icon={book?.type === 'SHARED' ? 'people-outline' : 'book-outline'}
          label="가계부 설정"
          onClick={() => navigate('/book-settings')}
          right={<AppText variant="label" tone="textSub" lines={1} style={{ maxWidth: 140 }}>{book?.name}</AppText>}
        />
        <MenuRow icon="document-text-outline" label="가계부 메모" onClick={() => navigate('/notes')} />
        <MenuRow icon="pricetag-outline" label="태그별 내역" onClick={() => navigate('/tags')} />
        <MenuRow icon="swap-horizontal-outline" label="가계부 전환 · 참여" onClick={() => navigate('/books')} />
      </Card>

      <Card padded={false} style={{ padding: '6px 0' }}>
        <MenuRow icon="card-outline" label="자산 관리" onClick={() => navigate('/accounts')} />
        <MenuRow icon="pricetags-outline" label="카테고리 관리" onClick={() => navigate('/categories')} />
        <MenuRow
          icon="download-outline"
          label={`${formatMonthLabel(month)} CSV 내보내기`}
          onClick={onExport}
          right={exporting ? <Spinner color="var(--textMuted)" size={18} /> : undefined}
        />
      </Card>

      <Card padded={false} style={{ padding: '6px 0' }}>
        <MenuRow icon="log-out-outline" label="로그아웃" onClick={onLogout} danger />
      </Card>

      <AppText variant="caption" tone="textMuted" style={{ textAlign: 'center', marginTop: 8, wordBreak: 'break-all' }}>
        돈길 웹 v{__APP_VERSION__} · {API_BASE}
      </AppText>
    </Screen>
  );
}

/** 홈 화면에 앱으로 설치 안내 (이미 설치돼 실행 중이면 숨김) */
function InstallCard() {
  const { installed, promptEvent, isIos, install } = useInstall();
  if (installed || (!promptEvent && !isIos)) return null;
  return (
    <Card className="row" style={{ gap: 14 }}>
      <span className="circle-icon" style={{ width: 44, height: 44, backgroundColor: 'var(--primarySoft)' }}>
        <Icon name="phone-portrait-outline" size={22} color="var(--primary)" />
      </span>
      <div style={{ flex: 1, display: 'grid', gap: 2 }}>
        <AppText variant="heading">홈 화면에 추가</AppText>
        <AppText variant="caption" tone="textSub">
          {promptEvent ? '앱처럼 바로 열 수 있어요' : '사파리 공유 버튼 → "홈 화면에 추가"를 눌러 주세요'}
        </AppText>
      </div>
      {promptEvent && (
        <Pressable onClick={install} className="chip" style={{ backgroundColor: 'var(--primary)' }}>
          <AppText variant="label" style={{ color: 'var(--onPrimary)' }}>설치</AppText>
        </Pressable>
      )}
    </Card>
  );
}

function MenuRow({ icon, label, onClick, right, danger }: {
  icon: IconName;
  label: string;
  onClick: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable onClick={onClick} className="menu-row">
      <Icon name={icon} size={22} color={danger ? 'var(--expense)' : 'var(--textSub)'} />
      <AppText tone={danger ? 'expense' : 'text'} style={{ flex: 1, textAlign: 'left' }}>{label}</AppText>
      {right ?? (!danger && <Icon name="chevron-forward" size={18} color="var(--textMuted)" />)}
    </Pressable>
  );
}
