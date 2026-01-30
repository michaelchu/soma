import { useState, useMemo, type ReactNode } from 'react';
import { formatDate } from '@/lib/dateUtils';
import { ScoreBarChart, type ScoreBarChartItem } from '@/components/shared/ScoreBarChart';
import { useDashboard } from '../context/DashboardContext';
import { calculateHealthScore } from '../utils/healthScore';

const CHART_DAYS = 30;

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
}) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 border border-border">
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold text-foreground">{value ?? '—'}</span>
        {unit && value !== null && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

interface DashboardScoreChartProps {
  children?: ReactNode;
}

export function DashboardScoreChart({ children }: DashboardScoreChartProps) {
  const { bpReadings, sleepEntries } = useDashboard();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Generate all dates for the last 30 days
  const allDatesInRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - CHART_DAYS + 1);

    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

  // Group BP readings by date
  const bpByDate = useMemo(() => {
    const map = new Map<string, typeof bpReadings>();
    for (const reading of bpReadings) {
      const dateStr = new Date(reading.datetime).toISOString().split('T')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(reading);
    }
    return map;
  }, [bpReadings]);

  // Group sleep entries by date
  const sleepByDate = useMemo(() => {
    const map = new Map<string, (typeof sleepEntries)[0]>();
    for (const entry of sleepEntries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [sleepEntries]);

  // Build chart items with daily health scores
  const chartItems = useMemo((): ScoreBarChartItem[] => {
    return allDatesInRange.map((date) => {
      const dayBpReadings = bpByDate.get(date) || [];
      const daySleepEntry = sleepByDate.get(date);
      const daySleepEntries = daySleepEntry ? [daySleepEntry] : [];

      // Calculate health score for this day
      if (dayBpReadings.length === 0 && daySleepEntries.length === 0) {
        return { date, score: null };
      }

      const healthScore = calculateHealthScore(dayBpReadings, daySleepEntries);
      return { date, score: healthScore.overall };
    });
  }, [allDatesInRange, bpByDate, sleepByDate]);

  // Get selected date's data
  const selectedDate = chartItems[selectedIndex]?.date;

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;

    const dayBpReadings = bpByDate.get(selectedDate) || [];
    const daySleepEntry = sleepByDate.get(selectedDate);

    // Calculate BP average for the day
    let bpAvg: { systolic: number; diastolic: number } | null = null;
    if (dayBpReadings.length > 0) {
      const avgSystolic = Math.round(
        dayBpReadings.reduce((sum, r) => sum + r.systolic, 0) / dayBpReadings.length
      );
      const avgDiastolic = Math.round(
        dayBpReadings.reduce((sum, r) => sum + r.diastolic, 0) / dayBpReadings.length
      );
      bpAvg = { systolic: avgSystolic, diastolic: avgDiastolic };
    }

    // Get sleep data
    const sleepDuration = daySleepEntry?.durationMinutes ?? null;
    const restingHr = daySleepEntry?.restingHr ?? null;
    const hrvLow = daySleepEntry?.hrvLow ?? null;
    const hrvHigh = daySleepEntry?.hrvHigh ?? null;

    return {
      bpAvg,
      sleepDuration,
      restingHr,
      hrvLow,
      hrvHigh,
    };
  }, [selectedDate, bpByDate, sleepByDate]);

  // Format sleep duration
  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Format HRV range
  const formatHrv = (low: number | null, high: number | null) => {
    if (low === null && high === null) return null;
    if (low === null) return `${high}`;
    if (high === null) return `${low}`;
    return `${low}-${high}`;
  };

  const hasData = bpReadings.length > 0 || sleepEntries.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add BP readings or sleep entries to see your health score
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Selected Date Header */}
      {selectedDate && (
        <div className="text-center pt-4 pb-2">
          <p className="text-lg font-semibold text-foreground">
            {formatDate(selectedDate, { includeWeekday: true })}
          </p>
        </div>
      )}

      {/* Scrollable Bar Chart */}
      <div className="pt-2 pb-4">
        <div className="-mx-5 sm:-mx-6">
          <ScoreBarChart
            items={chartItems}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
        </div>
      </div>

      {/* Children (e.g., Insights) rendered between chart and metrics */}
      {children}

      {/* Selected Day Metrics */}
      {selectedDayData && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <MetricCard
            label="Blood Pressure"
            value={
              selectedDayData.bpAvg
                ? `${selectedDayData.bpAvg.systolic}/${selectedDayData.bpAvg.diastolic}`
                : null
            }
          />
          <MetricCard label="Sleep" value={formatDuration(selectedDayData.sleepDuration)} />
          <MetricCard label="Resting HR" value={selectedDayData.restingHr} unit="bpm" />
          <MetricCard
            label="HRV"
            value={formatHrv(selectedDayData.hrvLow, selectedDayData.hrvHigh)}
            unit="ms"
          />
        </div>
      )}
    </div>
  );
}
