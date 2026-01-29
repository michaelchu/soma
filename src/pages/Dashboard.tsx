import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { DashboardProvider, useDashboard } from './dashboard/context/DashboardContext';
import { getHealthScoreColor, getHealthScoreLabel } from './dashboard/utils/healthScore';
import { formatDate, formatTimeString } from '@/lib/dateUtils';
import { ExportModal } from './dashboard/components/ExportModal';
import {
  getActivityTypeLabel,
  formatDuration as formatActivityDuration,
} from './activity/utils/activityHelpers';
import type { Activity as ActivityType } from '@/types/activity';

// Period selector component
function PeriodSelector() {
  const { periodDays, setPeriodDays } = useDashboard();

  const periods = [
    { days: 7, label: '7d' },
    { days: 30, label: '30d' },
    { days: 90, label: '90d' },
    { days: 0, label: 'All' },
  ];

  return (
    <div className="flex gap-1 bg-muted rounded-md p-0.5 h-8 items-center">
      {periods.map((p) => (
        <button
          key={p.days}
          onClick={() => setPeriodDays(p.days)}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            periodDays === p.days
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// Health score gauge
function HealthScoreGauge() {
  const { healthScore } = useDashboard();

  if (!healthScore) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add BP readings or sleep entries to see your health score
        </p>
      </div>
    );
  }

  const { overall, primaryDriver, actionItem } = healthScore;
  const colorClass = getHealthScoreColor(overall);
  const label = getHealthScoreLabel(overall);

  return (
    <div className="text-center">
      {/* Score */}
      <div className="mb-2 pt-4">
        <span className={`text-6xl font-bold ${colorClass}`}>{overall}</span>
      </div>
      <p className={`text-lg font-medium ${colorClass}`}>{label}</p>
      <p className="text-sm text-muted-foreground mt-1">{primaryDriver}</p>

      {/* Action item */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-foreground">{actionItem}</p>
      </div>
    </div>
  );
}

// Key metrics row
function KeyMetrics() {
  const { healthScore, bpReadings, sleepEntries } = useDashboard();

  // Calculate trends
  const getBpTrend = () => {
    if (bpReadings.length < 4) return null;
    const mid = Math.floor(bpReadings.length / 2);
    const older = bpReadings.slice(mid);
    const recent = bpReadings.slice(0, mid);

    const olderAvg = older.reduce((sum, r) => sum + r.systolic, 0) / older.length;
    const recentAvg = recent.reduce((sum, r) => sum + r.systolic, 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff < 0 };
  };

  const getSleepTrend = () => {
    if (sleepEntries.length < 4) return null;
    const sorted = [...sleepEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    const olderAvg = older.reduce((sum, e) => sum + e.durationMinutes, 0) / older.length;
    const recentAvg = recent.reduce((sum, e) => sum + e.durationMinutes, 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff > 0 };
  };

  const getRhrTrend = () => {
    const withRhr = sleepEntries.filter((e) => e.restingHr);
    if (withRhr.length < 4) return null;
    const sorted = [...withRhr].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    const olderAvg = older.reduce((sum, e) => sum + (e.restingHr || 0), 0) / older.length;
    const recentAvg = recent.reduce((sum, e) => sum + (e.restingHr || 0), 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff < 0 }; // Lower RHR is better
  };

  const getHrvTrend = () => {
    const withHrv = sleepEntries.filter((e) => e.hrvHigh);
    if (withHrv.length < 4) return null;
    const sorted = [...withHrv].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    // Use hrvHigh for trend comparison
    const olderAvg = older.reduce((sum, e) => sum + (e.hrvHigh || 0), 0) / older.length;
    const recentAvg = recent.reduce((sum, e) => sum + (e.hrvHigh || 0), 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff > 0 }; // Higher HRV is better
  };

  const bpTrend = getBpTrend();
  const sleepTrend = getSleepTrend();
  const rhrTrend = getRhrTrend();
  const hrvTrend = getHrvTrend();

  // Format sleep duration
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const metrics = [
    {
      label: 'BP',
      value: healthScore?.bpScore
        ? `${healthScore.bpScore.avgSystolic}/${healthScore.bpScore.avgDiastolic}`
        : '—',
      trend: bpTrend,
    },
    {
      label: 'Sleep',
      value: healthScore?.sleepScore
        ? formatDuration(healthScore.sleepScore.avgDurationMinutes)
        : '—',
      trend: sleepTrend,
    },
    {
      label: 'RHR',
      value:
        sleepEntries.filter((e) => e.restingHr).length > 0
          ? `${Math.round(
              sleepEntries
                .filter((e) => e.restingHr)
                .reduce((sum, e) => sum + (e.restingHr || 0), 0) /
                sleepEntries.filter((e) => e.restingHr).length
            )}`
          : '—',
      unit: 'bpm',
      trend: rhrTrend,
    },
    {
      label: 'HRV',
      value:
        sleepEntries.filter((e) => e.hrvHigh).length > 0
          ? `${Math.round(
              sleepEntries.filter((e) => e.hrvLow).reduce((sum, e) => sum + (e.hrvLow || 0), 0) /
                sleepEntries.filter((e) => e.hrvLow).length
            )}-${Math.round(
              sleepEntries.filter((e) => e.hrvHigh).reduce((sum, e) => sum + (e.hrvHigh || 0), 0) /
                sleepEntries.filter((e) => e.hrvHigh).length
            )}`
          : '—',
      unit: 'ms',
      trend: hrvTrend,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
          <p className="text-lg font-semibold whitespace-nowrap">
            {metric.value}
            {metric.unit && (
              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                {metric.unit}
              </span>
            )}
          </p>
          {metric.trend && (
            <div
              className={`flex items-center justify-center gap-0.5 text-xs ${
                metric.trend.improving
                  ? 'text-green-600 dark:text-green-400'
                  : metric.trend.diff !== 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground'
              }`}
            >
              {metric.trend.diff > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : metric.trend.diff < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{Math.abs(metric.trend.diff)}%</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// AI Insights section
function Insights() {
  const { healthScore, bpReadings, sleepEntries } = useDashboard();

  if (!healthScore) return null;

  const insights: string[] = [];

  // BP insights
  if (healthScore.bpScore) {
    const { bpScore } = healthScore;
    if (bpScore.variabilityPenalty > 10) {
      insights.push('Your BP readings show high variability. Try measuring at consistent times.');
    }
    if (bpScore.trendModifier > 0) {
      insights.push(
        `BP is trending down by ${Math.abs(bpScore.trendModifier)} points - good progress!`
      );
    } else if (bpScore.trendModifier < 0) {
      insights.push(
        'BP has been trending up recently. Monitor and consider lifestyle adjustments.'
      );
    }
    if (bpScore.category === 'Optimal') {
      insights.push('Blood pressure is in the optimal range. Keep up the good work!');
    }
  }

  // Sleep insights
  if (healthScore.sleepScore) {
    const { sleepScore } = healthScore;
    if (sleepScore.durationScore < 60) {
      const avgHours = (sleepScore.avgDurationMinutes / 60).toFixed(1);
      insights.push(`Averaging ${avgHours}h of sleep. Aim for 7-9 hours for better recovery.`);
    }
    if (sleepScore.avgRestorative !== null && sleepScore.avgRestorative < 35) {
      insights.push(
        `Restorative sleep (${sleepScore.avgRestorative}%) is below optimal. Consider limiting caffeine and screens before bed.`
      );
    }
    if (sleepScore.consistencyBonus < 0) {
      insights.push(
        'Sleep duration varies significantly. A consistent schedule improves sleep quality.'
      );
    }
  }

  // Cross-metric insights
  if (bpReadings.length > 0 && sleepEntries.length > 0) {
    // Find days with poor sleep followed by high BP
    const poorSleepDates = sleepEntries
      .filter((e) => e.durationMinutes < 360) // < 6 hours
      .map((e) => e.date);

    if (poorSleepDates.length > 0) {
      const nextDayHighBp = bpReadings.filter((r) => {
        const bpDate = new Date(r.datetime).toISOString().slice(0, 10);
        return poorSleepDates.some((sleepDate) => {
          const nextDay = new Date(sleepDate);
          nextDay.setDate(nextDay.getDate() + 1);
          return nextDay.toISOString().slice(0, 10) === bpDate;
        });
      });

      if (nextDayHighBp.length > 0) {
        const avgSys = nextDayHighBp.reduce((sum, r) => sum + r.systolic, 0) / nextDayHighBp.length;
        if (avgSys > 130) {
          insights.push('BP tends to be higher after nights with less than 6 hours of sleep.');
        }
      }
    }
  }

  // Limit to top 3 most relevant insights
  const displayInsights = insights.slice(0, 3);

  if (displayInsights.length === 0) {
    displayInsights.push('Keep tracking to get personalized insights about your health patterns.');
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Insights
      </h2>
      <ul className="space-y-2">
        {displayInsights.map((insight, i) => (
          <li key={i} className="text-sm text-foreground flex gap-2">
            <span className="text-muted-foreground">•</span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Timeline component
function Timeline() {
  const { timeline } = useDashboard();
  const navigate = useNavigate();

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recent activity</p>
      </div>
    );
  }

  // Group by date
  const grouped: { [date: string]: typeof timeline } = {};
  timeline.forEach((entry) => {
    const dateKey = entry.date.toDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(entry);
  });

  const formatRelativeDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return formatDate(date.toISOString().slice(0, 10), { includeWeekday: true });
  };

  const handleEntryClick = (entry: (typeof timeline)[0]) => {
    if (entry.type === 'bp') {
      navigate('/blood-pressure');
    } else if (entry.type === 'sleep') {
      navigate('/sleep');
    } else if (entry.type === 'activity') {
      navigate('/activity');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recent Activity
      </h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {Object.entries(grouped).map(([dateKey, entries]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-[15px] h-[15px] rounded-full bg-foreground border-2 border-background relative z-0" />
                <span className="text-sm font-medium text-foreground">
                  {formatRelativeDate(new Date(dateKey))}
                </span>
              </div>

              {/* Entries for this date */}
              <div className="ml-7 space-y-2">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleEntryClick(entry)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {entry.type === 'bp' ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">💓</span>
                          <span className="text-sm">
                            BP: {(entry.data as { systolic: number; diastolic: number }).systolic}/
                            {(entry.data as { systolic: number; diastolic: number }).diastolic}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            (entry.data as { datetime: string }).datetime
                          ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : entry.type === 'sleep' ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-violet-500">😴</span>
                          <span className="text-sm">
                            Sleep:{' '}
                            {Math.floor(
                              (entry.data as { durationMinutes: number }).durationMinutes / 60
                            )}
                            h {(entry.data as { durationMinutes: number }).durationMinutes % 60}m
                          </span>
                        </div>
                        {(entry.data as { sleepStart: string | null }).sleepStart && (
                          <span className="text-xs text-muted-foreground">
                            {formatTimeString((entry.data as { sleepStart: string }).sleepStart)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">🏃</span>
                          <span className="text-sm">
                            {getActivityTypeLabel((entry.data as ActivityType).activityType)}:{' '}
                            {formatActivityDuration((entry.data as ActivityType).durationMinutes)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(entry.data as ActivityType).timeOfDay.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main dashboard content
function DashboardContent() {
  const navigate = useNavigate();
  const { loading, error, bpReadings, sleepEntries, bloodTestReports, periodDays } = useDashboard();
  const [showExport, setShowExport] = useState(false);

  const hasData = bpReadings.length > 0 || sleepEntries.length > 0 || bloodTestReports.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-pulse text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-600 dark:text-red-400 mx-auto mb-4" size={32} />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
            Error loading dashboard
          </p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        leftContent={
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Home"
          >
            <Activity className="h-6 w-6 text-foreground" strokeWidth={2.5} />
            <span className="text-xl font-bold">Soma</span>
          </button>
        }
        rightContent={
          hasData && (
            <Button
              onClick={() => setShowExport(true)}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Export Data"
            >
              <Download className="h-5 w-5" />
            </Button>
          )
        }
      />

      {/* Sticky toolbar with period selector */}
      <div className="sticky top-[49px] z-10 bg-background border-b -mt-4 pt-2 pb-2">
        <div className="max-w-2xl mx-auto w-full px-5 sm:px-6 flex justify-center">
          <PeriodSelector />
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 space-y-8">
        {/* Health Score */}
        <section>
          <HealthScoreGauge />
        </section>

        {/* Key Metrics */}
        <section className="border-t border-b py-4">
          <KeyMetrics />
        </section>

        {/* Insights */}
        <section>
          <Insights />
        </section>

        {/* Timeline */}
        <section className="border-t pt-6">
          <Timeline />
        </section>
      </main>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          bpReadings={bpReadings}
          sleepEntries={sleepEntries}
          bloodTestReports={bloodTestReports}
          periodDays={periodDays}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
