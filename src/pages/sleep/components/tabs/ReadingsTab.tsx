import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showWithUndo, showError } from '@/lib/toast';
import { formatDate } from '@/lib/dateUtils';
import { formatDuration, formatHrvRange, getRestorativeSleepPct } from '../../utils/sleepHelpers';
import { SleepEntryForm } from '../modals/SleepEntryForm';
import { useSleep } from '../../context/SleepContext';
import { TOUCH_CONSTANTS } from '@/lib/constants';
import type { SleepEntry } from '@/lib/db/sleep';

const { SWIPE_THRESHOLD, DELETE_THRESHOLD, LONG_PRESS_DURATION, MOVEMENT_THRESHOLD } =
  TOUCH_CONSTANTS;

// Sleep stage colors - designed for clear visual distinction
const STAGE_COLORS = {
  deep: 'bg-indigo-500',
  rem: 'bg-teal-500',
  light: 'bg-slate-400',
  awake: 'bg-amber-500',
};

interface ReadingsTabProps {
  entries: SleepEntry[];
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onLongPress?: () => void;
  onTap?: () => void;
  isLast: boolean;
}

function SwipeableRow({ children, onDelete, onLongPress, onTap, isLast }: SwipeableRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);
  const longPressTriggered = useRef(false);

  const offsetXRef = useRef(offsetX);
  const isDraggingRef = useRef(isDragging);

  useEffect(() => {
    offsetXRef.current = offsetX;
  }, [offsetX]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      currentX.current = offsetXRef.current;
      setIsDragging(true);
      isHorizontalSwipe.current = null;
      hasMoved.current = false;
      longPressTriggered.current = false;

      longPressTimer.current = setTimeout(() => {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        longPressTriggered.current = true;
        onLongPress?.();
      }, LONG_PRESS_DURATION);
    },
    [onLongPress]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.touches[0].clientX - startX.current;
      const deltaY = e.touches[0].clientY - startY.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > MOVEMENT_THRESHOLD || absY > MOVEMENT_THRESHOLD) {
        clearLongPressTimer();
        hasMoved.current = true;
      }

      if (
        isHorizontalSwipe.current === null &&
        (absX > MOVEMENT_THRESHOLD || absY > MOVEMENT_THRESHOLD)
      ) {
        isHorizontalSwipe.current = absX > absY;
      }

      if (
        isHorizontalSwipe.current ||
        (isHorizontalSwipe.current === null && absX > absY && absX > 5)
      ) {
        e.preventDefault();
      }

      if (!isHorizontalSwipe.current) return;

      const newOffset = Math.min(0, currentX.current + deltaX);
      setOffsetX(newOffset);
    },
    [clearLongPressTimer]
  );

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer();
    setIsDragging(false);
    isHorizontalSwipe.current = null;

    const currentOffset = offsetXRef.current;

    if (currentOffset < -DELETE_THRESHOLD) {
      setIsDeleting(true);
      setOffsetX(-window.innerWidth);
      setTimeout(() => onDelete(), 200);
    } else if (currentOffset < -SWIPE_THRESHOLD) {
      setOffsetX(-SWIPE_THRESHOLD);
    } else {
      setOffsetX(0);
      if (!hasMoved.current && !longPressTriggered.current) {
        onTap?.();
      }
    }
  }, [clearLongPressTimer, onDelete, onTap]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', clearLongPressTimer, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', clearLongPressTimer);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);

  const handleDeleteClick = (e: React.MouseEvent) => {
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
      {offsetX < 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 flex items-center justify-end bg-red-500"
          style={{ width: Math.max(SWIPE_THRESHOLD, Math.abs(offsetX)) }}
        >
          <button
            onClick={handleDeleteClick}
            className="h-full w-full flex items-center justify-center text-white"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}

      <div
        ref={contentRef}
        className="relative bg-background"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SleepStagesBar({ entry }: { entry: SleepEntry }) {
  const hasStages =
    entry.deepSleepPct !== null ||
    entry.remSleepPct !== null ||
    entry.lightSleepPct !== null ||
    entry.awakePct !== null;

  if (!hasStages) return null;

  const stages = [
    { key: 'deep', value: entry.deepSleepPct, color: STAGE_COLORS.deep, label: 'Deep' },
    { key: 'rem', value: entry.remSleepPct, color: STAGE_COLORS.rem, label: 'REM' },
    { key: 'light', value: entry.lightSleepPct, color: STAGE_COLORS.light, label: 'Light' },
    { key: 'awake', value: entry.awakePct, color: STAGE_COLORS.awake, label: 'Awake' },
  ].filter((s) => s.value !== null);

  return (
    <div className="mt-2">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className={stage.color}
            style={{ width: `${stage.value}%` }}
            title={`${stage.label}: ${stage.value}%`}
          />
        ))}
      </div>
      {/* Compact legend with dots */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
        {stages.map((stage) => (
          <span key={stage.key} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${stage.color}`} />
            {stage.label} {stage.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

function NotesModal({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: SleepEntry | null;
}) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notes - {formatDate(entry.date, { includeWeekday: true })}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {entry.notes ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{entry.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No notes for this entry</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReadingsTab({ entries }: ReadingsTabProps) {
  const { addEntry, deleteEntry } = useSleep();
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null);
  const [notesEntry, setNotesEntry] = useState<SleepEntry | null>(null);

  const handleDelete = async (entry: SleepEntry) => {
    const { error } = await deleteEntry(entry.id);
    if (error) return;

    showWithUndo('Sleep entry deleted', async () => {
      const { error: undoError } = await addEntry({
        date: entry.date,
        durationMinutes: entry.durationMinutes,
        sleepStart: entry.sleepStart,
        sleepEnd: entry.sleepEnd,
        hrvLow: entry.hrvLow,
        hrvHigh: entry.hrvHigh,
        restingHr: entry.restingHr,
        lowestHrTime: entry.lowestHrTime,
        hrDropMinutes: entry.hrDropMinutes,
        deepSleepPct: entry.deepSleepPct,
        remSleepPct: entry.remSleepPct,
        lightSleepPct: entry.lightSleepPct,
        awakePct: entry.awakePct,
        sleepIndex: entry.sleepIndex,
        skinTempAvg: entry.skinTempAvg,
        restfulness: entry.restfulness,
        sleepCyclesFull: entry.sleepCyclesFull,
        sleepCyclesPartial: entry.sleepCyclesPartial,
        movementCount: entry.movementCount,
        notes: entry.notes,
      });
      if (undoError) {
        showError('Failed to restore entry');
      }
    });
  };

  const handleTap = (entry: SleepEntry) => {
    if (entry.notes) {
      setNotesEntry(entry);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No sleep entries in this period
      </div>
    );
  }

  return (
    <>
      {/* Mobile: List layout */}
      <div className="md:hidden -mx-5 sm:-mx-6">
        {entries.map((entry, index) => {
          const restorative = getRestorativeSleepPct(entry);

          return (
            <SwipeableRow
              key={entry.id}
              onDelete={() => handleDelete(entry)}
              onLongPress={() => setEditingEntry(entry)}
              onTap={() => handleTap(entry)}
              isLast={index === entries.length - 1}
            >
              <div className="flex items-stretch select-none">
                {/* Sleep Index or Duration - colored accent */}
                <div className="flex flex-col items-center justify-center min-w-[70px] py-3 bg-violet-500/10">
                  {entry.sleepIndex !== null ? (
                    <>
                      <span className="font-mono text-2xl font-bold leading-tight text-violet-600 dark:text-violet-400">
                        {entry.sleepIndex}
                      </span>
                      <span className="text-[10px] text-violet-600/70 dark:text-violet-400/70 uppercase tracking-wide">
                        Index
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-xl font-bold leading-tight text-violet-600 dark:text-violet-400">
                        {Math.floor(entry.durationMinutes / 60)}h
                      </span>
                      <span className="font-mono text-sm text-violet-600/70 dark:text-violet-400/70">
                        {entry.durationMinutes % 60}m
                      </span>
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 pl-3 sm:pl-4 pr-5 sm:pr-6 py-3">
                  {/* Header row */}
                  <div className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                    <span>{formatDate(entry.date, { includeWeekday: true })}</span>
                    {entry.notes && <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>

                  {/* Metrics row */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                    {entry.sleepIndex !== null && (
                      <span>
                        <span className="font-medium text-foreground">
                          {formatDuration(entry.durationMinutes)}
                        </span>
                      </span>
                    )}
                    {(entry.hrvLow !== null || entry.hrvHigh !== null) && (
                      <span>
                        HRV{' '}
                        <span className="font-medium text-foreground">
                          {formatHrvRange(entry.hrvLow, entry.hrvHigh)}
                        </span>
                      </span>
                    )}
                    {entry.restingHr !== null && (
                      <span>
                        RHR <span className="font-medium text-foreground">{entry.restingHr}</span>
                      </span>
                    )}
                    {entry.restfulness !== null && (
                      <span>
                        Rest{' '}
                        <span className="font-medium text-foreground">{entry.restfulness}</span>
                      </span>
                    )}
                    {restorative !== null && (
                      <span>
                        Restor <span className="font-medium text-foreground">{restorative}%</span>
                      </span>
                    )}
                  </div>

                  {/* Sleep stages bar */}
                  <SleepStagesBar entry={entry} />
                </div>
              </div>
            </SwipeableRow>
          );
        })}
      </div>

      {/* Desktop: Simple list */}
      <div className="hidden md:block">
        {entries.map((entry) => {
          const restorative = getRestorativeSleepPct(entry);

          return (
            <div
              key={entry.id}
              className="py-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/30 -mx-1 px-1 rounded transition-colors"
              onClick={() => setEditingEntry(entry)}
            >
              {/* Header row */}
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  {formatDate(entry.date, { includeWeekday: true })}
                </span>
                <span className="text-lg font-semibold">
                  {formatDuration(entry.durationMinutes)}
                </span>
              </div>

              {/* Metrics row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {(entry.hrvLow !== null || entry.hrvHigh !== null) && (
                  <span>
                    <span className="text-muted-foreground">HRV </span>
                    <span className="font-medium">
                      {formatHrvRange(entry.hrvLow, entry.hrvHigh)}
                    </span>
                  </span>
                )}
                {entry.restingHr !== null && (
                  <span>
                    <span className="text-muted-foreground">RHR </span>
                    <span className="font-medium">{entry.restingHr}</span>
                  </span>
                )}
                {restorative !== null && (
                  <span>
                    <span className="text-muted-foreground">Restorative </span>
                    <span className="font-medium">{restorative}%</span>
                  </span>
                )}
              </div>

              {/* Sleep stages bar */}
              <SleepStagesBar entry={entry} />

              {/* Notes */}
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-2 truncate">{entry.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes Modal */}
      <NotesModal
        open={!!notesEntry}
        onOpenChange={(open) => !open && setNotesEntry(null)}
        entry={notesEntry}
      />

      {/* Edit Entry Dialog */}
      <SleepEntryForm
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        entry={editingEntry}
      />
    </>
  );
}
