import { DateRangeTabs } from '@/components/shared/DateRangeTabs';
import { filterEntriesByDateRange } from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface FilterBarProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}

export function FilterBar({ dateRange, onDateRangeChange }: FilterBarProps) {
  return (
    <div className="flex flex-col xs:flex-row gap-2 xs:justify-center md:justify-start">
      <DateRangeTabs value={dateRange} onChange={onDateRangeChange} />
    </div>
  );
}

export function filterEntries(entries: SleepEntry[], dateRange: string): SleepEntry[] {
  const days = dateRange === 'all' ? 'all' : parseInt(dateRange);
  return filterEntriesByDateRange(entries, days);
}
