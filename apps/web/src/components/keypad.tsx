import { useEffect, useRef } from 'react';
import { Icon } from './icon';
import { AppText, Pressable } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'] as const;
const MAX = 1_000_000_000_000;

/** 금액 입력 전용 큰 숫자 키패드. 데스크톱에서는 키보드 숫자·Backspace 도 받는다 */
export function Keypad({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const press = (key: (typeof KEYS)[number]) => {
    const s = value ? String(value) : '';
    const next = key === 'back' ? s.slice(0, -1) : s + key;
    const n = Number(next || 0);
    if (n <= MAX) onChange(n);
  };
  const pressRef = useRef(press);
  useEffect(() => {
    pressRef.current = press;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (/^[0-9]$/.test(e.key)) pressRef.current(e.key as (typeof KEYS)[number]);
      else if (e.key === 'Backspace') pressRef.current('back');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="keypad">
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onClick={() => press(k)}
          onContextMenu={k === 'back' ? (e) => (e.preventDefault(), onChange(0)) : undefined}
          className="key"
          aria-label={k === 'back' ? '지우기' : k}>
          {k === 'back' ? <Icon name="backspace-outline" size={26} color="var(--text)" /> : <AppText variant="title">{k}</AppText>}
        </Pressable>
      ))}
    </div>
  );
}
