import { AlertTriangle, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { ReportFilterDropdown } from './ReportFilterDropdown';

export function FilterToolbar({
  filter,
  setFilter,
  reports,
  selectedCount,
  isReportSelected,
  toggleReportSelection,
  selectAllReports,
  areAllExpanded,
  toggleAllCategories,
  isScrolled,
}) {
  return (
    <div
      className={`flex gap-2 pb-3 overflow-x-auto -mx-5 px-5 sm:-mx-6 sm:px-6 sm:overflow-visible sticky top-[49px] z-10 bg-background py-2 ${isScrolled ? 'border-b' : ''}`}
    >
      <div className="flex rounded-lg border bg-card overflow-hidden text-xs font-medium h-8 flex-shrink-0">
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 sm:px-4 ${filter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('abnormal')}
          className={`px-2.5 sm:px-4 flex items-center gap-1 ${filter === 'abnormal' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:bg-accent'}`}
        >
          <AlertTriangle size={14} />
          Abnormal
        </button>
      </div>
      <ReportFilterDropdown
        reports={reports}
        selectedCount={selectedCount}
        isReportSelected={isReportSelected}
        toggleReportSelection={toggleReportSelection}
        selectAllReports={selectAllReports}
      />
      <button
        onClick={toggleAllCategories}
        className="flex items-center justify-center h-8 w-8 rounded-lg border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
        title={areAllExpanded ? 'Collapse all categories' : 'Expand all categories'}
      >
        {areAllExpanded ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
      </button>
    </div>
  );
}
