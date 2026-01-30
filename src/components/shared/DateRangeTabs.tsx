const DATE_RANGES = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'All' },
];

interface DateRangeTabsProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateRangeTabs({ value, onChange }: DateRangeTabsProps) {
  return (
    <div className="flex gap-1 rounded-md p-0.5 h-8 items-center border border-white/10">
      {DATE_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
            value === range.value
              ? 'bg-white/20 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
