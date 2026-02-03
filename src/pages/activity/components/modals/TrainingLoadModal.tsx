import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Activity } from '@/types/activity';
import { toLocalDateString } from '@/lib/dateUtils';
import {
  calculateTrainingLoad,
  getTrainingLoadLevel,
  formatDuration,
  getActivityTypeLabel,
  getTimeOfDayLabel,
} from '../../utils/activityHelpers';
import { ActivityIcon } from '../ActivityIcons';

interface TrainingLoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
}

interface ChartDataPoint {
  date: string;
  score: number;
  label: string;
  fullDate: string;
}

const DATE_RANGES = [
  { value: '7', label: 'W', days: 7 },
  { value: '30', label: 'M', days: 30 },
  { value: '90', label: 'Q', days: 90 },
];

const CHART_HEIGHT = 200;

export function TrainingLoadModal({ open, onOpenChange, activities }: TrainingLoadModalProps) {
  const [dateRange, setDateRange] = useState('30');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Calculate training load for each day in the selected range
  const chartData = useMemo((): ChartDataPoint[] => {
    const days = parseInt(dateRange, 10);
    const today = new Date();
    const data: ChartDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = toLocalDateString(date);

      // Show different label formats based on range
      let label: string;
      if (days <= 7) {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (days <= 30) {
        label = date.getDate().toString();
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      const fullDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const result = calculateTrainingLoad(dateStr, activities);
      data.push({
        date: dateStr,
        score: result.score,
        label,
        fullDate,
      });
    }

    return data;
  }, [activities, dateRange]);

  // Get min/max for scaling
  const { minScore, maxScore } = useMemo(() => {
    const scores = chartData.map((d) => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const padding = Math.max((max - min) * 0.2, 10);
    return {
      minScore: Math.max(0, min - padding),
      maxScore: max + padding,
    };
  }, [chartData]);

  // Get selected or latest data point
  const selectedData =
    selectedIndex !== null ? chartData[selectedIndex] : chartData[chartData.length - 1];
  const selectedLevel = getTrainingLoadLevel(selectedData?.score || 0);

  // Get activities for the selected date
  const selectedDateActivities = useMemo(() => {
    if (!selectedData) return [];
    return activities.filter((a) => a.date === selectedData.date);
  }, [activities, selectedData]);

  // Build SVG path for the line
  const linePath = useMemo(() => {
    if (chartData.length === 0) return '';

    const range = maxScore - minScore || 1;
    const points = chartData.map((point, index) => {
      const x = (index / (chartData.length - 1)) * 100;
      const y = ((maxScore - point.score) / range) * CHART_HEIGHT;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [chartData, minScore, maxScore]);

  // Build area path
  const areaPath = useMemo(() => {
    if (chartData.length === 0) return '';

    const range = maxScore - minScore || 1;
    const points = chartData.map((point, index) => {
      const x = (index / (chartData.length - 1)) * 100;
      const y = ((maxScore - point.score) / range) * CHART_HEIGHT;
      return `${x},${y}`;
    });

    return `M 0,${CHART_HEIGHT} L ${points.join(' L ')} L 100,${CHART_HEIGHT} Z`;
  }, [chartData, minScore, maxScore]);

  // Calculate point position for selected index
  const selectedPointPosition = useMemo(() => {
    const index = selectedIndex ?? chartData.length - 1;
    if (chartData.length === 0) return { x: 0, y: 0 };

    const range = maxScore - minScore || 1;
    const x = (index / (chartData.length - 1)) * 100;
    const y = ((maxScore - chartData[index].score) / range) * CHART_HEIGHT;
    return { x, y };
  }, [chartData, selectedIndex, minScore, maxScore]);

  // Handle touch/click on chart
  const handleChartInteraction = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();

    let clientX: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const x = (clientX - rect.left) / rect.width;
    const index = Math.round(x * (chartData.length - 1));
    const clampedIndex = Math.max(0, Math.min(index, chartData.length - 1));
    setSelectedIndex(clampedIndex);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-3xl sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-activity" />
            Training Load
          </DialogTitle>
        </DialogHeader>

        {/* Date Range Filter */}
        <div className="flex justify-center p-4">
          <div className="flex gap-1 rounded-md p-0.5 h-8 items-center border border-white/10">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => {
                  setDateRange(range.value);
                  setSelectedIndex(null);
                }}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  dateRange === range.value
                    ? 'bg-white/20 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Value Display */}
        <div className="px-4 pb-2 text-center">
          <div className="text-sm text-muted-foreground">{selectedData?.fullDate}</div>
          <div className="text-3xl font-bold">{selectedData?.score || 0}</div>
          <div className={`text-sm font-medium -mt-1 ${selectedLevel.color}`}>
            {selectedLevel.label}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 px-4 pb-4">
          <div className="relative h-full max-h-[300px]">
            <svg
              viewBox={`0 0 100 ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              className="w-full h-full cursor-crosshair"
              onMouseMove={handleChartInteraction}
              onTouchMove={handleChartInteraction}
              onClick={handleChartInteraction}
              onMouseLeave={() => setSelectedIndex(null)}
            >
              {/* Gradient definition */}
              <defs>
                <linearGradient id="trainingLoadGradientModal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(249 115 22)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(249 115 22)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={CHART_HEIGHT * ratio}
                  x2="100"
                  y2={CHART_HEIGHT * ratio}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Area fill */}
              <path d={areaPath} fill="url(#trainingLoadGradientModal)" />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke="rgb(249 115 22)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Vertical line at selected point */}
              <line
                x1={selectedPointPosition.x}
                y1="0"
                x2={selectedPointPosition.x}
                y2={CHART_HEIGHT}
                stroke="rgb(249 115 22)"
                strokeOpacity="0.3"
                strokeDasharray="2,2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground py-1">
              <span>{Math.round(maxScore)}</span>
              <span>{Math.round((maxScore + minScore) / 2)}</span>
              <span>{Math.round(minScore)}</span>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-2 px-6">
            {chartData.length <= 14 ? (
              chartData.map((point, index) => (
                <span
                  key={point.date}
                  className={`text-[10px] ${
                    (selectedIndex ?? chartData.length - 1) === index
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {point.label}
                </span>
              ))
            ) : (
              // For longer ranges, show fewer labels
              <>
                <span className="text-[10px] text-muted-foreground">{chartData[0]?.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {chartData[Math.floor(chartData.length / 2)]?.label}
                </span>
                <span className="text-[10px] text-foreground font-medium">
                  {chartData[chartData.length - 1]?.label}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Activities for selected date */}
        <div className="p-4 border-t border-white/10">
          {selectedDateActivities.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Activities on {selectedData?.fullDate}
              </div>
              {selectedDateActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                >
                  <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center">
                    <ActivityIcon
                      type={activity.activityType}
                      size={18}
                      className="text-background"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {getActivityTypeLabel(activity.activityType)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(activity.durationMinutes)} ·{' '}
                      {getTimeOfDayLabel(activity.timeOfDay)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No activities on {selectedData?.fullDate}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
