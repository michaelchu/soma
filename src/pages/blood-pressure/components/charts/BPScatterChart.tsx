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
import { formatDateTime } from '../../utils/bpHelpers';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';

interface BPReading {
  datetime: string;
  systolic: number;
  diastolic: number;
  notes?: string | null;
}

interface ChartDataPoint {
  x: number;
  y: number;
  datetime: string;
  dateLabel: string;
  systolic: number;
  diastolic: number;
  category: string;
  notes?: string | null;
}

interface CategoryInfo {
  label: string;
  shortLabel?: string;
  textClass: string;
  chartColor: string;
}

type GetCategoryInfo = (category: string) => CategoryInfo;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  getCategoryInfo: GetCategoryInfo;
}

// Custom tooltip component
function CustomTooltip({ active, payload, getCategoryInfo }: CustomTooltipProps) {
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

interface ReferenceAreaData {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  category: string;
}

// Generate reference areas based on guideline
function getReferenceAreas(
  guidelineKey: string,
  _categories: CategoryInfo[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): ReferenceAreaData[] {
  // For simplicity, we'll generate zones based on the guideline's categories
  // This is a simplified version - complex guidelines might need custom handling

  if (guidelineKey === 'simple') {
    // Simple: just normal and hypertension
    return [
      { x1: xMin, x2: 80, y1: yMin, y2: 120, category: 'normal' },
      { x1: xMin, x2: 80, y1: 120, y2: yMax, category: 'hypertension' },
      { x1: 80, x2: xMax, y1: yMin, y2: yMax, category: 'hypertension' },
    ];
  }

  if (guidelineKey === 'jnc7') {
    return [
      { x1: xMin, x2: 80, y1: yMin, y2: 120, category: 'normal' },
      { x1: xMin, x2: 80, y1: 120, y2: 140, category: 'prehypertension' },
      { x1: 80, x2: 90, y1: yMin, y2: 140, category: 'prehypertension' },
      { x1: xMin, x2: 90, y1: 140, y2: 160, category: 'hypertension1' },
      { x1: 90, x2: 100, y1: yMin, y2: 160, category: 'hypertension1' },
      { x1: xMin, x2: 100, y1: 160, y2: yMax, category: 'hypertension2' },
      { x1: 100, x2: xMax, y1: yMin, y2: yMax, category: 'hypertension2' },
    ];
  }

  if (guidelineKey === 'esc2018') {
    return [
      { x1: xMin, x2: 80, y1: yMin, y2: 120, category: 'optimal' },
      { x1: xMin, x2: 80, y1: 120, y2: 130, category: 'normal' },
      { x1: 80, x2: 85, y1: yMin, y2: 130, category: 'normal' },
      { x1: xMin, x2: 85, y1: 130, y2: 140, category: 'highNormal' },
      { x1: 85, x2: 90, y1: yMin, y2: 140, category: 'highNormal' },
      { x1: xMin, x2: 90, y1: 140, y2: 160, category: 'hypertension1' },
      { x1: 90, x2: 100, y1: yMin, y2: 160, category: 'hypertension1' },
      { x1: xMin, x2: 100, y1: 160, y2: 180, category: 'hypertension2' },
      { x1: 100, x2: 110, y1: yMin, y2: 180, category: 'hypertension2' },
      { x1: xMin, x2: 110, y1: 180, y2: yMax, category: 'hypertension3' },
      { x1: 110, x2: xMax, y1: yMin, y2: yMax, category: 'hypertension3' },
    ];
  }

  if (guidelineKey === 'htnCanada2025') {
    // HTN Canada 2025: Normal <130/80, HTN 130-139/80-89, HTN (Treat) ≥140/90
    return [
      { x1: xMin, x2: 80, y1: yMin, y2: 130, category: 'normal' },
      { x1: xMin, x2: 80, y1: 130, y2: 140, category: 'hypertensionCanada' },
      { x1: 80, x2: 90, y1: yMin, y2: 140, category: 'hypertensionCanada' },
      { x1: xMin, x2: 90, y1: 140, y2: yMax, category: 'hypertensionTreat' },
      { x1: 90, x2: xMax, y1: yMin, y2: yMax, category: 'hypertensionTreat' },
    ];
  }

  // Default: AHA 2017
  return [
    { x1: xMin, x2: 80, y1: yMin, y2: 120, category: 'normal' },
    { x1: xMin, x2: 80, y1: 120, y2: 130, category: 'elevated' },
    { x1: xMin, x2: 80, y1: 130, y2: 140, category: 'hypertension1' },
    { x1: 80, x2: 90, y1: yMin, y2: 140, category: 'hypertension1' },
    { x1: xMin, x2: 90, y1: 140, y2: yMax, category: 'hypertension2' },
    { x1: 90, x2: xMax, y1: yMin, y2: yMax, category: 'hypertension2' },
  ];
}

interface BPScatterChartProps {
  readings: BPReading[];
  height?: number;
}

export function BPScatterChart({ readings, height = 280 }: BPScatterChartProps) {
  const { getCategory, getCategoryInfo, guidelineKey, guideline, categories } =
    useBloodPressureSettings();

  if (!readings || readings.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
        No readings to display
      </div>
    );
  }

  // Transform data for scatter chart
  const chartData = readings.map((r) => {
    const category = getCategory(r.systolic, r.diastolic);
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

  // Calculate axis domains with padding, rounded to intervals of 10
  const diastolicValues = chartData.map((d) => d.x);
  const systolicValues = chartData.map((d) => d.y);

  const xMin = Math.floor(Math.max(40, Math.min(...diastolicValues) - 10) / 10) * 10;
  const xMax = Math.max(130, Math.ceil((Math.max(...diastolicValues) + 10) / 10) * 10);
  const yMin = Math.floor(Math.max(70, Math.min(...systolicValues) - 10) / 10) * 10;
  const yMax = Math.max(190, Math.ceil((Math.max(...systolicValues) + 15) / 10) * 10);

  // Generate tick arrays for intervals of 10
  const xTicks = Array.from({ length: (xMax - xMin) / 10 + 1 }, (_, i) => xMin + i * 10);
  const yTicks = Array.from({ length: (yMax - yMin) / 10 + 1 }, (_, i) => yMin + i * 10);

  // Get reference areas for the current guideline
  const referenceAreas = getReferenceAreas(guidelineKey, categories, xMin, xMax, yMin, yMax);

  // Create tooltip renderer

  const renderTooltip = (props: any) => (
    <CustomTooltip {...props} getCategoryInfo={getCategoryInfo} />
  );

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
          {/* Background zones - colored regions for each BP category */}
          {referenceAreas.map((area, index) => {
            const info = getCategoryInfo(area.category);
            return (
              <ReferenceArea
                key={index}
                x1={area.x1}
                x2={area.x2}
                y1={area.y1}
                y2={area.y2}
                fill={info.chartColor}
                fillOpacity={0.15}
              />
            );
          })}

          <XAxis
            type="number"
            dataKey="x"
            domain={[xMin, xMax]}
            ticks={xTicks}
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
            ticks={yTicks}
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

          <RechartsTooltip content={renderTooltip} />

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

      <div className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground flex-wrap">
        {categories.map((cat) => (
          <span key={cat.key} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.chartColor }} />
            {cat.shortLabel || cat.label}
          </span>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Classification: {guideline?.name}
      </p>
    </div>
  );
}
