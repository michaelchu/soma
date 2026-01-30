import { filterEntriesByDateRange } from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

const DATE_RANGES = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'All' },
];

interface FilterBarProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}

export function FilterBar({ dateRange, onDateRangeChange }: FilterBarProps) {
  return (
    <div className="flex flex-col xs:flex-row gap-2 xs:justify-center md:justify-start">
      <div className="flex gap-1 bg-black/20 backdrop-blur-sm rounded-md p-0.5 h-8 items-center border border-white/10">
        {DATE_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => onDateRangeChange(range.value)}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              dateRange === range.value
                ? 'bg-white/20 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function filterEntries(entries: SleepEntry[], dateRange: string): SleepEntry[] {
  const days = dateRange === 'all' ? 'all' : parseInt(dateRange);
  return filterEntriesByDateRange(entries, days);
}
