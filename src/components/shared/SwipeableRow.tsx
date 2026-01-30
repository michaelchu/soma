import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { TOUCH_CONSTANTS } from '@/lib/constants';

const { SWIPE_THRESHOLD, DELETE_THRESHOLD, LONG_PRESS_DURATION, MOVEMENT_THRESHOLD } =
  TOUCH_CONSTANTS;

export interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onLongPress?: () => void;
  onTap?: () => void;
  onExpandTap?: () => void;
  isLast: boolean;
}

export function SwipeableRow({
  children,
  onDelete,
  onLongPress,
  onTap,
  onExpandTap,
  isLast,
}: SwipeableRowProps) {
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
  const touchTarget = useRef<'expand' | 'row'>('row');

  // Store callbacks in refs to avoid stale closures
  const offsetXRef = useRef(offsetX);
  const isDraggingRef = useRef(isDragging);

  // Sync refs in useEffect to avoid updating during render
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

      // Check if touch started on expand button
      const target = e.target as HTMLElement;
      touchTarget.current = target.closest('[data-expand-button]') ? 'expand' : 'row';

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        // Vibrate if supported
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

      // Cancel long press if user moves
      if (absX > MOVEMENT_THRESHOLD || absY > MOVEMENT_THRESHOLD) {
        clearLongPressTimer();
        hasMoved.current = true;
      }

      // Determine swipe direction on first significant movement
      if (
        isHorizontalSwipe.current === null &&
        (absX > MOVEMENT_THRESHOLD || absY > MOVEMENT_THRESHOLD)
      ) {
        isHorizontalSwipe.current = absX > absY;
      }

      // If we're swiping horizontally (or might be - horizontal movement is dominant),
      // prevent vertical scroll to avoid janky behavior
      if (
        isHorizontalSwipe.current ||
        (isHorizontalSwipe.current === null && absX > absY && absX > 5)
      ) {
        e.preventDefault();
      }

      // Only update offset for confirmed horizontal swipes
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
      // Trigger delete
      setIsDeleting(true);
      setOffsetX(-window.innerWidth);
      setTimeout(() => onDelete(), 200);
    } else if (currentOffset < -SWIPE_THRESHOLD) {
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
  }, [clearLongPressTimer, onDelete, onExpandTap, onTap]);

  // Attach touch event listeners with { passive: false } to allow preventDefault
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
