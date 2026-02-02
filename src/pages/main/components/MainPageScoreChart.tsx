import { useState, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Moon, Flame, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { ScoreBarChart, type ScoreBarChartItem } from '@/components/shared/ScoreBarChart';
import { useMainPage } from '../context/MainPageContext';
import { calculateHealthScore } from '../utils/healthScore';
import {
  calculateTrainingLoad,
  getTrainingLoadLevel,
} from '@/pages/activity/utils/activityHelpers';
import { calculateDailyBPAverage } from '@/pages/blood-pressure/utils/bpHelpers';
import { getStatus } from '@/pages/blood-tests/utils/statusHelpers';
import { getDailySleepScore } from '@/pages/sleep/utils/sleepHelpers';

const CHART_DAYS = 30;

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  icon?: ReactNode;
  iconColorClass?: string;
  accentColor?: 'bp' | 'sleep' | 'activity' | 'blood-tests';
  onClick?: () => void;
}

const accentGradients = {
  bp: 'bg-gradient-to-br from-bp/20 via-bp/5 to-transparent',
  sleep: 'bg-gradient-to-br from-sleep/20 via-sleep/5 to-transparent',
  activity: 'bg-gradient-to-br from-activity/20 via-activity/5 to-transparent',
  'blood-tests': 'bg-gradient-to-br from-blood-tests/20 via-blood-tests/5 to-transparent',
};

function MetricCard({
  label,
  value,
  unit,
  icon,
  iconColorClass,
  accentColor,
  onClick,
}: MetricCardProps) {
  const gradientClass = accentColor ? accentGradients[accentColor] : '';

  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-3 border border-white/10 text-left w-full hover:border-white/20 transition-colors active:scale-[0.98] ${gradientClass}`}
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

interface MainPageScoreChartProps {
  children?: ReactNode;
}

export function MainPageScoreChart({ children }: MainPageScoreChartProps) {
  const navigate = useNavigate();
  const { bpReadings, sleepEntries, activities, bloodTestReports } = useMainPage();
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

      // Pass all sleep entries for personalized scoring baseline
      const healthScore = calculateHealthScore(dayBpReadings, daySleepEntries, sleepEntries);
      return { date, score: healthScore.overall };
    });
  }, [allDatesInRange, bpByDate, sleepByDate, sleepEntries]);

  // Get selected date's data
  const selectedDate = chartItems[selectedIndex]?.date;

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;

    const dayBpReadings = bpByDate.get(selectedDate) || [];

    // Use shared helpers for consistent calculations across pages
    const bpAvg = calculateDailyBPAverage(dayBpReadings);
    const sleepScore = getDailySleepScore(selectedDate, sleepEntries)?.overall ?? null;

    // Calculate training load (continuous effort score with decay)
    const trainingLoad = calculateTrainingLoad(selectedDate, activities);
    const trainingLoadLevel = getTrainingLoadLevel(trainingLoad.score);

    return {
      bpAvg,
      sleepScore,
      trainingLoad,
      trainingLoadLevel,
    };
  }, [selectedDate, bpByDate, sleepEntries, activities]);

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
      <div className="pt-2 pb-4 -mx-5 sm:-mx-6">
        <ScoreBarChart
          items={chartItems}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
        />
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
            accentColor="bp"
            onClick={() => navigate('/blood-pressure')}
          />
          <MetricCard
            label="Sleep Score"
            value={selectedDayData.sleepScore}
            icon={<Moon size={18} />}
            iconColorClass="text-sleep"
            accentColor="sleep"
            onClick={() => navigate('/sleep')}
          />
          <button
            onClick={() => navigate('/activity')}
            className="rounded-xl p-3 border border-white/10 text-left w-full hover:border-white/20 transition-colors active:scale-[0.98] bg-gradient-to-br from-activity/20 via-activity/5 to-transparent"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl font-bold text-foreground">
                {selectedDayData.trainingLoad.score > 0 ? selectedDayData.trainingLoad.score : '—'}
              </span>
              <div className="text-activity">
                <Flame size={18} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Training Load
              </span>
              {selectedDayData.trainingLoad.score > 0 && (
                <span className={`text-xs font-medium ${selectedDayData.trainingLoadLevel.color}`}>
                  · {selectedDayData.trainingLoadLevel.label}
                </span>
              )}
            </div>
          </button>
          {bloodTestCounts ? (
            <button
              onClick={() => navigate('/blood-tests')}
              className="rounded-xl p-3 border border-white/10 text-left w-full hover:border-white/20 transition-colors active:scale-[0.98] bg-gradient-to-br from-blood-tests/20 via-blood-tests/5 to-transparent"
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
              accentColor="blood-tests"
              onClick={() => navigate('/blood-tests')}
            />
          )}
        </div>
      )}
    </div>
  );
}
