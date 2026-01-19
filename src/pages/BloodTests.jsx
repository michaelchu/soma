import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  AlertTriangle,
  Calendar,
  Plus,
  Download,
  ArrowLeft,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useReports } from './blood-tests/hooks/useReports';
import { REFERENCE_RANGES } from './blood-tests/constants/referenceRanges';
import { CATEGORY_INFO } from './blood-tests/constants/categories';
import { getStatus } from './blood-tests/utils/statusHelpers';
import { MetricChart } from './blood-tests/components/charts/MetricChart';
import { ReferenceRangePanel } from './blood-tests/components/modals/ReferenceRangePanel';
import { ReportImporter } from './blood-tests/components/modals/ReportImporter';
import { ExportModal } from './blood-tests/components/modals/ExportModal';
// import { AISummary } from './blood-tests/components/analysis/AISummary';
import { HistoricalAbnormalTable } from './blood-tests/components/analysis/HistoricalAbnormalTable';

export default function BloodTests() {
  const navigate = useNavigate();
  const { reports, loading, error } = useReports();
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filter, setFilter] = useState('all');
  // Initialize all categories collapsed except 'cbc' (Complete Blood Count)
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const initial = {};
    Object.keys(CATEGORY_INFO).forEach((key) => {
      initial[key] = key !== 'cbc';
    });
    return initial;
  });
  const [selectedReportIds, setSelectedReportIds] = useState(null); // null = all selected
  const [allExpanded, setAllExpanded] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading blood test reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-600 dark:text-red-400 mx-auto mb-4" size={32} />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Error loading reports</p>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-4">
            Check that src/pages/blood-tests/data/reports.md exists and is properly formatted
          </p>
        </div>
      </div>
    );
  }

  const allMetrics = new Set();
  reports.forEach((r) => Object.keys(r.metrics).forEach((k) => allMetrics.add(k)));

  const sortedReports = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter reports based on checkbox selection
  const filteredReports =
    selectedReportIds === null ? reports : reports.filter((r) => selectedReportIds.has(r.id));

  const isReportSelected = (reportId) =>
    selectedReportIds === null || selectedReportIds.has(reportId);

  const toggleReportSelection = (reportId) => {
    setSelectedReportIds((prev) => {
      if (prev === null) {
        // First uncheck: create Set with all IDs except this one
        const allIds = new Set(reports.map((r) => r.id));
        allIds.delete(reportId);
        return allIds;
      }
      const next = new Set(prev);
      if (next.has(reportId)) {
        // Don't allow unchecking the last report
        if (next.size === 1) {
          return prev;
        }
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      // If all are selected again, return to null state
      if (next.size === reports.length) {
        return null;
      }
      return next;
    });
  };

  const selectAllReports = () => setSelectedReportIds(null);
  const selectedCount = selectedReportIds === null ? reports.length : selectedReportIds.size;

  const filteredMetrics = Array.from(allMetrics).filter((key) => {
    const ref = REFERENCE_RANGES[key];
    if (!ref) return false;
    const reportsWithMetric = filteredReports.filter((r) => r.metrics[key]);
    if (reportsWithMetric.length === 0) return false;
    if (filter === 'abnormal')
      return reportsWithMetric.some((r) => {
        const metric = r.metrics[key];
        return getStatus(metric.value, metric.min, metric.max) !== 'normal';
      });
    return true;
  });

  // Always sort by category, then by name within category
  const sortedMetrics = filteredMetrics.sort((a, b) => {
    const refA = REFERENCE_RANGES[a],
      refB = REFERENCE_RANGES[b];
    const catCompare = (refA?.category || '').localeCompare(refB?.category || '');
    if (catCompare !== 0) return catCompare;
    return (refA?.name || '').localeCompare(refB?.name || '');
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <Activity className="text-white" size={16} />
              </div>
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
                Blood Tests
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Desktop: Show all buttons */}
              <Button
                size="sm"
                onClick={() => setShowImporter(true)}
                className="hidden sm:flex items-center gap-2"
                title="Add New Report"
              >
                <Plus size={16} />
                Add Report
              </Button>
              <Button
                size="sm"
                onClick={() => setShowExportModal(true)}
                className="hidden sm:flex items-center gap-2"
                title="Export Data"
              >
                <Download size={16} />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefPanel(true)}
                className="hidden sm:flex items-center gap-2"
                title="Reference Ranges"
              >
                <BookOpen size={16} />
                Ranges
              </Button>

              {/* Reports dropdown - visible on all sizes */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 sm:gap-2"
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
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Select Reports</span>
                    <button
                      onClick={selectAllReports}
                      className="text-xs text-primary hover:underline"
                    >
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

              {/* Mobile: Hamburger menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="sm:hidden h-8 w-8">
                    <Menu size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowImporter(true)}>
                    <Plus size={16} />
                    Add Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowExportModal(true)}>
                    <Download size={16} />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRefPanel(true)}>
                    <BookOpen size={16} />
                    Reference Ranges
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
            <div className="flex rounded-lg border bg-card overflow-hidden text-xs sm:text-sm h-8 sm:h-9 flex-shrink-0">
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
                <span className="hidden sm:inline">Ever </span>Abnormal
              </button>
            </div>
            <button
              onClick={() => setAllExpanded(!allExpanded)}
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
              title={allExpanded ? 'Collapse all' : 'Expand all'}
            >
              {allExpanded ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
            </button>
            <span className="hidden sm:inline text-sm text-muted-foreground self-center ml-auto flex-shrink-0">
              {sortedMetrics.length} of {allMetrics.size} metrics
            </span>
          </div>

          {/* Historical Abnormals - below filter bar */}
          <div className="mb-4">
            <HistoricalAbnormalTable reports={filteredReports} />
          </div>

          {sortedMetrics.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(
                sortedMetrics.reduce((acc, key) => {
                  const category = REFERENCE_RANGES[key]?.category || 'other';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(key);
                  return acc;
                }, {})
              ).map(([category, metrics]) => {
                const categoryInfo = CATEGORY_INFO[category] || { label: category };
                const isCollapsed = collapsedCategories[category] ?? true;
                return (
                  <div key={category} className="bg-card rounded-xl border overflow-hidden">
                    <button
                      onClick={() =>
                        setCollapsedCategories((prev) => ({
                          ...prev,
                          [category]: !prev[category],
                        }))
                      }
                      className="w-full px-4 py-3 bg-muted/50 flex items-center justify-between hover:bg-muted transition-colors"
                    >
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {categoryInfo.label}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({metrics.length})
                        </span>
                      </h3>
                      <ChevronDown
                        size={18}
                        className={`text-muted-foreground transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                    </button>
                    {!isCollapsed && (
                      <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {metrics.map((key) => (
                            <MetricChart
                              key={`${key}-${allExpanded}`}
                              metricKey={key}
                              reports={filteredReports}
                              defaultCollapsed={!allExpanded}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-xl border p-8 text-center">
              <p className="text-muted-foreground">No metrics match your filters.</p>
            </div>
          )}
        </div>
      </main>

      {showRefPanel && <ReferenceRangePanel onClose={() => setShowRefPanel(false)} />}
      {showImporter && <ReportImporter onClose={() => setShowImporter(false)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}
