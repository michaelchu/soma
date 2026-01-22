import { getCategoryInfo, getCategoryClasses } from '../../utils/bpHelpers';

export function BPStatusBadge({ category, showDescription = false, size = 'default' }) {
  const info = getCategoryInfo(category);
  const classes = getCategoryClasses(category);

  const sizeClasses = {
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
      {showDescription && (
        <span className="text-xs text-muted-foreground">{info.description}</span>
      )}
    </div>
  );
}
