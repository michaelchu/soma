import { getPositionInRange, getStatus } from '../../utils/statusHelpers';

export function RangeBar({ value, min, max, optimalMin, optimalMax, unit: _unit }) {
  const position = getPositionInRange(value, min, max);
  const status = getStatus(value, min, max);

  // Determine bar gradient based on which bounds exist
  // Both bounds: low(amber) -> normal(green) -> high(amber)
  // Only max (lower is better): normal(green) -> high(amber)
  // Only min (higher is better): low(amber) -> normal(green)
  const getGradientClass = () => {
    if (min === null && max !== null) {
      // Only upper bound - green on left, amber on right
      return 'bg-gradient-to-r from-green-200 via-green-200 to-amber-200 dark:from-green-900/50 dark:via-green-900/50 dark:to-amber-900/50';
    }
    if (max === null && min !== null) {
      // Only lower bound - amber on left, green on right
      return 'bg-gradient-to-r from-amber-200 via-green-200 to-green-200 dark:from-amber-900/50 dark:via-green-900/50 dark:to-green-900/50';
    }
    // Both bounds or neither - standard tri-color
    return 'bg-gradient-to-r from-amber-200 via-green-200 to-amber-200 dark:from-amber-900/50 dark:via-green-900/50 dark:to-amber-900/50';
  };

  // Calculate optimal zone position
  const getOptimalStyle = () => {
    if (optimalMin === null || optimalMax === null) return null;

    if (min !== null && max !== null) {
      // Both bounds defined
      return {
        left: `${15 + ((optimalMin - min) / (max - min)) * 70}%`,
        width: `${((optimalMax - optimalMin) / (max - min)) * 70}%`,
      };
    }
    if (min === null && max !== null) {
      // Only upper bound - scale from 0 to max
      return {
        left: `${15 + (optimalMin / max) * 70}%`,
        width: `${((optimalMax - optimalMin) / max) * 70}%`,
      };
    }
    if (max === null && min !== null) {
      // Only lower bound - scale from min to 2*min (visual max)
      const visualMax = min * 2;
      return {
        left: `${15 + ((optimalMin - min) / (visualMax - min)) * 70}%`,
        width: `${((optimalMax - optimalMin) / (visualMax - min)) * 70}%`,
      };
    }
    return null;
  };

  const optimalStyle = getOptimalStyle();

  return (
    <div className="mt-2">
      <div className="relative h-2">
        {/* Bar background with gradient */}
        <div className={`absolute inset-0 rounded-full overflow-hidden ${getGradientClass()}`}>
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
          style={{ left: `calc(${position}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{min !== null ? min : '—'}</span>
        <span>{max !== null ? max : '—'}</span>
      </div>
    </div>
  );
}
