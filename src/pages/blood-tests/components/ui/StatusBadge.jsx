import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }) {
  if (status === 'normal') {
    return (
      <Badge
        variant="outline"
        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
      >
        Normal
      </Badge>
    );
  }
  if (status === 'high') {
    return (
      <Badge
        variant="outline"
        className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 gap-1"
      >
        <TrendingUp size={12} /> High
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1"
    >
      <TrendingDown size={12} /> Low
    </Badge>
  );
}
