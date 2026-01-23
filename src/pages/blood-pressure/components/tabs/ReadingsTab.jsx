import { useState, useRef } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BPStatusBadge } from '../ui/BPStatusBadge';
import { formatDateTime } from '../../utils/bpHelpers';
import { useBPSettings } from '../../hooks/useBPSettings';
import { ReadingForm } from '../modals/ReadingForm';

const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = 150;
const LONG_PRESS_DURATION = 500;

function SwipeableRow({ children, onDelete, onLongPress, isLast }) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef(null);
  const longPressTimer = useRef(null);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = offsetX;
    setIsDragging(true);
    isHorizontalSwipe.current = null;

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onLongPress?.();
    }, LONG_PRESS_DURATION);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    // Cancel long press if user moves
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      clearLongPressTimer();
    }

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return;

    e.preventDefault();
    const newOffset = Math.min(0, currentX.current + deltaX);
    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
    setIsDragging(false);
    isHorizontalSwipe.current = null;

    if (offsetX < -DELETE_THRESHOLD) {
      // Trigger delete
      setIsDeleting(true);
      setOffsetX(-window.innerWidth);
      setTimeout(() => onDelete(), 200);
    } else if (offsetX < -SWIPE_THRESHOLD) {
      // Snap to show delete button
      setOffsetX(-SWIPE_THRESHOLD);
    } else {
      // Snap back
      setOffsetX(0);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    setOffsetX(-window.innerWidth);
    setTimeout(() => onDelete(), 200);
  };

  return (
    <div
      className={`relative overflow-hidden ${!isLast ? 'border-b' : ''}`}
      style={{ opacity: isDeleting ? 0 : 1, transition: isDeleting ? 'opacity 0.2s' : undefined }}
    >
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end bg-red-500">
        <button
          onClick={handleDeleteClick}
          className="h-full px-6 flex items-center justify-center text-white"
          style={{ width: Math.max(SWIPE_THRESHOLD, Math.abs(offsetX)) }}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className="relative bg-background"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={clearLongPressTimer}
      >
        {children}
      </div>
    </div>
  );
}

export function ReadingsTab({ readings, updateReading, deleteReading }) {
  const [editingReading, setEditingReading] = useState(null);
  const { getCategory, getCategoryInfo } = useBPSettings();

  if (!readings || readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No readings yet
      </div>
    );
  }

  return (
    <>
      {/* Mobile: List layout */}
      <div className="md:hidden -mx-5 sm:-mx-6">
        {readings.map((reading, index) => {
          const { date, time } = formatDateTime(reading.datetime, { hideCurrentYear: true });
          const category = getCategory(reading.systolic, reading.diastolic);
          const categoryInfo = getCategoryInfo(category);
          return (
            <SwipeableRow
              key={reading.id}
              onDelete={() => deleteReading(reading.id)}
              onLongPress={() => setEditingReading(reading)}
              isLast={index === readings.length - 1}
            >
              <div className="flex items-stretch select-none">
                {/* BP Reading - colored background */}
                <div
                  className={`flex flex-col items-center justify-center min-w-[70px] py-3 ${categoryInfo.bgClass}`}
                >
                  <span
                    className={`font-mono text-xl font-bold leading-tight ${categoryInfo.textClass}`}
                  >
                    {reading.systolic}
                  </span>
                  <div
                    className={`w-5 h-px my-0.5 ${categoryInfo.textClass} opacity-30`}
                    style={{ backgroundColor: 'currentColor' }}
                  />
                  <span
                    className={`font-mono text-xl font-bold leading-tight ${categoryInfo.textClass}`}
                  >
                    {reading.diastolic}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 flex items-center justify-between px-3 sm:px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                      <span>{date}</span>
                      {reading.notes && (
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{time}</span>
                      <span>·</span>
                      <span>
                        {reading.pulse ? (
                          `${reading.pulse} bpm`
                        ) : (
                          <span className={categoryInfo.textClass}>
                            {categoryInfo.shortLabel || categoryInfo.label}
                          </span>
                        )}
                      </span>
                    </div>
                    {reading.pulse && (
                      <div className={`text-xs mt-0.5 ${categoryInfo.textClass}`}>
                        {categoryInfo.shortLabel || categoryInfo.label}
                      </div>
                    )}
                  </div>

                  {/* PP/MAP column */}
                  <div className="flex flex-col items-end justify-center text-sm text-muted-foreground">
                    <div>PP: {reading.systolic - reading.diastolic} mmHg</div>
                    <div>
                      MAP: {Math.round((reading.systolic + 2 * reading.diastolic) / 3)} mmHg
                    </div>
                  </div>
                </div>
              </div>
            </SwipeableRow>
          );
        })}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">BP</TableHead>
              <TableHead className="text-right">Pulse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.map((reading) => {
              const { date, time } = formatDateTime(reading.datetime);
              const category = getCategory(reading.systolic, reading.diastolic);
              return (
                <TableRow key={reading.id}>
                  <TableCell className="font-medium">{date}</TableCell>
                  <TableCell className="text-muted-foreground">{time}</TableCell>
                  <TableCell className="text-right font-mono">
                    {reading.systolic}/{reading.diastolic}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {reading.pulse || '—'}
                  </TableCell>
                  <TableCell>
                    <BPStatusBadge category={category} size="sm" />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                    {reading.notes || '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Reading Dialog */}
      <ReadingForm
        open={!!editingReading}
        onOpenChange={(open) => !open && setEditingReading(null)}
        reading={editingReading}
        updateReading={updateReading}
        deleteReading={deleteReading}
      />
    </>
  );
}
