import { getPositionInRange, getStatus, getOptimalZoneStyle } from '../../utils/statusHelpers';

// Gradient classes based on which bounds exist
const GRADIENT_CLASSES = {
  upperOnly:
    'bg-gradient-to-r from-green-200 via-green-200 to-amber-200 dark:from-green-900/50 dark:via-green-900/50 dark:to-amber-900/50',
  lowerOnly:
    'bg-gradient-to-r from-amber-200 via-green-200 to-green-200 dark:from-amber-900/50 dark:via-green-900/50 dark:to-green-900/50',
  both: 'bg-gradient-to-r from-amber-200 via-green-200 to-amber-200 dark:from-amber-900/50 dark:via-green-900/50 dark:to-amber-900/50',
};

function getGradientClass(min: number | null, max: number | null): string {
  if (min === null && max !== null) return GRADIENT_CLASSES.upperOnly;
  if (max === null && min !== null) return GRADIENT_CLASSES.lowerOnly;
  return GRADIENT_CLASSES.both;
}

interface RangeBarProps {
  value: number;
  min: number | null;
  max: number | null;
  optimalMin?: number | null;
  optimalMax?: number | null;
}

export function RangeBar({ value, min, max, optimalMin, optimalMax }: RangeBarProps) {
  const position = getPositionInRange(value, min, max);
  const status = getStatus(value, min, max);
  const optimalStyle = getOptimalZoneStyle(optimalMin ?? null, optimalMax ?? null, min, max);

  return (
    <div className="mt-2">
      <div className="relative h-2">
        {/* Bar background with gradient */}
        <div
          className={`absolute inset-0 rounded-full overflow-hidden ${getGradientClass(min, max)}`}
        >
          {/* Optimal zone highlight */}
          {optimalStyle && (
            <div
              className="absolute h-full bg-green-400/40 dark:bg-green-500/30"
              style={optimalStyle}
            />
          )}
        </div>
        {/* Current value marker - outside overflow-hidden container */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-800 shadow-md ${
            status === 'normal' ? 'bg-green-500' : status === 'high' ? 'bg-red-500' : 'bg-amber-500'
          }`}
          style={{ left: `clamp(0px, calc(${position}% - 8px), calc(100% - 16px))` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{min !== null ? min : '—'}</span>
        <span>{max !== null ? max : '—'}</span>
      </div>
    </div>
  );
}
