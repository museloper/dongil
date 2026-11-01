import { useEffect, useRef, useState } from 'react';
import { formatWon } from '@/shared';
import type { ColorToken } from '@/theme/tokens';
import { AppText, type TextVariant } from './ui';

/** 값이 바뀔 때 숫자가 촤라락 올라가는 금액 텍스트 */
export function CountUp({
  value,
  variant = 'hero',
  tone = 'text',
  duration = 650,
}: {
  value: number;
  variant?: TextVariant;
  tone?: ColorToken;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    const started = performance.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - started) / duration);
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
    <AppText variant={variant} tone={tone} lines={1} className="tabular">
      {formatWon(Math.round(shown))}
    </AppText>
  );
}
