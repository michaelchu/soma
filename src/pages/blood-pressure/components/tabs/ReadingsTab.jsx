import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { StickyNote, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BPStatusBadge } from '../ui/BPStatusBadge';
import { formatDateTime } from '../../utils/bpHelpers';
import { useBPSettings } from '../../hooks/useBPSettings';
import { ReadingForm } from '../modals/ReadingForm';

const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = 150;
const LONG_PRESS_DURATION = 500;

function SwipeableRow({ children, onDelete, onLongPress, onTap, onExpandTap, isLast }) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef(null);
  const longPressTimer = useRef(null);
  const hasMoved = useRef(false);
  const longPressTriggered = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const touchTarget = useRef(null);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = offsetX;
    setIsDragging(true);
    isHorizontalSwipe.current = null;
    hasMoved.current = false;
    longPressTriggered.current = false;

    // Check if touch started on expand button
    touchTarget.current = e.target.closest('[data-expand-button]') ? 'expand' : 'row';

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      longPressTriggered.current = true;
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
      hasMoved.current = true;
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
      // Handle tap if no movement and no long press
      if (!hasMoved.current && !longPressTriggered.current) {
        if (touchTarget.current === 'expand') {
          onExpandTap?.();
        } else {
          onTap?.();
        }
      }
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
      {/* Delete background - only render when swiping */}
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

function NotesModal({ open, onOpenChange, session }) {
  if (!session) return null;

  const { date, time } = formatDateTime(session.datetime, { hideCurrentYear: true });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Notes - {date} {time}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {session.notes ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{session.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No notes for this reading</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReadingsTab({ readings, addSession, updateSession, deleteSession }) {
  const [editingSession, setEditingSession] = useState(null);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [notesSession, setNotesSession] = useState(null);
  const { getCategory, getCategoryInfo } = useBPSettings();

  const handleDelete = async (sessionId) => {
    const { error, deletedSession } = await deleteSession(sessionId);
    if (error) return;

    toast('Reading deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (deletedSession) {
            addSession({
              datetime: deletedSession.datetime,
              readings: deletedSession.readings.map((r) => ({
                systolic: r.systolic,
                diastolic: r.diastolic,
                arm: r.arm,
              })),
              pulse: deletedSession.pulse,
              notes: deletedSession.notes,
            });
          }
        },
      },
      duration: 4000,
    });
  };

  const handleTap = (session) => {
    // Show notes modal if notes exist
    if (session.notes) {
      setNotesSession(session);
    }
  };

  const handleExpandToggle = (session) => {
    if (session.readingCount > 1) {
      setExpandedSessionId(expandedSessionId === session.sessionId ? null : session.sessionId);
    }
  };

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
        {readings.map((session, index) => {
          const { date, time } = formatDateTime(session.datetime, { hideCurrentYear: true });
          const category = getCategory(session.systolic, session.diastolic);
          const categoryInfo = getCategoryInfo(category);
          const isExpanded = expandedSessionId === session.sessionId;

          return (
            <div key={session.sessionId}>
              <SwipeableRow
                onDelete={() => handleDelete(session.sessionId)}
                onLongPress={() => setEditingSession(session)}
                onTap={() => handleTap(session)}
                onExpandTap={() => handleExpandToggle(session)}
                isLast={index === readings.length - 1 && !isExpanded}
              >
                <div className="flex items-stretch select-none">
                  {/* BP Reading - colored background */}
                  <div
                    className={`flex flex-col items-center justify-center min-w-[70px] py-3 ${categoryInfo.bgClass}`}
                  >
                    <span
                      className={`font-mono text-xl font-bold leading-tight ${categoryInfo.textClass}`}
                    >
                      {session.systolic}
                    </span>
                    <div
                      className={`w-5 h-px my-0.5 ${categoryInfo.textClass} opacity-30`}
                      style={{ backgroundColor: 'currentColor' }}
                    />
                    <span
                      className={`font-mono text-xl font-bold leading-tight ${categoryInfo.textClass}`}
                    >
                      {session.diastolic}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex items-center justify-between pl-3 sm:pl-4 pr-5 sm:pr-6 py-3">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                        <span>{date}</span>
                        {session.notes && (
                          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {session.readingCount > 1 && (
                          <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {session.readingCount}x
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{time}</span>
                        {session.pulse && (
                          <>
                            <span>·</span>
                            <span>{session.pulse} bpm</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* PP/MAP column + expand indicator */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end justify-center text-sm text-muted-foreground">
                        <div>PP: {session.systolic - session.diastolic} mmHg</div>
                        <div>
                          MAP: {Math.round((session.systolic + 2 * session.diastolic) / 3)} mmHg
                        </div>
                      </div>
                      {session.readingCount > 1 && (
                        <div
                          className="p-2 -m-2 text-muted-foreground active:bg-muted rounded"
                          data-expand-button="true"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SwipeableRow>

              {/* Expanded individual readings */}
              {isExpanded && session.readings && (
                <div className="bg-muted/30 border-b">
                  {session.readings.map((reading, readingIndex) => {
                    const readingCategory = getCategory(reading.systolic, reading.diastolic);
                    const readingCategoryInfo = getCategoryInfo(readingCategory);
                    return (
                      <div
                        key={reading.id}
                        className={`flex items-center px-5 sm:px-6 py-2 ${
                          readingIndex !== session.readings.length - 1
                            ? 'border-b border-border/50'
                            : ''
                        }`}
                      >
                        <div className="w-[70px] flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">#{readingIndex + 1}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-mono text-sm font-medium ${readingCategoryInfo.textClass}`}
                            >
                              {reading.systolic}/{reading.diastolic}
                            </span>
                            {reading.arm && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {reading.arm}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs ${readingCategoryInfo.textClass}`}>
                            {readingCategoryInfo.shortLabel || readingCategoryInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {session.notes && (
                    <div className="px-5 sm:px-6 py-2 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">{session.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              <TableHead className="text-center">Readings</TableHead>
              <TableHead className="text-right">Pulse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.map((session) => {
              const { date, time } = formatDateTime(session.datetime);
              const category = getCategory(session.systolic, session.diastolic);
              return (
                <TableRow key={session.sessionId}>
                  <TableCell className="font-medium">{date}</TableCell>
                  <TableCell className="text-muted-foreground">{time}</TableCell>
                  <TableCell className="text-right font-mono">
                    {session.systolic}/{session.diastolic}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {session.readingCount > 1 ? `${session.readingCount}x` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {session.pulse || '—'}
                  </TableCell>
                  <TableCell>
                    <BPStatusBadge category={category} size="sm" />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                    {session.notes || '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Notes Modal */}
      <NotesModal
        open={!!notesSession}
        onOpenChange={(open) => !open && setNotesSession(null)}
        session={notesSession}
      />

      {/* Edit Session Dialog */}
      <ReadingForm
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
        session={editingSession}
        addSession={addSession}
        updateSession={updateSession}
        deleteSession={deleteSession}
      />
    </>
  );
}
