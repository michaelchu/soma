import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from 'recharts';
import { getBPCategory, getCategoryInfo, formatDateTime } from '../../utils/bpHelpers';
import { BP_CATEGORIES } from '../../constants/bpCategories';

// Custom tooltip component - defined outside to avoid recreation during render
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const info = getCategoryInfo(data.category);

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{data.dateLabel}</p>
      <div className="space-y-1">
        <p>
          <span className="font-medium">
            {data.systolic}/{data.diastolic}
          </span>{' '}
          mmHg
        </p>
        <p className={`${info.textClass} font-medium`}>{info.label}</p>
        {data.notes && <p className="text-muted-foreground italic text-xs mt-1">{data.notes}</p>}
      </div>
    </div>
  );
}

export function BPScatterChart({ readings, height = 280 }) {
  if (!readings || readings.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
        No readings to display
      </div>
    );
  }

  // Transform data for scatter chart
  const chartData = readings.map((r) => {
    const category = getBPCategory(r.systolic, r.diastolic);
    const { full } = formatDateTime(r.datetime);
    return {
      x: r.diastolic, // X-axis: diastolic
      y: r.systolic, // Y-axis: systolic
      datetime: r.datetime,
      dateLabel: full,
      systolic: r.systolic,
      diastolic: r.diastolic,
      category,
      notes: r.notes,
    };
  });

  // Calculate axis domains with padding
  const diastolicValues = chartData.map((d) => d.x);
  const systolicValues = chartData.map((d) => d.y);

  const xMin = Math.max(40, Math.min(...diastolicValues) - 10);
  const xMax = Math.min(130, Math.max(...diastolicValues) + 10);
  const yMin = Math.max(70, Math.min(...systolicValues) - 10);
  const yMax = Math.min(200, Math.max(...systolicValues) + 15);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
          {/* Background zones - colored regions for each BP category */}
          {/* Normal zone: systolic < 120 AND diastolic < 80 */}
          <ReferenceArea
            x1={xMin}
            x2={80}
            y1={yMin}
            y2={120}
            fill={BP_CATEGORIES.normal.chartColor}
            fillOpacity={0.15}
          />

          {/* Elevated zone: systolic 120-129 AND diastolic < 80 */}
          <ReferenceArea
            x1={xMin}
            x2={80}
            y1={120}
            y2={130}
            fill={BP_CATEGORIES.elevated.chartColor}
            fillOpacity={0.15}
          />

          {/* Hypertension 1 zones */}
          {/* Systolic 130-139, diastolic < 80 */}
          <ReferenceArea
            x1={xMin}
            x2={80}
            y1={130}
            y2={140}
            fill={BP_CATEGORIES.hypertension1.chartColor}
            fillOpacity={0.15}
          />
          {/* Diastolic 80-89, any systolic below 140 */}
          <ReferenceArea
            x1={80}
            x2={90}
            y1={yMin}
            y2={140}
            fill={BP_CATEGORIES.hypertension1.chartColor}
            fillOpacity={0.15}
          />

          {/* Hypertension 2 zones */}
          {/* Systolic >= 140, diastolic < 90 */}
          <ReferenceArea
            x1={xMin}
            x2={90}
            y1={140}
            y2={yMax}
            fill={BP_CATEGORIES.hypertension2.chartColor}
            fillOpacity={0.15}
          />
          {/* Diastolic >= 90, any systolic */}
          <ReferenceArea
            x1={90}
            x2={xMax}
            y1={yMin}
            y2={yMax}
            fill={BP_CATEGORIES.hypertension2.chartColor}
            fillOpacity={0.15}
          />

          <XAxis
            type="number"
            dataKey="x"
            domain={[xMin, xMax]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
            label={{
              value: 'Diastolic (mmHg)',
              position: 'bottom',
              offset: 0,
              fontSize: 12,
              fill: 'hsl(var(--muted-foreground))',
            }}
          />

          <YAxis
            type="number"
            dataKey="y"
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            width={55}
            axisLine={false}
            label={{
              value: 'Systolic (mmHg)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontSize: 12,
              fill: 'hsl(var(--muted-foreground))',
              dx: -5,
            }}
          />

          <RechartsTooltip content={<CustomTooltip />} />

          <Scatter data={chartData} fill="#8884d8">
            {chartData.map((entry, index) => {
              const info = getCategoryInfo(entry.category);
              return (
                <Cell key={`cell-${index}`} fill={info.chartColor} stroke="#fff" strokeWidth={2} />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: BP_CATEGORIES.normal.chartColor }}
          />
          Normal
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: BP_CATEGORIES.elevated.chartColor }}
          />
          Elevated
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: BP_CATEGORIES.hypertension1.chartColor }}
          />
          Stage 1
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: BP_CATEGORIES.hypertension2.chartColor }}
          />
          Stage 2
        </span>
      </div>
    </div>
  );
}
