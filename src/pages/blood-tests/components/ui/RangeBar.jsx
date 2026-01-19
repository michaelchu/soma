import { getPositionInRange, getStatus } from '../../utils/statusHelpers';

export function RangeBar({ value, min, max, optimalMin, optimalMax, unit }) {
  const position = getPositionInRange(value, min, max);
  const status = getStatus(value, min, max);

  return (
    <div className="mt-2">
      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-amber-200 via-green-200 to-amber-200 dark:from-amber-900/50 dark:via-green-900/50 dark:to-amber-900/50">
        {/* Optimal zone highlight */}
        {optimalMin !== null && optimalMax !== null && min !== null && max !== null && (
          <div
            className="absolute h-full bg-green-400/40 dark:bg-green-500/30"
            style={{
              left: `${15 + ((optimalMin - min) / (max - min)) * 70}%`,
              width: `${((optimalMax - optimalMin) / (max - min)) * 70}%`,
            }}
          />
        )}
        {/* Current value marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-800 shadow-md ${
            status === 'normal' ? 'bg-green-500' : status === 'high' ? 'bg-red-500' : 'bg-amber-500'
          }`}
          style={{ left: `calc(${position}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{min !== null ? min : '—'}</span>
        <span className="text-foreground font-medium">
          {value} {unit}
        </span>
        <span>{max !== null ? max : '—'}</span>
      </div>
    </div>
  );
}
