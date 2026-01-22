import { useState } from 'react';
import { StickyNote } from 'lucide-react';
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

export function ReadingsTab({ readings }) {
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
      <div className="md:hidden -mx-3 sm:-mx-4">
        {readings.map((reading, index) => {
          const { date, time } = formatDateTime(reading.datetime, { hideCurrentYear: true });
          const category = getCategory(reading.systolic, reading.diastolic);
          const categoryInfo = getCategoryInfo(category);
          return (
            <div
              key={reading.id}
              className={`flex items-stretch cursor-pointer hover:bg-muted/50 transition-colors ${index !== readings.length - 1 ? 'border-b' : ''}`}
              onClick={() => setEditingReading(reading)}
            >
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
                    {reading.notes && <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />}
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
                  <div>MAP: {Math.round((reading.systolic + 2 * reading.diastolic) / 3)} mmHg</div>
                </div>
              </div>
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
      />
    </>
  );
}
