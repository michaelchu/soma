import { Minus } from 'lucide-react';

export type ChangeType = 'improving' | 'worsening' | 'neutral';

export interface ChangeConfig {
  type: 'higherIsBetter' | 'lowerIsBetter' | 'midpoint';
  /** For midpoint type: the optimal value */
  midpoint?: number;
  /** For midpoint type: values in this range are considered neutral */
  bufferMin?: number;
  bufferMax?: number;
  /** For lowerIsBetter: threshold below which both values are considered optimal (neutral) */
  optimalMax?: number;
}

/**
 * Determine the change type (improving/worsening/neutral) based on current and previous values
 */
export function getChangeType(
  current: number | null,
  previous: number | null,
  config: ChangeConfig
): ChangeType {
  if (current === null || previous === null) return 'neutral';

  const { type, optimalMax, midpoint, bufferMin, bufferMax } = config;

  if (type === 'lowerIsBetter') {
    // If both are below optimal threshold, show neutral
    if (optimalMax !== undefined && current <= optimalMax && previous <= optimalMax) {
      return 'neutral';
    }
    // Otherwise, lower is better
    if (current < previous) return 'improving';
    if (current > previous) return 'worsening';
    return 'neutral';
  }

  if (type === 'higherIsBetter') {
    const diff = current - previous;
    if (Math.abs(diff) < 1) return 'neutral'; // No significant change
    return diff > 0 ? 'improving' : 'worsening';
  }

  if (type === 'midpoint' && midpoint !== undefined) {
    // For midpoint metrics: compare distance from midpoint
    const currentInBuffer =
      bufferMin !== undefined &&
      bufferMax !== undefined &&
      current >= bufferMin &&
      current <= bufferMax;
    const previousInBuffer =
      bufferMin !== undefined &&
      bufferMax !== undefined &&
      previous >= bufferMin &&
      previous <= bufferMax;

    // If both are in the buffer zone, show neutral
    if (currentInBuffer && previousInBuffer) {
      return 'neutral';
    }

    // Compare distance from midpoint - closer is better
    const currentDist = Math.abs(current - midpoint);
    const previousDist = Math.abs(previous - midpoint);

    if (currentDist < previousDist) return 'improving';
    if (currentDist > previousDist) return 'worsening';
    return 'neutral';
  }

  return 'neutral';
}

/**
 * Truncate to 1 decimal place (floor for positive, ceil for negative)
 */
function truncateToOneDecimal(val: number): number {
  const factor = val >= 0 ? Math.floor : Math.ceil;
  return factor(val * 10) / 10;
}

interface ChangeIndicatorProps {
  current: number | null;
  previous: number | null;
  config: ChangeConfig;
  disabled?: boolean;
  /** Custom function to format the diff value for display */
  formatValue?: (val: number) => string;
  /** Show icon when diff is zero (default: false, shows dash) */
  showZeroIcon?: boolean;
  /** Use integer rounding instead of decimal truncation (default: false) */
  useIntegerRounding?: boolean;
}

export function ChangeIndicator({
  current,
  previous,
  config,
  disabled = false,
  formatValue,
  showZeroIcon = false,
  useIntegerRounding = false,
}: ChangeIndicatorProps) {
  if (disabled || current === null || previous === null) {
    return <span className="text-muted-foreground flex justify-center">—</span>;
  }

  const diff = current - previous;
  const truncatedDiff = useIntegerRounding ? Math.round(diff) : truncateToOneDecimal(diff);
  const pctChange = previous !== 0 ? truncateToOneDecimal((diff / previous) * 100) : 0;

  // Check if diff truncates to 0 for display purposes
  if (truncatedDiff === 0) {
    if (showZeroIcon) {
      return (
        <span className="flex items-center justify-center gap-1 text-muted-foreground">
          <Minus className="h-3 w-3" />
          <span>0</span>
        </span>
      );
    }
    return <span className="text-muted-foreground flex justify-center">—</span>;
  }

  const changeType = getChangeType(current, previous, config);

  const colorClass =
    changeType === 'improving'
      ? 'text-green-600 dark:text-green-400'
      : changeType === 'worsening'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  const sign = truncatedDiff > 0 ? '+' : '';
  const displayDiff = formatValue
    ? `${truncatedDiff < 0 ? '-' : truncatedDiff > 0 ? '+' : ''}${formatValue(Math.abs(truncatedDiff))}`
    : `${sign}${useIntegerRounding ? truncatedDiff : truncatedDiff.toFixed(1)}`;
  const pctSign = pctChange > 0 ? '+' : '';

  return (
    <span
      className={`inline-flex flex-wrap items-center justify-center gap-0.5 whitespace-nowrap ${colorClass}`}
    >
      <span className="font-medium">{displayDiff}</span>
      <span className="text-xs opacity-75">
        ({pctSign}
        {pctChange}%)
      </span>
    </span>
  );
}
