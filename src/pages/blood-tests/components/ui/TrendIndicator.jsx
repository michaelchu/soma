import { TrendingUp, TrendingDown } from 'lucide-react';

export function TrendIndicator({ data }) {
  if (data.length < 2) return null;

  const recent = data[data.length - 1].value;
  const previous = data[data.length - 2].value;
  const change = (((recent - previous) / previous) * 100).toFixed(1);

  if (Math.abs(change) < 1) {
    return <span className="text-xs text-muted-foreground">→ stable</span>;
  }

  return (
    <span
      className={`text-xs flex items-center gap-0.5 ${change > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}
    >
      {change > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(change)}%
    </span>
  );
}
