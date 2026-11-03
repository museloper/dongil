import type { FormEvent, ReactNode } from 'react';
import { Icon } from './icon';
import { AppText } from './ui';

/** 로그인/회원가입 공통 레이아웃 */
export function AuthShell({ title, subtitle, children, footer, onSubmit }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: () => void;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <main className="auth">
      <div className="fade-in-up" style={{ display: 'grid', gap: 10 }}>
        <span className="auth-logo">
          <Icon name="wallet" size={28} color="var(--onPrimary)" />
        </span>
        <h1 className="t t-title" style={{ fontSize: 28, whiteSpace: 'pre-line' }}>{title}</h1>
        <AppText tone="textSub">{subtitle}</AppText>
      </div>
      <form className="auth-form fade-in-up" style={{ animationDelay: '120ms' }} onSubmit={submit} noValidate>
        {children}
      </form>
      <div className="auth-footer">{footer}</div>
    </main>
  );
}
