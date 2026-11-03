import { SWATCHES } from '@/theme/tokens';
import { Icon } from './icon';
import { Pressable } from './ui';

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="swatches">
      {SWATCHES.map((c) => (
        <Pressable
          key={c}
          onClick={() => onChange(c)}
          className="swatch"
          aria-label={c}
          aria-pressed={c === value}
          style={{ backgroundColor: c, borderColor: c === value ? 'var(--text)' : 'transparent' }}>
          {c === value && <Icon name="checkmark" size={16} color="#fff" />}
        </Pressable>
      ))}
    </div>
  );
}
