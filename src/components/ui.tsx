import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import type { ColorToken } from '@/theme/tokens';
import { Icon, type IconName } from './icon';

/** 진동 피드백 (안드로이드 크롬 등 지원하는 브라우저에서만) */
export function haptic(kind: 'select' | 'success' | 'warn' = 'select') {
  navigator.vibrate?.(kind === 'select' ? 8 : kind === 'success' ? [10, 40, 10] : 30);
}

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

// ---------- Text ----------

export type TextVariant = 'hero' | 'title' | 'heading' | 'body' | 'label' | 'caption';

export function AppText({
  variant = 'body',
  tone = 'text',
  lines,
  className,
  style,
  role,
  children,
}: {
  variant?: TextVariant;
  tone?: ColorToken;
  /** 지정하면 그 줄 수에서 말줄임 */
  lines?: number;
  className?: string;
  style?: CSSProperties;
  role?: string;
  children?: ReactNode;
}) {
  return (
    <span
      role={role}
      className={cx('t', `t-${variant}`, lines === 1 && 'ellipsis', className)}
      style={{ color: `var(--${tone})`, ...style }}>
      {children}
    </span>
  );
}

// ---------- Surfaces ----------

export function Card({ children, padded = true, className, style }: {
  children: ReactNode;
  padded?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cx('card', padded && 'card-padded', className)} style={style}>
      {children}
    </div>
  );
}

/** 누르면 살짝 작아지는 버튼 + 진동 */
export function Pressable({
  className,
  onClick,
  withHaptic = true,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { withHaptic?: boolean }) {
  return (
    <button
      type={type}
      className={cx('pressable', className)}
      onClick={(e) => {
        if (withHaptic) haptic();
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function Spinner({ color = 'var(--primary)', size = 22 }: { color?: string; size?: number }) {
  return <span className="spinner" style={{ width: size, height: size, borderColor: color, borderRightColor: 'transparent' }} />;
}

export function Button({
  title,
  onClick,
  kind = 'primary',
  loading,
  disabled,
  icon,
  type = 'button',
  style,
}: {
  title: string;
  onClick?: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  type?: 'button' | 'submit';
  style?: CSSProperties;
}) {
  const fg = { primary: 'var(--onPrimary)', secondary: 'var(--primary)', danger: 'var(--expense)', ghost: 'var(--textSub)' }[kind];
  return (
    <Pressable
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cx('button', `button-${kind}`, disabled && 'is-disabled')}
      style={style}>
      {loading ? (
        <Spinner color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <span className="t t-heading" style={{ color: fg }}>{title}</span>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onClick, size = 22, tone = 'text', label, disabled }: {
  name: IconName;
  label: string;
  onClick: () => void;
  size?: number;
  tone?: ColorToken;
  disabled?: boolean;
}) {
  return (
    <Pressable onClick={onClick} className="icon-button" aria-label={label} title={label} disabled={disabled}>
      <Icon name={name} size={size} color={`var(--${tone})`} />
    </Pressable>
  );
}

export function Input({ label, error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
}) {
  return (
    <label className="field">
      {label && <AppText variant="label" tone="textSub">{label}</AppText>}
      <input className={cx('input', error && 'input-error', className)} aria-invalid={!!error} {...rest} />
      {error ? <AppText variant="caption" tone="expense">{error}</AppText> : null}
    </label>
  );
}

// ---------- Controls ----------

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cx('segment', active && 'segment-active')}
            onClick={() => {
              if (!active) haptic();
              onChange(o.value);
            }}>
            <AppText variant="label" tone={active ? 'text' : 'textSub'}>{o.label}</AppText>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <Pressable
      onClick={onClick}
      className="chip"
      aria-pressed={active}
      style={{ backgroundColor: active ? (color ?? 'var(--primary)') : 'var(--fill)' }}>
      <AppText variant="label" style={{ color: active ? 'var(--onPrimary)' : 'var(--textSub)' }}>{label}</AppText>
    </Pressable>
  );
}

// ---------- Feedback ----------

/** 사용률에 따라 색이 바뀌는 진행 바 (80% 경고, 100% 초과) */
export function ProgressBar({ ratio, height = 8, color }: { ratio: number; height?: number; color?: string }) {
  // 첫 렌더는 0 에서 시작해 차오르도록
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.min(Math.max(ratio, 0), 1)));
    return () => cancelAnimationFrame(id);
  }, [ratio]);
  const fill = color ?? (ratio >= 1 ? 'var(--expense)' : ratio >= 0.8 ? 'var(--warn)' : 'var(--primary)');
  return (
    <div className="progress" style={{ height, borderRadius: height }}>
      <div className="progress-fill" style={{ width: `${shown * 100}%`, borderRadius: height, backgroundColor: fill }} />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={28} color="var(--textMuted)" />
      </div>
      <AppText variant="heading">{title}</AppText>
      {description && (
        <AppText tone="textSub" style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>
          {description}
        </AppText>
      )}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="불러오지 못했어요"
      description={error instanceof Error ? error.message : undefined}
      action={onRetry && <Button title="다시 시도" kind="secondary" onClick={onRetry} style={{ marginTop: 8 }} />}
    />
  );
}

export function Loading() {
  return (
    <div className="empty">
      <Spinner />
    </div>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="row between" style={{ marginBottom: 12 }}>
      <AppText variant="heading">{title}</AppText>
      {right}
    </div>
  );
}
