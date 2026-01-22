import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BPStatusBadge } from '../ui/BPStatusBadge';
import { getBPCategory, formatDateTime } from '../../utils/bpHelpers';

export function ReadingsTab({ readings }) {
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
          const category = getBPCategory(reading.systolic, reading.diastolic);
          return (
            <div
              key={reading.id}
              className={`flex items-center gap-3 px-3 sm:px-4 py-3 ${index !== readings.length - 1 ? 'border-b' : ''}`}
            >
              {/* BP Reading - prominent */}
              <div className="flex flex-col items-center min-w-[70px]">
                <span className="font-mono text-xl font-bold leading-tight">
                  {reading.systolic}
                </span>
                <div className="w-5 h-px bg-muted-foreground/30 my-0.5" />
                <span className="font-mono text-xl font-bold leading-tight">
                  {reading.diastolic}
                </span>
              </div>

              {/* Vertical divider */}
              <div className="w-px h-10 bg-border" />

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm text-muted-foreground">
                    {date} · {time}
                  </span>
                  {reading.pulse && (
                    <span className="text-sm text-muted-foreground">· {reading.pulse} bpm</span>
                  )}
                </div>
                {reading.notes && (
                  <p className="text-sm text-muted-foreground/80 truncate">{reading.notes}</p>
                )}
              </div>

              {/* Badge on right */}
              <BPStatusBadge category={category} size="sm" />
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
              const category = getBPCategory(reading.systolic, reading.diastolic);
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
    </>
  );
}
