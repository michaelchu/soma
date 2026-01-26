import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { CATEGORY_INFO } from '../../constants/categories';
import { MetricChart } from '../charts/MetricChart';

export function CategorySection({
  category,
  metrics,
  reports,
  isCollapsed,
  chartsExpanded,
  onToggleCollapse,
  onToggleCharts,
}) {
  const categoryInfo = CATEGORY_INFO[category] || { label: category };

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 hover:text-foreground transition-colors flex-1"
        >
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          />
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            {categoryInfo.label}
            <span className="text-sm font-normal text-muted-foreground">({metrics.length})</span>
          </h3>
        </button>
        {!isCollapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCharts();
            }}
            className="flex items-center justify-center h-7 w-7 rounded border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={chartsExpanded ? 'Collapse charts' : 'Expand charts'}
          >
            {chartsExpanded ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {metrics.map((key) => (
              <MetricChart
                key={key}
                metricKey={key}
                reports={reports}
                collapsed={!chartsExpanded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
