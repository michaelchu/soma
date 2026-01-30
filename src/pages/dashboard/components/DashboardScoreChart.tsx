import { useState, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Moon, Flame, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { ScoreBarChart, type ScoreBarChartItem } from '@/components/shared/ScoreBarChart';
import { useDashboard } from '../context/DashboardContext';
import { calculateHealthScore, calculateSleepHealthScore } from '../utils/healthScore';
import { calculateDailyActivityScore } from '@/pages/activity/utils/activityHelpers';
import { getStatus } from '@/pages/blood-tests/utils/statusHelpers';

const CHART_DAYS = 30;

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  icon?: ReactNode;
  iconColorClass?: string;
  onClick?: () => void;
}

function MetricCard({ label, value, unit, icon, iconColorClass, onClick }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-muted/50 rounded-xl p-3 border border-border text-left w-full hover:bg-muted/70 hover:border-primary/30 transition-colors active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold text-foreground">{value ?? '—'}</span>
          {unit && value !== null && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {icon && <div className={iconColorClass || 'text-muted-foreground'}>{icon}</div>}
      </div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    </button>
  );
}

interface DashboardScoreChartProps {
  children?: ReactNode;
}

export function DashboardScoreChart({ children }: DashboardScoreChartProps) {
  const navigate = useNavigate();
  const { bpReadings, sleepEntries, activities, bloodTestReports } = useDashboard();
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

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, typeof activities>();
    for (const activity of activities) {
      if (!map.has(activity.date)) {
        map.set(activity.date, []);
      }
      map.get(activity.date)!.push(activity);
    }
    return map;
  }, [activities]);

  // Get the most recent blood test report
  const latestBloodTestReport = useMemo(() => {
    if (!bloodTestReports || bloodTestReports.length === 0) return null;
    const sorted = [...bloodTestReports].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0];
  }, [bloodTestReports]);

  // Calculate blood test normal/abnormal counts from the latest report
  const bloodTestCounts = useMemo(() => {
    if (!latestBloodTestReport) return null;

    let normalCount = 0;
    let abnormalCount = 0;

    Object.entries(latestBloodTestReport.metrics).forEach(([, metric]) => {
      const status = getStatus(metric.value, metric.reference?.min, metric.reference?.max);
      if (status === 'normal') {
        normalCount++;
      } else {
        abnormalCount++;
      }
    });

    return { normalCount, abnormalCount };
  }, [latestBloodTestReport]);

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
    const dayActivities = activitiesByDate.get(selectedDate) || [];

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

    // Calculate sleep score for the day
    let sleepScore: number | null = null;
    if (daySleepEntry) {
      const sleepScoreResult = calculateSleepHealthScore([daySleepEntry]);
      sleepScore = sleepScoreResult?.score ?? null;
    }

    // Calculate activity score for the day
    let activityScore: number | null = null;
    if (dayActivities.length > 0) {
      activityScore = calculateDailyActivityScore(dayActivities, activities);
    }

    return {
      bpAvg,
      sleepScore,
      activityScore,
    };
  }, [selectedDate, bpByDate, sleepByDate, activitiesByDate, activities]);

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
            icon={<Activity size={18} />}
            iconColorClass="text-bp"
            onClick={() => navigate('/blood-pressure')}
          />
          <MetricCard
            label="Sleep Score"
            value={selectedDayData.sleepScore}
            icon={<Moon size={18} />}
            iconColorClass="text-sleep"
            onClick={() => navigate('/sleep')}
          />
          <MetricCard
            label="Activity Score"
            value={selectedDayData.activityScore}
            icon={<Flame size={18} />}
            iconColorClass="text-activity"
            onClick={() => navigate('/activity')}
          />
          {bloodTestCounts ? (
            <button
              onClick={() => navigate('/blood-tests')}
              className="bg-muted/50 rounded-xl p-3 border border-border text-left w-full hover:bg-muted/70 hover:border-primary/30 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 size={14} />
                    <span className="text-sm font-semibold">{bloodTestCounts.normalCount}</span>
                  </span>
                  {bloodTestCounts.abnormalCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <AlertTriangle size={14} />
                      <span className="text-sm font-semibold">{bloodTestCounts.abnormalCount}</span>
                    </span>
                  )}
                </div>
                <div className="text-blood-tests">
                  <FlaskConical size={18} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Blood Tests
              </span>
            </button>
          ) : (
            <MetricCard
              label="Blood Tests"
              value={null}
              icon={<FlaskConical size={18} />}
              iconColorClass="text-blood-tests"
              onClick={() => navigate('/blood-tests')}
            />
          )}
        </div>
      )}
    </div>
  );
}
