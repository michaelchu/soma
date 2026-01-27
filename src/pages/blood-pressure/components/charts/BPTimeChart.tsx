import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatDateTime } from '../../utils/bpHelpers';
import { useBPSettings } from '../../hooks/useBPSettings';
import { getDateRange } from '@/lib/dateUtils';

interface Reading {
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string | null;
}

interface ChartDataPoint {
  date: string;
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  pp: number;
  map: number;
  category: string;
  notes?: string | null;
  sysTrend?: number | null;
  diaTrend?: number | null;
}

interface LinearRegressionResult {
  slope: number;
  intercept: number;
  getY: (x: number) => number;
}

interface CategoryInfo {
  label: string;
  textClass: string;
  chartColor: string;
}

type GetCategoryInfo = (category: string) => CategoryInfo;

// Calculate linear regression for a series of values
function linearRegression(values: number[]): LinearRegressionResult | null {
  const n = values.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    getY: (x: number) => slope * x + intercept,
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  label?: string;
  getCategoryInfo: GetCategoryInfo;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label, getCategoryInfo }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const info = getCategoryInfo(data.category);

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <div className="space-y-1">
        <p>
          <span className="text-rose-500">Systolic:</span>{' '}
          <span className="font-medium">{data.systolic} mmHg</span>
        </p>
        <p>
          <span className="text-blue-500">Diastolic:</span>{' '}
          <span className="font-medium">{data.diastolic} mmHg</span>
        </p>
        <p>
          <span className="text-rose-400/70">PP:</span>{' '}
          <span className="font-medium">{data.pp} mmHg</span>
        </p>
        <p>
          <span className="text-slate-400">MAP:</span>{' '}
          <span className="font-medium">{data.map} mmHg</span>
        </p>
        {data.pulse && (
          <p>
            <span className="text-purple-500">Pulse:</span>{' '}
            <span className="font-medium">{data.pulse} bpm</span>
          </p>
        )}
        <p className={`${info.textClass} font-medium`}>{info.label}</p>
      </div>
    </div>
  );
}

interface DotRendererProps {
  cx?: number;
  cy?: number;
  payload: ChartDataPoint;
  getCategoryInfo: GetCategoryInfo;
}

// Custom dot renderer component
function DotRenderer({ cx, cy, payload, getCategoryInfo }: DotRendererProps) {
  if (!cx || !cy) return null;

  const info = getCategoryInfo(payload.category);
  const color = info.chartColor;

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
      {payload.category !== 'normal' && payload.category !== 'optimal' && (
        <circle cx={cx} cy={cy} r={9} fill="none" stroke={color} strokeWidth={2} opacity={0.3} />
      )}
    </g>
  );
}

interface BPTimeChartProps {
  readings: Reading[];
  height?: number;
  showTrendline?: boolean;
  showMarkers?: boolean;
  showPP?: boolean;
  showMAP?: boolean;
  showPulse?: boolean;
  dateRange?: string;
}

export function BPTimeChart({
  readings,
  height = 280,
  showTrendline = true,
  showMarkers = true,
  showPP = true,
  showMAP = false,
  showPulse = true,
  dateRange = 'all',
}: BPTimeChartProps) {
  const { getCategory, getCategoryInfo } = useBPSettings();

  // Format date range label using theoretical filter range
  const dateRangeLabel = useMemo(() => {
    if (dateRange === 'all') return 'All Time';

    const { start, end } = getDateRange(dateRange);
    if (!start) return 'All Time';

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `${formatDate(start)} - ${formatDate(end)}`;
  }, [dateRange]);

  if (!readings || readings.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
        No readings to display
      </div>
    );
  }

  // Sort by datetime ascending for chart
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  // Transform data for chart
  const chartData: ChartDataPoint[] = sortedReadings.map((r) => {
    const { date } = formatDateTime(r.datetime, { hideWeekday: true });
    const category = getCategory(r.systolic, r.diastolic);
    const pp = r.systolic - r.diastolic;
    const map = r.diastolic + pp / 3;
    return {
      date,
      datetime: r.datetime,
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      pp,
      map: Math.round(map),
      category,
      notes: r.notes,
    };
  });

  // Calculate Y-axis domain rounded to increments of 20
  const allSystolic = chartData.map((d) => d.systolic);
  const allDiastolic = chartData.map((d) => d.diastolic);
  const minValue = Math.min(...allDiastolic);
  const maxValue = Math.max(...allSystolic);
  const yMin = Math.floor(minValue / 20) * 20;
  const yMax = Math.ceil(maxValue / 20) * 20;

  // Calculate pulse Y-axis domain (right axis) rounded to increments of 10
  const allPulse = chartData.filter((d) => d.pulse != null).map((d) => d.pulse as number);
  const hasPulseData = allPulse.length > 0;
  const pulseMin = hasPulseData ? Math.floor(Math.min(...allPulse) / 10) * 10 : 40;
  const pulseMax = hasPulseData ? Math.ceil(Math.max(...allPulse) / 10) * 10 : 120;

  // Calculate linear regression trendlines
  const sysRegression = linearRegression(allSystolic);
  const diaRegression = linearRegression(allDiastolic);

  // Add trendline values to chart data
  const chartDataWithTrend = chartData.map((d, i) => ({
    ...d,
    sysTrend: sysRegression ? sysRegression.getY(i) : null,
    diaTrend: diaRegression ? diaRegression.getY(i) : null,
  }));

  if (chartData.length === 1) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
        Single reading — add more to see trends
      </div>
    );
  }

  // Create bound versions of the components with getCategoryInfo

  const renderDot = (props: any) => <DotRenderer {...props} getCategoryInfo={getCategoryInfo} />;

  const renderTooltip = (props: any) => (
    <CustomTooltip {...props} getCategoryInfo={getCategoryInfo} />
  );

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartDataWithTrend}
          margin={{ top: 10, right: showPulse && hasPulseData ? 60 : 30, bottom: 5, left: 10 }}
        >
          <CartesianGrid horizontal={true} vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
          />

          <YAxis
            yAxisId="bp"
            domain={[yMin, yMax]}
            ticks={Array.from({ length: (yMax - yMin) / 20 + 1 }, (_, i) => yMin + i * 20)}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            width={55}
            axisLine={false}
            label={{
              value: 'mmHg',
              angle: -90,
              position: 'insideLeft',
              fontSize: 12,
              fill: 'hsl(var(--muted-foreground))',
            }}
          />

          {/* Pulse Y-axis (right side) */}
          {showPulse && hasPulseData && (
            <YAxis
              yAxisId="pulse"
              orientation="right"
              domain={[pulseMin, pulseMax]}
              ticks={Array.from(
                { length: (pulseMax - pulseMin) / 10 + 1 },
                (_, i) => pulseMin + i * 10
              )}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--muted-foreground))"
              width={45}
              axisLine={false}
              label={{
                value: 'bpm',
                angle: 90,
                position: 'insideRight',
                fontSize: 12,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
          )}

          <RechartsTooltip content={renderTooltip} />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />

          {/* PP shaded area between systolic and diastolic */}
          {showPP && (
            <>
              {/* Systolic area fills down with PP color */}
              <Area
                type="monotone"
                dataKey="systolic"
                yAxisId="bp"
                stroke="none"
                fill="#f43f5e"
                fillOpacity={0.15}
                baseValue={yMin}
                legendType="none"
                isAnimationActive={false}
              />
              {/* Diastolic area masks below with background color */}
              <Area
                type="monotone"
                dataKey="diastolic"
                yAxisId="bp"
                stroke="none"
                fill="hsl(var(--background))"
                fillOpacity={1}
                baseValue={yMin}
                legendType="none"
                isAnimationActive={false}
              />
            </>
          )}

          {/* Systolic line */}
          <Line
            type="monotone"
            dataKey="systolic"
            name="Systolic"
            yAxisId="bp"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={showMarkers ? renderDot : false}
            activeDot={
              showMarkers ? { r: 7, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' } : false
            }
          />

          {/* Diastolic line */}
          <Line
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            yAxisId="bp"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={showMarkers ? renderDot : false}
            activeDot={
              showMarkers ? { r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' } : false
            }
          />

          {/* MAP line (Mean Arterial Pressure) */}
          {showMAP && (
            <Line
              type="monotone"
              dataKey="map"
              name="MAP"
              yAxisId="bp"
              stroke="#94a3b8"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, stroke: '#94a3b8', strokeWidth: 1, fill: '#fff' }}
            />
          )}

          {/* Pulse line (right Y-axis) */}
          {showPulse && hasPulseData && (
            <Line
              type="monotone"
              dataKey="pulse"
              name="Pulse"
              yAxisId="pulse"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, stroke: '#a855f7', strokeWidth: 1, fill: '#fff' }}
            />
          )}

          {/* Systolic trendline (linear regression) */}
          {showTrendline && sysRegression && (
            <Line
              type="linear"
              dataKey="sysTrend"
              name="Sys Trend"
              yAxisId="bp"
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              legendType="none"
            />
          )}

          {/* Diastolic trendline (linear regression) */}
          {showTrendline && diaRegression && (
            <Line
              type="linear"
              dataKey="diaTrend"
              name="Dia Trend"
              yAxisId="bp"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              legendType="none"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 text-xs text-muted-foreground text-center">
        {chartData.length} reading{chartData.length !== 1 ? 's' : ''} ({dateRangeLabel})
      </div>
    </div>
  );
}
