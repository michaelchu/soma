import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
} from 'recharts';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { REFERENCE_RANGES } from '../../constants/referenceRanges';
import { getStatus } from '../../utils/statusHelpers';
import { StatusBadge } from '../ui/StatusBadge';
import { RangeBar } from '../ui/RangeBar';
import { TrendIndicator } from '../ui/TrendIndicator';

export function MetricChart({ metricKey, reports }) {
  const ref = REFERENCE_RANGES[metricKey];
  const data = reports
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => {
      if (!r.metrics[metricKey]) return null;
      const m = r.metrics[metricKey];
      return {
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: m.value,
        min: m.min,
        max: m.max,
        fullDate: r.date,
      };
    })
    .filter(Boolean);

  if (data.length === 0 || !ref) return null;

  const sortedReports = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestReport = sortedReports.find((r) => r.metrics[metricKey]);
  const metric = latestReport?.metrics[metricKey];
  if (!metric) return null;

  const allValues = data.map((d) => d.value);
  const minVal = Math.min(...allValues),
    maxVal = Math.max(...allValues);
  const range = maxVal - minVal || maxVal * 0.2;
  const padding = range * 0.4;

  let yMin = minVal - padding,
    yMax = maxVal + padding;
  if (metric.min !== null) yMin = Math.min(yMin, metric.min - padding * 0.5);
  if (metric.max !== null) yMax = Math.max(yMax, metric.max + padding * 0.5);
  if (metric.optimalMin !== null || metric.optimalMax !== null) {
    if (metric.optimalMin !== null) yMin = Math.min(yMin, metric.optimalMin - padding * 0.3);
    if (metric.optimalMax !== null) yMax = Math.max(yMax, metric.optimalMax + padding * 0.3);
  }

  const status = getStatus(metric.value, metric.min, metric.max);
  const hasHistoricalAbnormal = data.some((d) => getStatus(d.value, d.min, d.max) !== 'normal');

  return (
    <div
      className={`bg-card rounded-xl border-2 p-3 sm:p-4 transition-all ${
        status !== 'normal'
          ? 'border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20'
          : hasHistoricalAbnormal
            ? 'border-muted-foreground/30'
            : 'border-border'
      }`}
    >
      <div className="flex justify-between items-start mb-1 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">
              {ref.name}
            </h4>
            {ref.clinicalNotes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-muted-foreground cursor-help flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{ref.clinicalNotes}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ref.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{metric.value}</p>
          <p className="text-xs text-muted-foreground">{metric.unit}</p>
        </div>
      </div>

      {/* Range visualization bar */}
      <RangeBar
        value={metric.value}
        min={metric.min}
        max={metric.max}
        optimalMin={metric.optimalMin}
        optimalMax={metric.optimalMax}
        unit={metric.unit}
      />

      <div className="flex items-center justify-between mt-2 mb-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <TrendIndicator data={data} />
        </div>
        <div className="text-xs text-muted-foreground">
          {metric.min !== null && metric.max !== null
            ? `Ref: ${metric.min}–${metric.max}`
            : metric.min !== null
              ? `Ref: ≥${metric.min}`
              : metric.max !== null
                ? `Ref: ≤${metric.max}`
                : ''}
          {metric.optimalMin !== null &&
            metric.optimalMax !== null &&
            ` · Optimal: ${metric.optimalMin}–${metric.optimalMax}`}
        </div>
      </div>

      {data.length > 1 ? (
        <div className="bg-muted rounded-lg p-2 -mx-2">
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={data} margin={{ top: 10, right: 30, bottom: 5, left: -15 }}>
              {/* Low zone (below min) */}
              {metric.min !== null && (
                <ReferenceArea
                  y1={yMin}
                  y2={metric.min}
                  fill="#fef3c7"
                  fillOpacity={0.8}
                  className="dark:opacity-30"
                />
              )}
              {/* Normal zone */}
              {metric.min !== null && metric.max !== null && (
                <ReferenceArea
                  y1={metric.min}
                  y2={metric.max}
                  fill="#dcfce7"
                  fillOpacity={0.8}
                  className="dark:opacity-30"
                />
              )}
              {/* Optimal zone highlight */}
              {metric.optimalMin !== null && metric.optimalMax !== null && (
                <ReferenceArea
                  y1={metric.optimalMin}
                  y2={metric.optimalMax}
                  fill="#22c55e"
                  fillOpacity={0.2}
                />
              )}
              {/* High zone (above max) */}
              {metric.max !== null && (
                <ReferenceArea
                  y1={metric.max}
                  y2={yMax}
                  fill="#fef3c7"
                  fillOpacity={0.8}
                  className="dark:opacity-30"
                />
              )}

              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--muted-foreground))"
                width={45}
                axisLine={false}
                tickFormatter={(v) => v.toFixed(metric.unit === 'L/L' ? 2 : v < 10 ? 1 : 0)}
              />
              <RechartsTooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value) => [`${value} ${metric.unit}`, metric.name]}
                labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
              />

              {/* Reference lines */}
              {metric.min !== null && (
                <ReferenceLine
                  y={metric.min}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: 'Min', fontSize: 9, fill: '#f59e0b', position: 'right' }}
                />
              )}
              {metric.max !== null && (
                <ReferenceLine
                  y={metric.max}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: 'Max', fontSize: 9, fill: '#f59e0b', position: 'right' }}
                />
              )}

              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const pointStatus = getStatus(payload.value, payload.min, payload.max);
                  const color =
                    pointStatus === 'normal'
                      ? '#22c55e'
                      : pointStatus === 'high'
                        ? '#ef4444'
                        : '#f59e0b';
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />
                      {pointStatus !== 'normal' && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill="none"
                          stroke={color}
                          strokeWidth={2}
                          opacity={0.3}
                        />
                      )}
                    </g>
                  );
                }}
                activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg">
          Single data point — add more reports to see trends
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground text-center">
        {data.length === 1
          ? `1 reading · ${data[0].date}`
          : `${data.length} readings · ${data[0].date} → ${data[data.length - 1].date}`}
      </div>
    </div>
  );
}
