import { useState, type ReactNode } from 'react';
import { useInstall } from '@/lib/install';
import { Icon, type IconName } from './icon';
import { AppText, Button, Card } from './ui';

const SKIP_KEY = 'install-gate-skipped';

/** "브라우저에서 계속" 은 이번 탭에서만 유지한다 — 다음에 열면 다시 설치를 권한다 */
function readSkipped() {
  try {
    return sessionStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

function Step({ n, icon, children }: { n: number; icon: IconName; children: ReactNode }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <span className="circle-icon" style={{ width: 36, height: 36, backgroundColor: 'var(--primarySoft)' }}>
        <AppText variant="label" tone="primary">{n}</AppText>
      </span>
      <AppText style={{ flex: 1 }}>{children}</AppText>
      <Icon name={icon} size={22} color="var(--textSub)" />
    </div>
  );
}

/** 홈 화면 앱으로 실행 중이 아니면 앱 대신 설치 안내부터 보여준다 */
export function InstallGate({ children }: { children: ReactNode }) {
  const { installed, promptEvent, isIos, isAndroid, install } = useInstall();
  const [skipped, setSkipped] = useState(readSkipped);

  if (installed || skipped) return children;

  const skip = () => {
    try {
      sessionStorage.setItem(SKIP_KEY, '1');
    } catch {
      /* private mode 등 */
    }
    setSkipped(true);
  };

  return (
    <main className="auth">
      <div className="fade-in-up" style={{ display: 'grid', gap: 10 }}>
        <span className="auth-logo">
          <Icon name="wallet" size={28} color="var(--onPrimary)" />
        </span>
        <h1 className="t t-title" style={{ fontSize: 28, whiteSpace: 'pre-line' }}>{'돈길을\n홈 화면에 설치해 주세요'}</h1>
        <AppText tone="textSub">앱처럼 전체 화면으로 열리고, 홈 화면에서 바로 기록할 수 있어요.</AppText>
      </div>

      <div className="fade-in-up" style={{ marginTop: 36, animationDelay: '120ms' }}>
        {promptEvent ? (
          <Button title="홈 화면에 설치" icon="download-outline" onClick={install} />
        ) : (
          <Card style={{ display: 'grid', gap: 16 }}>
            {isIos ? (
              <>
                <Step n={1} icon="share-outline">사파리 아래쪽 공유 버튼을 눌러요</Step>
                <Step n={2} icon="add-circle">"홈 화면에 추가"를 골라요</Step>
                <Step n={3} icon="checkmark-circle">홈 화면의 돈길 아이콘으로 열어요</Step>
              </>
            ) : (
              <>
                <Step n={1} icon={isAndroid ? 'ellipsis-vertical' : 'ellipsis-horizontal'}>브라우저 메뉴를 열어요</Step>
                <Step n={2} icon="download-outline">"앱 설치" 또는 "홈 화면에 추가"를 골라요</Step>
                <Step n={3} icon="checkmark-circle">설치된 돈길 앱으로 열어요</Step>
              </>
            )}
          </Card>
        )}
      </div>

      <div className="auth-footer">
        <Button title="브라우저에서 계속하기" kind="ghost" onClick={skip} />
      </div>
    </main>
  );
}
