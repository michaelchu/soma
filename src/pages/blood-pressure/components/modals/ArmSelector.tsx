import type { Arm } from '@/types/bloodPressure';

interface ArmSelectorProps {
  value: Arm;
  onChange: (arm: Arm) => void;
}

export function ArmSelector({ value, onChange }: ArmSelectorProps) {
  return (
    <div
      className="flex h-9 rounded-md border border-input overflow-hidden flex-shrink-0"
      role="group"
      aria-label="Arm selection"
    >
      <button
        type="button"
        onClick={() => onChange(value === 'L' ? null : 'L')}
        aria-label="Left arm"
        aria-pressed={value === 'L'}
        className={`px-2.5 text-sm font-medium transition-colors ${
          value === 'L'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        L
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'R' ? null : 'R')}
        aria-label="Right arm"
        aria-pressed={value === 'R'}
        className={`px-2.5 text-sm font-medium border-l border-input transition-colors ${
          value === 'R'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        R
      </button>
    </div>
  );
}
