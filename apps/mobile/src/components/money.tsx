import { useEffect, useRef, useState } from 'react';
import { formatWon } from '@dongil/shared';
import { AppText, type TextVariant } from './ui';
import type { ColorToken } from '@/theme/tokens';

/** 값이 바뀔 때 숫자가 촤라락 올라가는 금액 텍스트 */
export function CountUp({
  value,
  variant = 'hero',
  tone = 'text',
  prefix = '',
  duration = 650,
  format = formatWon,
}: {
  value: number;
  variant?: TextVariant;
  tone?: ColorToken;
  prefix?: string;
  duration?: number;
  format?: (v: number) => string;
}) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (value - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <AppText variant={variant} tone={tone} numberOfLines={1} adjustsFontSizeToFit>
      {prefix}
      {format(Math.round(shown))}
    </AppText>
  );
}
