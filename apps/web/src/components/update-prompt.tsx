import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppText, Button } from './ui';

/** 새 버전이 배포되면 하단에 새로고침 안내. 입력 중인 내용을 날리지 않도록 자동으로 바꾸지 않는다 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // 오래 켜둔 홈 화면 앱도 새 버전을 알 수 있도록 1시간마다 확인
      if (reg) setInterval(() => reg.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update-bar" role="status">
      <AppText variant="label" style={{ flex: 1 }}>새 버전이 있어요</AppText>
      <Button title="나중에" kind="ghost" onClick={() => setNeedRefresh(false)} style={{ height: 40 }} />
      <Button title="새로고침" onClick={() => updateServiceWorker(true)} style={{ height: 40 }} />
    </div>
  );
}
