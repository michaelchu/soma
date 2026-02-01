import React, { useRef, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { SleepEntry } from '@/lib/db/sleep';
import { STAGE_COLORS } from '@/pages/sleep/utils/sleepHelpers';

// Default dimensions for desktop
const DEFAULT_BAR_WIDTH = 36;
const DEFAULT_BAR_GAP = 4;
const DEFAULT_MAX_BAR_HEIGHT = 200;
const DEFAULT_MIN_BAR_HEIGHT = 80;

export interface StackedBarChartProps {
  entriesByDate: Map<string, SleepEntry>;
  allDatesInRange: string[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  // Optional customization for different screen sizes
  barWidth?: number;
  barGap?: number;
  maxBarHeight?: number;
  minBarHeight?: number;
  showLegend?: boolean;
  showMonthLabel?: boolean;
  compact?: boolean; // For mobile: smaller text, day of week labels
}

interface BarData {
  date: string;
  entry: SleepEntry | null;
  duration: number | null;
  stages: { key: string; value: number; color: string }[];
}

function StackedBar({
  bar,
  isSelected,
  maxDuration,
  barWidth,
  maxBarHeight,
  minBarHeight,
  compact,
}: {
  bar: BarData;
  isSelected: boolean;
  maxDuration: number;
  barWidth: number;
  maxBarHeight: number;
  minBarHeight: number;
  compact?: boolean;
}) {
  const date = new Date(bar.date + 'T00:00:00');
  const dayNumber = date.getDate();

  if (!bar.entry || bar.duration === null) {
    // Placeholder bar for dates with no data
    return (
      <div
        className="flex flex-col items-center justify-end"
        style={{ width: barWidth, minWidth: barWidth }}
      >
        <div className="w-full flex items-end" style={{ height: minBarHeight }}>
          <div className="w-full h-[2px] rounded-full bg-muted-foreground/20" />
        </div>
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} mt-1 text-muted-foreground/50`}>
          {dayNumber}
        </span>
      </div>
    );
  }

  // Calculate bar height relative to duration range
  const normalizedHeight =
    (bar.duration / maxDuration) * (maxBarHeight - minBarHeight) + minBarHeight;

  const hasStages = bar.stages.length > 0;

  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ width: barWidth, minWidth: barWidth }}
    >
      {/* Stacked bar */}
      <div
        className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 ease-out ${
          isSelected ? 'shadow-[0_0_20px_rgba(255,255,255,0.35)] brightness-125' : 'brightness-75'
        }`}
        style={{ height: normalizedHeight }}
      >
        {hasStages ? (
          bar.stages.map((stage) => (
            <div key={stage.key} className={stage.color} style={{ height: `${stage.value}%` }} />
          ))
        ) : (
          <div className="w-full h-full bg-violet-500" />
        )}
      </div>

      {/* Day label */}
      <span
        className={`${compact ? 'text-[10px]' : 'text-xs'} mt-1 transition-all duration-300 ${
          isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground'
        }`}
      >
        {dayNumber}
      </span>
    </div>
  );
}

export function StackedBarChart({
  entriesByDate,
  allDatesInRange,
  selectedIndex,
  onSelectIndex,
  barWidth = DEFAULT_BAR_WIDTH,
  barGap = DEFAULT_BAR_GAP,
  maxBarHeight = DEFAULT_MAX_BAR_HEIGHT,
  minBarHeight = DEFAULT_MIN_BAR_HEIGHT,
  showLegend = true,
  showMonthLabel = true,
  compact = false,
}: StackedBarChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const barTotalWidth = barWidth + barGap;
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const selectedIndexRef = useRef(selectedIndex);
  const scrollRafRef = useRef<number | null>(null);

  // Keep ref in sync
  selectedIndexRef.current = selectedIndex;

  // Build bar data
  const bars = useMemo((): BarData[] => {
    return allDatesInRange.map((date) => {
      const entry = entriesByDate.get(date) || null;
      if (!entry) {
        return { date, entry: null, duration: null, stages: [] };
      }

      const stages = [
        { key: 'deep', value: entry.deepSleepPct, color: STAGE_COLORS.deep },
        { key: 'rem', value: entry.remSleepPct, color: STAGE_COLORS.rem },
        { key: 'light', value: entry.lightSleepPct, color: STAGE_COLORS.light },
        { key: 'awake', value: entry.awakePct, color: STAGE_COLORS.awake },
      ].filter((s): s is { key: string; value: number; color: string } => s.value !== null);

      return {
        date,
        entry,
        duration: entry.totalSleepMinutes ?? entry.durationMinutes,
        stages,
      };
    });
  }, [allDatesInRange, entriesByDate]);

  // Find max duration for scaling
  const maxDuration = useMemo(() => {
    const durations = bars.map((b) => b.duration).filter((d): d is number => d !== null);
    return Math.max(...durations, 1);
  }, [bars]);

  // Handle scroll to auto-select centered bar (debounced with RAF)
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const centerOffset = scrollLeft + containerWidth / 2;

      const paddingLeft = containerWidth / 2 - barWidth / 2;
      const adjustedOffset = centerOffset - paddingLeft;

      const centeredIndex = Math.round(adjustedOffset / barTotalWidth);
      const clampedIndex = Math.max(0, Math.min(centeredIndex, bars.length - 1));

      if (clampedIndex !== selectedIndexRef.current) {
        onSelectIndex(clampedIndex);
      }
    });
  }, [bars.length, onSelectIndex, barTotalWidth, barWidth]);

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
    [barTotalWidth, barWidth]
  );

  // Initial scroll to the latest item (rightmost)
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || bars.length === 0) return;

    const lastIndex = bars.length - 1;
    const containerWidth = container.clientWidth;
    const paddingLeft = containerWidth / 2 - barWidth / 2;
    const targetScroll =
      lastIndex * barTotalWidth - containerWidth / 2 + paddingLeft + barWidth / 2;

    container.scrollLeft = Math.max(0, targetScroll);
    onSelectIndex(lastIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars.length]);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [handleScroll]);

  // Mouse drag handlers (for desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStartRef.current) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - dragStartRef.current.x) * 1.5;

      if (Math.abs(x - dragStartRef.current.x) > 5) {
        hasDraggedRef.current = true;
      }

      container.scrollLeft = dragStartRef.current.scrollLeft - walk;
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleBarClick = useCallback(
    (index: number, hasEntry: boolean) => {
      if (!hasDraggedRef.current && hasEntry) {
        scrollToIndex(index);
      }
    },
    [scrollToIndex]
  );

  // Get month/year label from selected date
  const monthYearLabel = useMemo(() => {
    const selectedDate = allDatesInRange[selectedIndex];
    if (!selectedDate) return '';
    const date = new Date(selectedDate + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [allDatesInRange, selectedIndex]);

  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Month/Year label */}
      {showMonthLabel && monthYearLabel && (
        <div className={compact ? 'mb-2 px-4' : 'mb-4'}>
          <p className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-foreground`}>
            {monthYearLabel}
          </p>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`flex items-end overflow-x-auto scrollbar-hide ${compact ? 'py-2' : 'py-4'} select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left padding to allow first item to center */}
        <div
          style={{
            minWidth: `calc(50% - ${barWidth / 2}px)`,
            flexShrink: 0,
          }}
        />

        {bars.map((bar, index) => (
          <div
            key={bar.date}
            className={`flex-shrink-0 ${bar.entry ? 'cursor-pointer' : ''}`}
            style={{
              marginRight: index < bars.length - 1 ? barGap : 0,
            }}
            onClick={() => handleBarClick(index, !!bar.entry)}
          >
            <StackedBar
              bar={bar}
              isSelected={index === selectedIndex}
              maxDuration={maxDuration}
              barWidth={barWidth}
              maxBarHeight={maxBarHeight}
              minBarHeight={minBarHeight}
              compact={compact}
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

      {/* Legend - below chart */}
      {showLegend && (
        <div className={`flex items-center justify-center gap-4 ${compact ? 'text-[10px] mt-2' : 'text-xs mt-4'}`}>
          <div className="flex items-center gap-1.5">
            <span className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-sm ${STAGE_COLORS.deep}`} />
            <span className="text-muted-foreground">Deep</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-sm ${STAGE_COLORS.rem}`} />
            <span className="text-muted-foreground">REM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-sm ${STAGE_COLORS.light}`} />
            <span className="text-muted-foreground">Light</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-sm ${STAGE_COLORS.awake}`} />
            <span className="text-muted-foreground">Awake</span>
          </div>
        </div>
      )}
    </div>
  );
}
