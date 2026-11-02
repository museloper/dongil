import { create } from 'zustand';

/** 크롬 계열이 주는 설치 이벤트 (표준 타입에 아직 없음) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

interface InstallState {
  /** 이미 홈 화면 앱으로 실행 중 */
  installed: boolean;
  /** 크롬/엣지/삼성인터넷: 버튼 한 번으로 설치 가능 */
  promptEvent: BeforeInstallPromptEvent | null;
  /** iOS 사파리는 설치 이벤트가 없어 "공유 → 홈 화면에 추가" 를 안내해야 한다 */
  isIos: boolean;
  isAndroid: boolean;
  install: () => Promise<void>;
}

export const useInstall = create<InstallState>((set, get) => ({
  installed: standalone(),
  promptEvent: null,
  isIos: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  isAndroid: /android/i.test(navigator.userAgent),
  install: async () => {
    const e = get().promptEvent;
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    set({ promptEvent: null, installed: outcome === 'accepted' });
  },
}));

/** 이벤트는 앱이 그려지기 전에 올 수 있으므로 시작 시 바로 등록한다 */
export function listenInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ promptEvent: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ installed: true, promptEvent: null }));
}
