import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { getBPCategory, getCategoryInfo, formatDateTime } from '../../utils/bpHelpers';

// Calculate linear regression for a series of values
function linearRegression(values) {
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
    getY: (x) => slope * x + intercept,
  };
}

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

export function BPTimeChart({ readings, height = 280, showTrendline = true, showMarkers = true }) {
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

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartDataWithTrend}
          margin={{ top: 10, right: 30, bottom: 5, left: 10 }}
        >
          <CartesianGrid horizontal={true} vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
          />

          <YAxis
            domain={[yMin, yMax]}
            ticks={Array.from({ length: (yMax - yMin) / 20 + 1 }, (_, i) => yMin + i * 20)}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            width={55}
            axisLine={false}
            label={{
              value: 'Sys/Dia (mmHg)',
              angle: -90,
              position: 'insideLeft',
              fontSize: 12,
              fill: 'hsl(var(--muted-foreground))',
            }}
          />

          <RechartsTooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />

          {/* Systolic line */}
          <Line
            type="monotone"
            dataKey="systolic"
            name="Systolic"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={showMarkers ? DotRenderer : false}
            activeDot={
              showMarkers ? { r: 7, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' } : false
            }
          />

          {/* Diastolic line */}
          <Line
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={showMarkers ? DotRenderer : false}
            activeDot={
              showMarkers ? { r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' } : false
            }
          />

          {/* Systolic trendline (linear regression) */}
          {showTrendline && sysRegression && (
            <Line
              type="linear"
              dataKey="sysTrend"
              name="Sys Trend"
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
        {chartData.length} readings · {chartData[0].date} → {chartData[chartData.length - 1].date}
      </div>
    </div>
  );
}
