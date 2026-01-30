import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DateRangeTabs } from '@/components/shared/DateRangeTabs';
import { isInTimeOfDay, getDateRange } from '@/lib/dateUtils';

const TIME_OF_DAY = [
  { value: 'all', label: 'Any Time', shortLabel: 'Any Time' },
  { value: 'morning', label: 'Morning (6am-12pm)', shortLabel: 'Morning' },
  { value: 'afternoon', label: 'Afternoon (12pm-6pm)', shortLabel: 'Afternoon' },
  { value: 'evening', label: 'Evening (6pm-12am)', shortLabel: 'Evening' },
];

export function FilterBar({ dateRange, timeOfDay, onDateRangeChange, onTimeOfDayChange }) {
  const selectedTimeLabel =
    TIME_OF_DAY.find((t) => t.value === timeOfDay)?.shortLabel || 'Time of day';

  return (
    <div className="flex gap-2 md:justify-start">
      <DateRangeTabs value={dateRange} onChange={onDateRangeChange} />

      <Select value={timeOfDay} onValueChange={onTimeOfDayChange}>
        <SelectTrigger className="min-w-0 flex-1 h-8">
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

export function filterReadings(readings, dateRange, timeOfDay) {
  if (!readings) return [];

  let filtered = [...readings];

  // Filter by date range
  if (dateRange !== 'all') {
    const { start } = getDateRange(dateRange);
    filtered = filtered.filter((r) => new Date(r.datetime) >= start);
  }

  // Filter by time of day
  if (timeOfDay !== 'all') {
    filtered = filtered.filter((r) => isInTimeOfDay(r.datetime, timeOfDay));
  }

  return filtered;
}
