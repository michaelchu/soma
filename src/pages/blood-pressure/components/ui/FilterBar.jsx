import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isInTimeOfDay, getDateRange } from '@/lib/dateUtils';

const DATE_RANGES = [
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '180', label: 'Last 180 Days' },
  { value: '365', label: 'Last 365 Days' },
  { value: 'all', label: 'All Time' },
];

const TIME_OF_DAY = [
  { value: 'all', label: 'Any Time' },
  { value: 'am', label: 'AM (12am-12pm)' },
  { value: 'pm', label: 'PM (12pm-12am)' },
  { value: 'morning', label: 'Morning (6am-12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm-6pm)' },
  { value: 'evening', label: 'Evening (6pm-12am)' },
];

export function FilterBar({ dateRange, timeOfDay, onDateRangeChange, onTimeOfDayChange }) {
  return (
    <div className="flex flex-col xs:flex-row gap-2 xs:justify-center md:justify-start">
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-full xs:w-[140px] h-8">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={timeOfDay} onValueChange={onTimeOfDayChange}>
        <SelectTrigger className="w-full xs:w-[160px] h-8">
          <SelectValue placeholder="Time of day" />
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
