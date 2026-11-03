import { formatWon } from '@dongil/shared';
import { AppText } from './ui';

/** 숫자만 받는 금액 입력칸 (천 단위 콤마 자동) */
export function MoneyInput({ value, onChange, placeholder = '0', label }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="money-input">
      <input
        value={value ? formatWon(value, false) : ''}
        onChange={(e) => onChange(Math.min(Number(e.target.value.replace(/[^0-9]/g, '') || 0), 1_000_000_000_000))}
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={label}
      />
      <AppText tone="textSub">원</AppText>
    </div>
  );
}
