import { TrendingUp, TrendingDown } from 'lucide-react';

export function TrendIndicator({ data, min, max }) {
  if (data.length < 2) return null;

  const recent = data[data.length - 1].value;
  const previous = data[data.length - 2].value;
  const change = (((recent - previous) / previous) * 100).toFixed(1);

  if (Math.abs(change) < 1) {
    return <span className="text-xs text-muted-foreground">→ stable</span>;
  }

  const isIncrease = change > 0;

  // Determine trend quality based on bounds
  let trendClass = 'text-muted-foreground'; // neutral default

  if (min !== null && max === null) {
    // Only lower bound (e.g., HDL, eGFR) - higher is better
    trendClass = isIncrease
      ? 'text-green-600 dark:text-green-400'
      : 'text-amber-600 dark:text-amber-400';
  } else if (min === null && max !== null) {
    // Only upper bound (e.g., LDL, cholesterol) - lower is better
    trendClass = isIncrease
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-green-600 dark:text-green-400';
  } else if (min !== null && max !== null) {
    // Both bounds - only flag if trending out of range
    if (isIncrease && recent > max) {
      trendClass = 'text-amber-600 dark:text-amber-400';
    } else if (!isIncrease && recent < min) {
      trendClass = 'text-amber-600 dark:text-amber-400';
    }
    // Otherwise stays neutral
  }

  return (
    <span className={`text-xs flex items-center gap-0.5 ${trendClass}`}>
      {isIncrease ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(change)}%
    </span>
  );
}
