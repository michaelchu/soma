import { useState } from 'react';
import { StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { showWithUndo, showError } from '@/lib/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SwipeableRow } from '@/components/shared/SwipeableRow';
import { BPStatusBadge } from '../ui/BPStatusBadge';
import { formatDateTime } from '../../utils/bpHelpers';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';
import { useBloodPressure } from '../../context/BPContext';
import { ReadingForm } from '../modals/ReadingForm';

interface BPSession {
  sessionId: string;
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  readingCount: number;
  readings: Array<{
    id: string;
    systolic: number;
    diastolic: number;
    arm: 'L' | 'R' | null;
    pulse?: number | null;
  }>;
}

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: BPSession | null;
}

function NotesModal({ open, onOpenChange, session }: NotesModalProps) {
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

interface ReadingsTabProps {
  readings: BPSession[];
}

export function ReadingsTab({ readings }: ReadingsTabProps) {
  const { addSession, deleteSession } = useBloodPressure();
  const [editingSession, setEditingSession] = useState<BPSession | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [notesSession, setNotesSession] = useState<BPSession | null>(null);
  const { getCategory, getCategoryInfo } = useBloodPressureSettings();

  const handleDelete = async (sessionId: string) => {
    const { error, deletedItem } = await deleteSession(sessionId);
    if (error) return;

    showWithUndo('Reading deleted', async () => {
      if (deletedItem) {
        const { error: undoError } = await addSession({
          datetime: deletedItem.datetime,
          readings: deletedItem.readings.map((r) => ({
            systolic: r.systolic,
            diastolic: r.diastolic,
            arm: r.arm,
            pulse: r.pulse,
          })),
          notes: deletedItem.notes,
        });
        if (undoError) {
          showError('Failed to restore reading');
        }
      }
    });
  };

  const handleTap = (session: BPSession) => {
    // Show notes modal if notes exist
    if (session.notes) {
      setNotesSession(session);
    }
  };

  const handleExpandToggle = (session: BPSession) => {
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
                        <div>PP: {session.systolic - session.diastolic}</div>
                        <div>MAP: {Math.round((session.systolic + 2 * session.diastolic) / 3)}</div>
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
                          <BPStatusBadge category={readingCategory} size="sm" />
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
      />
    </>
  );
}
