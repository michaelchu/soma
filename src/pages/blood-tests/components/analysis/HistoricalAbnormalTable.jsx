import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { REFERENCE_RANGES } from '../../constants/referenceRanges';
import { getStatus } from '../../utils/statusHelpers';

export function HistoricalAbnormalTable({ reports }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const sortedReports = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allAbnormals = [];

  sortedReports.forEach((report) => {
    Object.entries(report.metrics).forEach(([key, data]) => {
      const ref = REFERENCE_RANGES[key];
      if (!ref) return;
      const status = getStatus(data.value, data.min, data.max);
      if (status !== 'normal') {
        allAbnormals.push({
          date: report.date,
          metric: data.name,
          value: data.value,
          unit: data.unit,
          range: `${data.min ?? '—'}–${data.max ?? '—'}`,
          optimal:
            data.optimalMin !== null && data.optimalMax !== null
              ? `${data.optimalMin}–${data.optimalMax}`
              : null,
          status,
        });
      }
    });
  });

  if (allAbnormals.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-900">
        <p className="text-sm text-green-700 dark:text-green-400">
          ✓ All values normal across all reports!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-950/50 transition-colors"
      >
        <h3 className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle size={16} />
          Historical Abnormals ({allAbnormals.length})
        </h3>
        <ChevronDown
          size={18}
          className={`text-amber-600 dark:text-amber-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
        />
      </button>
      {!isCollapsed && (
        <div className="overflow-x-auto">
          <div className="max-h-48 overflow-y-auto">
            <Table className="min-w-[500px]">
              <TableHeader className="bg-muted sticky top-0">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Ref</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAbnormals.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{item.metric}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.value} {item.unit}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {item.range}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.status === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        }
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
