import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DateRangeTabs } from '@/components/shared/DateRangeTabs';
import { isInTimeOfDay, getDateRange } from '@/lib/dateUtils';
import type { TimeOfDay, BPSession } from '@/types/bloodPressure';

const TIME_OF_DAY = [
  { value: 'all', label: 'Any Time', shortLabel: 'Any Time' },
  { value: 'morning', label: 'Morning (6am-12pm)', shortLabel: 'Morning' },
  { value: 'afternoon', label: 'Afternoon (12pm-6pm)', shortLabel: 'Afternoon' },
  { value: 'evening', label: 'Evening (6pm-12am)', shortLabel: 'Evening' },
];

interface FilterBarProps {
  dateRange: string;
  timeOfDay: TimeOfDay | 'all';
  onDateRangeChange: (value: string) => void;
  onTimeOfDayChange: (value: TimeOfDay | 'all') => void;
}

export function FilterBar({
  dateRange,
  timeOfDay,
  onDateRangeChange,
  onTimeOfDayChange,
}: FilterBarProps) {
  const selectedTimeLabel =
    TIME_OF_DAY.find((t) => t.value === timeOfDay)?.shortLabel || 'Time of day';

  return (
    <div className="flex gap-2 md:justify-start">
      <DateRangeTabs value={dateRange} onChange={onDateRangeChange} />

      <Select value={timeOfDay} onValueChange={onTimeOfDayChange}>
        <SelectTrigger className="min-w-0 flex-1 md:flex-none md:w-auto h-8 gap-2">
          <span>{selectedTimeLabel}</span>
        </SelectTrigger>
        <SelectContent>
          {TIME_OF_DAY.map((time) => (
            <SelectItem key={time.value} value={time.value}>
              {time.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function filterReadings(
  readings: BPSession[] | null | undefined,
  dateRange: string,
  timeOfDay: TimeOfDay | 'all'
): BPSession[] {
  if (!readings) return [];

  let filtered = [...readings];

  // Filter by date range
  if (dateRange !== 'all') {
    const { start } = getDateRange(dateRange);
    if (start) {
      filtered = filtered.filter((r) => new Date(r.datetime) >= start);
    }
  }

  // Filter by time of day
  if (timeOfDay !== 'all') {
    filtered = filtered.filter((r) => isInTimeOfDay(r.datetime, timeOfDay));
  }

  return filtered;
}
