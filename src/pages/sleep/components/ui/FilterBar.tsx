import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { filterEntriesByDateRange } from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface FilterBarProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}

export function FilterBar({ dateRange, onDateRangeChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="14">Last 14 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function filterEntries(entries: SleepEntry[], dateRange: string): SleepEntry[] {
  const days = dateRange === 'all' ? 'all' : parseInt(dateRange);
  return filterEntriesByDateRange(entries, days);
}
