import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { formatDuration } from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface ChartsTabProps {
  entries: SleepEntry[];
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  durationHours: number;
  hrvLow: number | null;
  hrvHigh: number | null;
  restingHr: number | null;
  hrDropMinutes: number | null;
  deepSleepPct: number | null;
  remSleepPct: number | null;
  lightSleepPct: number | null;
  awakePct: number | null;
  restorativePct: number | null;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{data.dateLabel}</p>
      <div className="space-y-1">
        <p>
          <span className="text-violet-500">Duration:</span>{' '}
          <span className="font-medium">{formatDuration(Math.round(data.durationHours * 60))}</span>
        </p>
        {data.hrvLow !== null && data.hrvHigh !== null && (
          <p>
            <span className="text-green-500">HRV:</span>{' '}
            <span className="font-medium">
              {data.hrvLow}-{data.hrvHigh} ms
            </span>
          </p>
        )}
        {data.restingHr !== null && (
          <p>
            <span className="text-red-500">Resting HR:</span>{' '}
            <span className="font-medium">{data.restingHr} bpm</span>
          </p>
        )}
        {data.deepSleepPct !== null && (
          <p>
            <span className="text-indigo-500">Deep:</span>{' '}
            <span className="font-medium">{data.deepSleepPct}%</span>
          </p>
        )}
        {data.remSleepPct !== null && (
          <p>
            <span className="text-teal-500">REM:</span>{' '}
            <span className="font-medium">{data.remSleepPct}%</span>
          </p>
        )}
        {data.lightSleepPct !== null && (
          <p>
            <span className="text-slate-400">Light:</span>{' '}
            <span className="font-medium">{data.lightSleepPct}%</span>
          </p>
        )}
        {data.awakePct !== null && (
          <p>
            <span className="text-amber-500">Awake:</span>{' '}
            <span className="font-medium">{data.awakePct}%</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function ChartsTab({ entries }: ChartsTabProps) {
  const chartData = useMemo(() => {
    // Sort by date ascending for charts
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sorted.map(
      (entry): ChartDataPoint => ({
        date: entry.date,
        dateLabel: formatDate(entry.date, { includeWeekday: true }),
        durationHours: entry.durationMinutes / 60,
        hrvLow: entry.hrvLow,
        hrvHigh: entry.hrvHigh,
        restingHr: entry.restingHr,
        hrDropMinutes: entry.hrDropMinutes,
        deepSleepPct: entry.deepSleepPct,
        remSleepPct: entry.remSleepPct,
        lightSleepPct: entry.lightSleepPct,
        awakePct: entry.awakePct,
        restorativePct:
          entry.deepSleepPct !== null || entry.remSleepPct !== null
            ? (entry.deepSleepPct || 0) + (entry.remSleepPct || 0)
            : null,
      })
    );
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No data for charts</p>
      </div>
    );
  }

  const hasHrvData = chartData.some((d) => d.hrvLow !== null || d.hrvHigh !== null);
  const hasHrData = chartData.some((d) => d.restingHr !== null);
  const hasSleepStageData = chartData.some(
    (d) =>
      d.deepSleepPct !== null ||
      d.remSleepPct !== null ||
      d.lightSleepPct !== null ||
      d.awakePct !== null
  );

  return (
    <div className="space-y-6">
      {/* Duration & HRV Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sleep Duration & HRV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDate(d)}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="duration"
                  domain={[0, 12]}
                  tickFormatter={(v) => `${v}h`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                {hasHrvData && (
                  <YAxis
                    yAxisId="hrv"
                    orientation="right"
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `${v}`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                )}
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />

                {/* HRV Range Area */}
                {hasHrvData && (
                  <Area
                    yAxisId="hrv"
                    type="monotone"
                    dataKey="hrvHigh"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.2}
                    strokeWidth={0}
                    name="HRV High"
                    connectNulls
                  />
                )}
                {hasHrvData && (
                  <Line
                    yAxisId="hrv"
                    type="monotone"
                    dataKey="hrvLow"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="HRV Low"
                    connectNulls
                  />
                )}

                {/* Duration Bar */}
                <Bar
                  yAxisId="duration"
                  dataKey="durationHours"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  name="Sleep (hrs)"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Heart Rate Chart */}
      {hasHrData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resting Heart Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => formatDate(d)}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `${v}`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <RechartsTooltip content={<CustomTooltip />} />

                  <Line
                    type="monotone"
                    dataKey="restingHr"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#ef4444' }}
                    name="Resting HR"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleep Stages Chart */}
      {hasSleepStageData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sleep Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => formatDate(d)}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />

                  <Bar dataKey="deepSleepPct" stackId="stages" fill="#6366f1" name="Deep" />
                  <Bar dataKey="remSleepPct" stackId="stages" fill="#14b8a6" name="REM" />
                  <Bar dataKey="lightSleepPct" stackId="stages" fill="#94a3b8" name="Light" />
                  <Bar dataKey="awakePct" stackId="stages" fill="#f59e0b" name="Awake" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
