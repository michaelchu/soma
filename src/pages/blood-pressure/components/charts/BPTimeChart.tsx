import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatDate } from '@/lib/dateUtils';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';
import type { BPTimeOfDay } from '@/types/bloodPressure';

interface Reading {
  date: string;
  timeOfDay: BPTimeOfDay;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string | null;
}

interface ChartDataPoint {
  dateLabel: string;
  date: string;
  timeOfDay: BPTimeOfDay;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  pp: number;
  map: number;
  category: string | null;
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

type GetCategoryInfo = (category: string | null) => CategoryInfo;

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
  showMAP?: boolean;
}

export function BPTimeChart({
  readings,
  height = 280,
  showTrendline = true,
  showMarkers = true,
  showMAP = false,
}: BPTimeChartProps) {
  const { getCategory, getCategoryInfo } = useBloodPressureSettings();

  if (!readings || readings.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
        No readings to display
      </div>
    );
  }

  // Sort by date ascending for chart
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Transform data for chart
  const chartData: ChartDataPoint[] = sortedReadings.map((r) => {
    const dateLabel = formatDate(r.date);
    const category = getCategory(r.systolic, r.diastolic);
    const pp = r.systolic - r.diastolic;
    const map = r.diastolic + pp / 3;
    return {
      dateLabel,
      date: r.date,
      timeOfDay: r.timeOfDay,
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
        <ComposedChart data={chartDataWithTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid
            horizontal={true}
            vertical={false}
            stroke="hsl(var(--muted-foreground))"
            strokeOpacity={0.2}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
            tickLine={false}
            dy={5}
          />

          <YAxis
            yAxisId="bp"
            domain={[yMin, yMax]}
            ticks={Array.from({ length: (yMax - yMin) / 20 + 1 }, (_, i) => yMin + i * 20)}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            width={35}
            axisLine={false}
            tickLine={false}
          />

          <RechartsTooltip content={renderTooltip} />

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
    </div>
  );
}
