import { useRef, useCallback, useMemo } from 'react';
import type { MouseEvent, TouchEvent } from 'react';
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

const LONG_PRESS_DURATION = 600; // ms
const MOVE_THRESHOLD = 10; // pixels - cancel long press if moved more than this

interface EnrichedMetric {
  value: number;
  unit: string;
  min: number | null;
  max: number | null;
  optimalMin: number | null;
  optimalMax: number | null;
  name: string;
}

interface EnrichedReport {
  id: string;
  date: string;
  metrics: Record<string, EnrichedMetric>;
}

interface MetricChartProps {
  metricKey: string;
  reports: EnrichedReport[];
  collapsed?: boolean;
  mobileExpanded?: boolean;
  onTap?: (metricKey: string) => void;
  onLongPress?: (metricKey: string) => void;
}

interface ChartDataPoint {
  date: string;
  value: number;
  min: number | null;
  max: number | null;
  fullDate: string;
}

interface DotProps {
  cx: number;
  cy: number;
  payload: ChartDataPoint;
}

export function MetricChart({
  metricKey,
  reports,
  collapsed = false,
  mobileExpanded = false,
  onTap,
  onLongPress,
}: MetricChartProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (e: MouseEvent | TouchEvent) => {
      isLongPressRef.current = false;
      didMoveRef.current = false;

      // Store initial position
      if ('touches' in e) {
        startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      }

      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (onLongPress) {
          // Trigger haptic feedback on supported devices
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          onLongPress(metricKey);
        }
      }, LONG_PRESS_DURATION);
    },
    [metricKey, onLongPress]
  );

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      let currentX, currentY;
      if ('touches' in e) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      const deltaX = Math.abs(currentX - startPosRef.current.x);
      const deltaY = Math.abs(currentY - startPosRef.current.y);

      // Cancel if moved beyond threshold (user is scrolling)
      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        didMoveRef.current = true;
        cancelLongPress();
      }
    },
    [cancelLongPress]
  );

  const handleEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const handleClick = useCallback(() => {
    // If it was a long press or user moved, don't treat as tap
    if (isLongPressRef.current || didMoveRef.current) {
      return;
    }
    if (onTap) {
      onTap(metricKey);
    }
  }, [metricKey, onTap]);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      // Prevent context menu on long press
      if (onLongPress) {
        e.preventDefault();
      }
    },
    [onLongPress]
  );

  const ref = REFERENCE_RANGES[metricKey];

  // Memoize chart data transformation to prevent recalculation on every render
  const data = useMemo(
    (): ChartDataPoint[] =>
      [...reports]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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
        .filter((d): d is ChartDataPoint => d !== null),
    [reports, metricKey]
  );

  // Memoize latest metric lookup
  const metric = useMemo(() => {
    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestReport = sortedReports.find((r) => r.metrics[metricKey]);
    return latestReport?.metrics[metricKey];
  }, [reports, metricKey]);

  // Memoize chart domain calculations
  const { yMin, yMax } = useMemo(() => {
    if (data.length === 0 || !metric) return { yMin: 0, yMax: 100 };

    const allValues = data.map((d) => d.value);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || maxVal * 0.2;
    const padding = range * 0.4;

    let computedYMin = minVal - padding;
    let computedYMax = maxVal + padding;

    if (metric.min !== null) computedYMin = Math.min(computedYMin, metric.min - padding * 0.5);
    if (metric.max !== null) computedYMax = Math.max(computedYMax, metric.max + padding * 0.5);
    if (metric.optimalMin !== null)
      computedYMin = Math.min(computedYMin, metric.optimalMin - padding * 0.3);
    if (metric.optimalMax !== null)
      computedYMax = Math.max(computedYMax, metric.optimalMax + padding * 0.3);

    return { yMin: computedYMin, yMax: computedYMax };
  }, [data, metric]);

  // Memoize status calculations
  const { status, hasHistoricalAbnormal } = useMemo((): {
    status: 'low' | 'normal' | 'high';
    hasHistoricalAbnormal: boolean;
  } => {
    if (!metric) return { status: 'normal', hasHistoricalAbnormal: false };
    return {
      status: getStatus(metric.value, metric.min, metric.max),
      hasHistoricalAbnormal: data.some((d) => getStatus(d.value, d.min, d.max) !== 'normal'),
    };
  }, [metric, data]);

  // Early return after all hooks
  if (data.length === 0 || !ref || !metric) return null;

  return (
    <div
      className={`transition-all select-none md:bg-card md:rounded-xl md:border-2 md:p-4 ${
        status !== 'normal'
          ? 'md:border-amber-300 md:dark:border-amber-700 md:bg-gradient-to-br md:from-amber-50/50 md:to-transparent md:dark:from-amber-950/20'
          : hasHistoricalAbnormal
            ? 'md:border-muted-foreground/30'
            : 'md:border-border'
      } ${onLongPress || onTap ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      onClick={onTap ? handleClick : undefined}
      onMouseDown={onLongPress ? startLongPress : undefined}
      onMouseUp={onLongPress ? handleEnd : undefined}
      onMouseMove={onLongPress ? handleMove : undefined}
      onMouseLeave={onLongPress ? cancelLongPress : undefined}
      onTouchStart={onLongPress || onTap ? startLongPress : undefined}
      onTouchEnd={onLongPress || onTap ? handleEnd : undefined}
      onTouchMove={onLongPress || onTap ? handleMove : undefined}
      onTouchCancel={onLongPress || onTap ? cancelLongPress : undefined}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      onContextMenu={handleContextMenu}
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
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1" title={ref.description}>
            {ref.description}
          </p>
        </div>
        <div className="text-right flex items-baseline gap-1 flex-shrink-0">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{metric.value}</p>
          <p className="text-xs text-muted-foreground">{metric.unit}</p>
        </div>
      </div>

      {/* Range visualization bar - always visible */}
      <RangeBar
        value={metric.value}
        min={metric.min}
        max={metric.max}
        optimalMin={metric.optimalMin}
        optimalMax={metric.optimalMax}
      />

      {/* Expanded content: visible on mobile when mobileExpanded, on desktop when not collapsed */}
      {(mobileExpanded || !collapsed) && (
        <div
          className={`${mobileExpanded || !collapsed ? '' : 'hidden'} ${collapsed ? 'md:hidden' : ''}`}
        >
          <div className="flex items-center justify-between mt-2 mb-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <TrendIndicator data={data} min={metric.min} max={metric.max} />
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {metric.min !== null && metric.max !== null ? (
                <div>
                  Ref: {metric.min}–{metric.max}
                </div>
              ) : metric.min !== null ? (
                <div>Ref: ≥{metric.min}</div>
              ) : metric.max !== null ? (
                <div>Ref: ≤{metric.max}</div>
              ) : null}
              {metric.optimalMin !== null && metric.optimalMax !== null && (
                <div>
                  Optimal: {metric.optimalMin}–{metric.optimalMax}
                </div>
              )}
            </div>
          </div>

          {data.length > 1 ? (
            <div className="rounded-lg -mx-2">
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={data} margin={{ top: 10, right: 30, bottom: 5, left: -15 }}>
                  {/* Low zone (below min) */}
                  {metric.min !== null && (
                    <ReferenceArea y1={yMin} y2={metric.min} fill="#f59e0b" fillOpacity={0.15} />
                  )}
                  {/* Normal zone */}
                  {metric.min !== null && metric.max !== null && (
                    <ReferenceArea
                      y1={metric.min}
                      y2={metric.max}
                      fill="#22c55e"
                      fillOpacity={0.15}
                    />
                  )}
                  {/* Normal zone for lower-bound only (e.g., eGFR ≥60) */}
                  {metric.min !== null && metric.max === null && (
                    <ReferenceArea y1={metric.min} y2={yMax} fill="#22c55e" fillOpacity={0.15} />
                  )}
                  {/* Normal zone for upper-bound only (e.g., LDL ≤3.5) */}
                  {metric.min === null && metric.max !== null && (
                    <ReferenceArea y1={yMin} y2={metric.max} fill="#22c55e" fillOpacity={0.15} />
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
                    <ReferenceArea y1={metric.max} y2={yMax} fill="#f59e0b" fillOpacity={0.15} />
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
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props as DotProps;
                      const pointStatus = getStatus(payload.value, payload.min, payload.max);
                      const color =
                        pointStatus === 'normal'
                          ? '#22c55e'
                          : pointStatus === 'high'
                            ? '#ef4444'
                            : '#f59e0b';
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={color}
                            stroke="#fff"
                            strokeWidth={2}
                          />
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
                    activeDot={{
                      r: 8,
                      stroke: 'hsl(var(--primary))',
                      strokeWidth: 2,
                      fill: 'hsl(var(--background))',
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-16 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg text-center px-4">
              Single data point — add more reports to see trends
            </div>
          )}

          <div className="mt-2 text-xs text-muted-foreground text-center">
            {data.length === 1
              ? `1 reading · ${data[0].date}`
              : `${data.length} readings · ${data[0].date} → ${data[data.length - 1].date}`}
          </div>
        </div>
      )}
    </div>
  );
}
