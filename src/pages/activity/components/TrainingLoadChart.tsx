import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Activity } from '@/types/activity';
import { calculateTrainingLoad, getTrainingLoadLevel } from '../utils/activityHelpers';
import { TrainingLoadModal } from './modals/TrainingLoadModal';

interface TrainingLoadChartProps {
  activities: Activity[];
}

interface ChartDataPoint {
  date: string;
  score: number;
  label: string;
}

const CHART_HEIGHT = 80;
const CHART_DAYS = 7;

export function TrainingLoadChart({ activities }: TrainingLoadChartProps) {
  const [showModal, setShowModal] = useState(false);

  // Calculate training load for each day in the past week
  const chartData = useMemo((): ChartDataPoint[] => {
    const today = new Date();
    const data: ChartDataPoint[] = [];

    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const result = calculateTrainingLoad(dateStr, activities);
      data.push({
        date: dateStr,
        score: result.score,
        label: dayName,
      });
    }

    return data;
  }, [activities]);

  // Get min/max for scaling
  const { minScore, maxScore } = useMemo(() => {
    const scores = chartData.map((d) => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    // Add padding and ensure reasonable range
    const padding = Math.max((max - min) * 0.2, 10);
    return {
      minScore: Math.max(0, min - padding),
      maxScore: max + padding,
    };
  }, [chartData]);

  // Get today's training load for display
  const todayData = chartData[chartData.length - 1];
  const todayLevel = getTrainingLoadLevel(todayData.score);

  // Calculate change percentage over the period
  const startData = chartData[0];
  const changePercent = useMemo(() => {
    if (!startData || startData.score === 0) return null;
    return ((todayData.score - startData.score) / startData.score) * 100;
  }, [todayData.score, startData]);

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

  // Build area path (for gradient fill under the line)
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

  if (activities.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full text-left rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors active:scale-[0.99] bg-gradient-to-br from-activity/10 via-transparent to-transparent"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-activity" />
            <span className="text-sm font-medium text-muted-foreground">Training Load</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{todayData.score}</span>
            <span className={`text-xs font-medium ${todayLevel.color}`}>{todayLevel.label}</span>
            {changePercent !== null && (
              <span
                className={`text-xs font-medium ${
                  changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {changePercent >= 0 ? '+' : ''}
                {changePercent.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="relative" style={{ height: CHART_HEIGHT }}>
          <svg
            viewBox={`0 0 100 ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="trainingLoadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(249 115 22)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(249 115 22)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill="url(#trainingLoadGradient)" />

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
          </svg>
        </div>

        {/* Day labels */}
        <div className="flex justify-between mt-2">
          {chartData.map((point, index) => (
            <span
              key={point.date}
              className={`text-[10px] ${
                index === chartData.length - 1
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {point.label}
            </span>
          ))}
        </div>
      </button>

      {/* Full screen modal */}
      <TrainingLoadModal open={showModal} onOpenChange={setShowModal} activities={activities} />
    </>
  );
}
