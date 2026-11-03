import { useEffect } from 'react';
import { create } from 'zustand';
import { AppText, Button } from './ui';

interface ConfirmRequest {
  title: string;
  message?: string;
  action: string;
  resolve: (ok: boolean) => void;
}

const useDialog = create<{ current: ConfirmRequest | null }>(() => ({ current: null }));

/**
 * 되돌리기 어려운 동작(삭제·나가기 등) 확인. 브라우저 confirm() 대신 앱 스타일 시트를 띄운다.
 * `if (await confirm({...})) run()`
 */
export function confirm(opts: { title: string; message?: string; action: string }): Promise<boolean> {
  useDialog.getState().current?.resolve(false);
  return new Promise((resolve) => useDialog.setState({ current: { ...opts, resolve } }));
}

export function ConfirmHost() {
  const current = useDialog((s) => s.current);
  const close = (ok: boolean) => {
    current?.resolve(ok);
    useDialog.setState({ current: null });
  };

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!current) return null;
  return (
    <div className="backdrop" onClick={() => close(false)}>
      <div className="sheet" role="alertdialog" aria-modal aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <AppText variant="heading" style={{ textAlign: 'center' }}>
          <span id="confirm-title">{current.title}</span>
        </AppText>
        {current.message && (
          <AppText tone="textSub" style={{ textAlign: 'center' }}>{current.message}</AppText>
        )}
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <Button title="취소" kind="ghost" onClick={() => close(false)} style={{ flex: 1 }} />
          <Button title={current.action} kind="danger" onClick={() => close(true)} style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}

// ---------- 토스트 ----------

const useToast = create<{ message: string | null; id: number }>(() => ({ message: null, id: 0 }));

export function toast(message: string) {
  useToast.setState((s) => ({ message, id: s.id + 1 }));
}

export function ToastHost() {
  const { message, id } = useToast();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => useToast.setState({ message: null }), 2200);
    return () => clearTimeout(t);
  }, [message, id]);
  if (!message) return null;
  return (
    <div key={id} className="toast" role="status">
      {message}
    </div>
  );
}
