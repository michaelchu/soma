import { getCategoryInfo, getCategoryClasses } from '../../utils/bpHelpers';
import type { BPCategoryKey } from '@/types/bloodPressure';

type BadgeSize = 'sm' | 'default' | 'lg';

interface BPStatusBadgeProps {
  category: BPCategoryKey | null;
  showDescription?: boolean;
  size?: BadgeSize;
}

export function BPStatusBadge({
  category,
  showDescription = false,
  size = 'default',
}: BPStatusBadgeProps) {
  const info = getCategoryInfo(category);
  const classes = getCategoryClasses(category);

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center rounded-full border font-medium ${classes} ${sizeClasses[size]}`}
      >
        {info.shortLabel || info.label}
      </span>
      {showDescription && 'description' in info && (
        <span className="text-xs text-muted-foreground">
          {(info as { description?: string }).description}
        </span>
      )}
    </div>
  );
}
