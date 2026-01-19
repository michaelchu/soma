import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
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
import Navbar from '@/components/Navbar';
import { useReports } from './blood-tests/hooks/useReports';
import { REFERENCE_RANGES } from './blood-tests/constants/referenceRanges';
import { CATEGORY_INFO } from './blood-tests/constants/categories';
import { getStatus } from './blood-tests/utils/statusHelpers';
import { MetricChart } from './blood-tests/components/charts/MetricChart';
import { ReportImporter } from './blood-tests/components/modals/ReportImporter';
import { ExportModal } from './blood-tests/components/modals/ExportModal';

export default function BloodTests({ onLogout }) {
  const navigate = useNavigate();
  const { reports, loading, error } = useReports();
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
  // Track which categories have their charts expanded (default all collapsed)
  const [expandedChartCategories, setExpandedChartCategories] = useState({});
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const leftContent = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
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
    </>
  );

  const rightContent = (
    <>
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
        variant="outline"
        size="sm"
        onClick={() => setShowExportModal(true)}
        className="hidden sm:flex items-center gap-2"
        title="Export Data"
      >
        <Download size={16} />
        Export
      </Button>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar leftContent={leftContent} rightContent={rightContent} onLogout={onLogout} />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 pb-3 sm:pb-4">
        <div>
          <div
            className={`flex gap-2 pb-3 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible sticky top-[49px] z-10 bg-background py-2 ${isScrolled ? 'border-b' : ''}`}
          >
            <div className="flex rounded-lg border bg-card overflow-hidden text-xs h-8 flex-shrink-0">
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
            <button
              onClick={() => {
                // Check if all categories are currently expanded
                const allExpanded = Object.values(collapsedCategories).every((v) => !v);
                const newState = {};
                Object.keys(CATEGORY_INFO).forEach((key) => {
                  newState[key] = allExpanded; // collapse all if all expanded, expand all otherwise
                });
                setCollapsedCategories(newState);
              }}
              className="flex items-center justify-center h-8 w-8 rounded-lg border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
              title={
                Object.values(collapsedCategories).every((v) => !v)
                  ? 'Collapse all categories'
                  : 'Expand all categories'
              }
            >
              {Object.values(collapsedCategories).every((v) => !v) ? (
                <ChevronsDownUp size={16} />
              ) : (
                <ChevronsUpDown size={16} />
              )}
            </button>
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
                const chartsExpanded = expandedChartCategories[category] ?? false;
                return (
                  <div key={category} className="bg-card rounded-xl border overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
                      <button
                        onClick={() =>
                          setCollapsedCategories((prev) => ({
                            ...prev,
                            [category]: !prev[category],
                          }))
                        }
                        className="flex items-center gap-2 hover:text-foreground transition-colors flex-1"
                      >
                        <ChevronDown
                          size={18}
                          className={`text-muted-foreground transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                        />
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          {categoryInfo.label}
                          <span className="text-sm font-normal text-muted-foreground">
                            ({metrics.length})
                          </span>
                        </h3>
                      </button>
                      {!isCollapsed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedChartCategories((prev) => ({
                              ...prev,
                              [category]: !prev[category],
                            }));
                          }}
                          className="flex items-center justify-center h-7 w-7 rounded border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title={chartsExpanded ? 'Collapse charts' : 'Expand charts'}
                        >
                          {chartsExpanded ? (
                            <ChevronsDownUp size={14} />
                          ) : (
                            <ChevronsUpDown size={14} />
                          )}
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
                              reports={filteredReports}
                              collapsed={!chartsExpanded}
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

      {showImporter && <ReportImporter onClose={() => setShowImporter(false)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}
