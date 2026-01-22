import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts';
import { getBPCategory, getCategoryInfo, formatDateTime } from '../../utils/bpHelpers';
import { BP_CATEGORIES } from '../../constants/bpCategories';

// Custom tooltip component - defined outside to avoid recreation during render
function CustomTooltip({ active, payload, label }) {
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
        {data.pulse && (
          <p>
            <span className="text-muted-foreground">Pulse:</span>{' '}
            <span className="font-medium">{data.pulse} bpm</span>
          </p>
        )}
        <p className={`${info.textClass} font-medium`}>{info.label}</p>
      </div>
    </div>
  );
}

// Custom dot renderer component
function DotRenderer(props) {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;

  const info = getCategoryInfo(payload.category);
  const color = info.chartColor;

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
      {payload.category !== 'normal' && (
        <circle cx={cx} cy={cy} r={9} fill="none" stroke={color} strokeWidth={2} opacity={0.3} />
      )}
    </g>
  );
}

export function BPTimeChart({ readings, height = 280 }) {
  if (!readings || readings.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
        No readings to display
      </div>
    );
  }

  // Sort by datetime ascending for chart
  const sortedReadings = [...readings].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  // Transform data for chart
  const chartData = sortedReadings.map((r) => {
    const { date } = formatDateTime(r.datetime);
    const category = getBPCategory(r.systolic, r.diastolic);
    return {
      date,
      datetime: r.datetime,
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      category,
      notes: r.notes,
    };
  });

  // Calculate Y-axis domain with padding
  const allSystolic = chartData.map((d) => d.systolic);
  const allDiastolic = chartData.map((d) => d.diastolic);
  const minValue = Math.min(...allDiastolic) - 10;
  const maxValue = Math.max(...allSystolic) + 15;
  const yMin = Math.max(40, minValue);
  const yMax = Math.min(200, maxValue);

  if (chartData.length === 1) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
        Single reading — add more to see trends
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: -10 }}>
          {/* Background zones */}
          <ReferenceArea
            y1={yMin}
            y2={80}
            fill={BP_CATEGORIES.normal.chartColor}
            fillOpacity={0.08}
          />
          <ReferenceArea
            y1={80}
            y2={90}
            fill={BP_CATEGORIES.hypertension1.chartColor}
            fillOpacity={0.08}
          />
          <ReferenceArea
            y1={90}
            y2={120}
            fill={BP_CATEGORIES.hypertension2.chartColor}
            fillOpacity={0.08}
          />
          <ReferenceArea
            y1={120}
            y2={130}
            fill={BP_CATEGORIES.elevated.chartColor}
            fillOpacity={0.08}
          />
          <ReferenceArea
            y1={130}
            y2={140}
            fill={BP_CATEGORIES.hypertension1.chartColor}
            fillOpacity={0.08}
          />
          <ReferenceArea
            y1={140}
            y2={yMax}
            fill={BP_CATEGORIES.hypertension2.chartColor}
            fillOpacity={0.08}
          />

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
          />

          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            width={40}
            axisLine={false}
            tickFormatter={(v) => v}
          />

          <RechartsTooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />

          {/* Reference lines for thresholds */}
          <ReferenceLine
            y={120}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{ value: '120', fontSize: 9, fill: '#f59e0b', position: 'right' }}
          />
          <ReferenceLine
            y={80}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{ value: '80', fontSize: 9, fill: '#f59e0b', position: 'right' }}
          />
          <ReferenceLine
            y={140}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{ value: '140', fontSize: 9, fill: '#ef4444', position: 'right' }}
          />
          <ReferenceLine
            y={90}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{ value: '90', fontSize: 9, fill: '#ef4444', position: 'right' }}
          />

          {/* Systolic line */}
          <Line
            type="monotone"
            dataKey="systolic"
            name="Systolic"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={DotRenderer}
            activeDot={{ r: 7, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' }}
          />

          {/* Diastolic line */}
          <Line
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={DotRenderer}
            activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 text-xs text-muted-foreground text-center">
        {chartData.length} readings · {chartData[0].date} → {chartData[chartData.length - 1].date}
      </div>
    </div>
  );
}
