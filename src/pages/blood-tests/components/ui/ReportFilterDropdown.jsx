import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { REFERENCE_RANGES } from '../../constants/referenceRanges';
import { getStatus } from '../../utils/statusHelpers';

export function ReportFilterDropdown({
  reports,
  selectedCount,
  isReportSelected,
  toggleReportSelection,
  selectAllReports,
}) {
  const sortedReports = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 sm:gap-2 h-8 flex-shrink-0"
          title="Select Reports"
        >
          <Calendar size={16} />
          <span className="hidden sm:inline">Reports</span>
          <span className="text-xs text-muted-foreground">
            ({selectedCount}/{reports.length})
          </span>
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Select Reports</span>
          <button onClick={selectAllReports} className="text-xs text-primary hover:underline">
            Select All
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedReports.map((report) => {
          const abnormalCount = Object.entries(report.metrics).filter(([key, m]) => {
            const ref = REFERENCE_RANGES[key];
            return ref && getStatus(m.value, m.min, m.max) !== 'normal';
          }).length;
          return (
            <DropdownMenuCheckboxItem
              key={report.id}
              checked={isReportSelected(report.id)}
              onCheckedChange={() => toggleReportSelection(report.id)}
            >
              <div className="flex items-center justify-between w-full">
                <span>
                  {new Date(report.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {abnormalCount > 0 && (
                  <span className="text-xs text-amber-500 ml-2">{abnormalCount} ⚠</span>
                )}
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
