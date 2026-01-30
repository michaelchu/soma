import { useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';

const DEFAULT_BAR_WIDTH = 36;
const DEFAULT_BAR_GAP = 4;
const DEFAULT_MAX_BAR_HEIGHT = 120;
const DEFAULT_MIN_BAR_HEIGHT = 40;

export interface ScoreBarChartItem {
  date: string;
  score: number | null;
}

interface ScoreBarChartProps {
  items: ScoreBarChartItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  // Optional customization
  barWidth?: number;
  barGap?: number;
  maxBarHeight?: number;
  minBarHeight?: number;
  scoreRange?: { min: number; max: number };
}

function ScoreBar({
  item,
  isSelected,
  barWidth,
  maxBarHeight,
  minBarHeight,
  minScore,
  maxScore,
}: {
  item: ScoreBarChartItem;
  isSelected: boolean;
  barWidth: number;
  maxBarHeight: number;
  minBarHeight: number;
  minScore: number;
  maxScore: number;
}) {
  const date = new Date(item.date + 'T00:00:00');
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

  if (item.score === null) {
    // Placeholder bar for dates with no data
    return (
      <div
        className="flex flex-col items-center justify-end"
        style={{ width: barWidth, minWidth: barWidth }}
      >
        <div className="w-full h-[2px] rounded-full bg-muted-foreground/20" />
        <span className="text-xs mt-2 text-muted-foreground/50">{dayName}</span>
      </div>
    );
  }

  // Calculate bar height relative to score range
  const range = maxScore - minScore || 1;
  const normalizedHeight =
    ((item.score - minScore) / range) * (maxBarHeight - minBarHeight) + minBarHeight;

  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ width: barWidth, minWidth: barWidth }}
    >
      {/* Bar with score inside */}
      <div
        className={`w-full rounded-t-lg transition-all duration-200 flex items-start justify-center pt-2 ${
          isSelected ? 'bg-foreground' : 'bg-muted-foreground/40'
        }`}
        style={{ height: normalizedHeight }}
      >
        <span
          className={`text-xs font-bold transition-colors ${
            isSelected ? 'text-background' : 'text-foreground/90'
          }`}
        >
          {item.score}
        </span>
      </div>

      {/* Day label */}
      <span
        className={`text-xs mt-2 transition-colors ${
          isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground'
        }`}
      >
        {dayName}
      </span>
    </div>
  );
}

export function ScoreBarChart({
  items,
  selectedIndex,
  onSelectIndex,
  barWidth = DEFAULT_BAR_WIDTH,
  barGap = DEFAULT_BAR_GAP,
  maxBarHeight = DEFAULT_MAX_BAR_HEIGHT,
  minBarHeight = DEFAULT_MIN_BAR_HEIGHT,
  scoreRange,
}: ScoreBarChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const barTotalWidth = barWidth + barGap;

  // Calculate min/max scores for bar height scaling
  const { minScore, maxScore } = useMemo(() => {
    if (scoreRange) {
      return { minScore: scoreRange.min, maxScore: scoreRange.max };
    }

    const scores = items.map((i) => i.score).filter((s): s is number => s !== null);
    if (scores.length === 0) return { minScore: 0, maxScore: 100 };

    return {
      minScore: Math.max(0, Math.min(...scores) - 10),
      maxScore: Math.min(100, Math.max(...scores) + 10),
    };
  }, [items, scoreRange]);

  // Handle scroll to auto-select centered bar
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const centerOffset = scrollLeft + containerWidth / 2;

    // Account for left padding
    const paddingLeft = containerWidth / 2 - barWidth / 2;
    const adjustedOffset = centerOffset - paddingLeft;

    // Calculate which bar is centered
    const centeredIndex = Math.round(adjustedOffset / barTotalWidth);
    const clampedIndex = Math.max(0, Math.min(centeredIndex, items.length - 1));

    if (clampedIndex !== selectedIndex) {
      onSelectIndex(clampedIndex);
    }
  }, [items.length, selectedIndex, onSelectIndex, barWidth, barTotalWidth]);

  // Scroll to a specific bar index
  const scrollToIndex = useCallback(
    (index: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const paddingLeft = containerWidth / 2 - barWidth / 2;
      const targetScroll = index * barTotalWidth - containerWidth / 2 + paddingLeft + barWidth / 2;

      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    },
    [barWidth, barTotalWidth]
  );

  // Initial scroll to the latest item (rightmost)
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || items.length === 0) return;

    const lastIndex = items.length - 1;
    const containerWidth = container.clientWidth;
    const paddingLeft = containerWidth / 2 - barWidth / 2;
    const targetScroll =
      lastIndex * barTotalWidth - containerWidth / 2 + paddingLeft + barWidth / 2;

    container.scrollLeft = Math.max(0, targetScroll);
    onSelectIndex(lastIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="flex items-end overflow-x-auto scrollbar-hide py-4"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Left padding to allow first item to center */}
        <div
          style={{
            minWidth: `calc(50% - ${barWidth / 2}px)`,
            flexShrink: 0,
          }}
        />

        {items.map((item, index) => (
          <div
            key={item.date}
            className={`flex-shrink-0 ${item.score !== null ? 'cursor-pointer' : ''}`}
            style={{
              scrollSnapAlign: 'center',
              marginRight: index < items.length - 1 ? barGap : 0,
            }}
            onClick={() => item.score !== null && scrollToIndex(index)}
          >
            <ScoreBar
              item={item}
              isSelected={index === selectedIndex}
              barWidth={barWidth}
              maxBarHeight={maxBarHeight}
              minBarHeight={minBarHeight}
              minScore={minScore}
              maxScore={maxScore}
            />
          </div>
        ))}

        {/* Right padding to allow last item to center */}
        <div
          style={{
            minWidth: `calc(50% - ${barWidth / 2}px)`,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Fade overlays for edge blending */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
