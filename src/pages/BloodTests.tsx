import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  AlertTriangle,
  Calendar,
  Download,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  EyeOff,
  Beaker,
  Plus,
  SearchX,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FabButton } from '@/components/ui/fab-button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import Navbar from '@/components/Navbar';
import { useReports } from './blood-tests/hooks/useReports';
import { REFERENCE_RANGES } from './blood-tests/constants/referenceRanges';
import { CATEGORY_INFO } from './blood-tests/constants/categories';
import { getStatus } from './blood-tests/utils/statusHelpers';
import { MetricChart } from './blood-tests/components/charts/MetricChart';
import { ReportImporter } from './blood-tests/components/modals/ReportImporter';
import { ExportModal } from './blood-tests/components/modals/ExportModal';
import { IgnoreMetricDialog } from './blood-tests/components/modals/IgnoreMetricDialog';
import { useIgnoredMetrics } from './blood-tests/hooks/useIgnoredMetrics';

export default function BloodTests() {
  const navigate = useNavigate();
  const { reports, loading, error } = useReports();
  const [showImporter, setShowImporter] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filter, setFilter] = useState('all');
  // Initialize all categories collapsed
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string> | null>(null); // null = all selected
  // Track which categories have their charts expanded (default all collapsed)
  const [expandedChartCategories, setExpandedChartCategories] = useState<Record<string, boolean>>(
    {}
  );
  const { ignoredMetrics, ignoreMetric, unignoreMetric, isIgnored } = useIgnoredMetrics();
  const [ignoreDialogState, setIgnoreDialogState] = useState<{
    open: boolean;
    metricKey: string | null;
    metricName: string;
    isIgnored: boolean;
  }>({
    open: false,
    metricKey: null,
    metricName: '',
    isIgnored: false,
  });
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const [expandedMobileMetric, setExpandedMobileMetric] = useState<string | null>(null); // Track individually expanded metric on mobile
  const dropdownTouchStartRef = useRef({ x: 0, y: 0 });
  const dropdownTouchMovedRef = useRef(false);

  const handleDropdownPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      // For touch, we'll handle opening manually via pointerUp
      e.preventDefault();
      dropdownTouchStartRef.current = { x: e.clientX, y: e.clientY };
      dropdownTouchMovedRef.current = false;
    }
  }, []);

  const handleDropdownPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && !dropdownTouchMovedRef.current) {
      const deltaX = Math.abs(e.clientX - dropdownTouchStartRef.current.x);
      const deltaY = Math.abs(e.clientY - dropdownTouchStartRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        dropdownTouchMovedRef.current = true;
      }
    }
  }, []);

  const handleDropdownPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      // Only open if user didn't scroll
      if (!dropdownTouchMovedRef.current) {
        setReportsDropdownOpen((prev) => !prev);
      }
      dropdownTouchMovedRef.current = false;
    }
  }, []);

  // Memoize expensive computations (must be before early returns)
  const allMetrics = useMemo(() => {
    if (!reports) return new Set<string>();
    const metrics = new Set<string>();
    reports.forEach((r) => Object.keys(r.metrics).forEach((k) => metrics.add(k)));
    return metrics;
  }, [reports]);

  const sortedReports = useMemo(
    () =>
      reports
        ? [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [],
    [reports]
  );

  // Filter reports based on checkbox selection
  const filteredReports = useMemo(
    () =>
      !reports
        ? []
        : selectedReportIds === null
          ? reports
          : reports.filter((r) => selectedReportIds.has(r.id)),
    [reports, selectedReportIds]
  );

  // Count ignored metrics that have data (memoized)
  const ignoredCount = useMemo(
    () =>
      Array.from(allMetrics).filter((key) => {
        const ref = REFERENCE_RANGES[key];
        if (!ref) return false;
        const reportsWithMetric = filteredReports.filter((r) => r.metrics[key]);
        if (reportsWithMetric.length === 0) return false;
        return isIgnored(key);
      }).length,
    [allMetrics, filteredReports, isIgnored]
  );

  // Filter and sort metrics (memoized)
  const sortedMetrics = useMemo(() => {
    const filtered = Array.from(allMetrics).filter((key) => {
      const ref = REFERENCE_RANGES[key];
      if (!ref) return false;
      const reportsWithMetric = filteredReports.filter((r) => r.metrics[key]);
      if (reportsWithMetric.length === 0) return false;

      const metricIsIgnored = isIgnored(key);

      // In "ignored" tab, only show ignored metrics
      if (filter === 'ignored') {
        return metricIsIgnored;
      }

      // In "all" and "abnormal" tabs, exclude ignored metrics
      if (metricIsIgnored) return false;

      if (filter === 'abnormal')
        return reportsWithMetric.some((r) => {
          const metric = r.metrics[key];
          return getStatus(metric.value, metric.reference?.min, metric.reference?.max) !== 'normal';
        });
      return true;
    });

    // Sort by category, then by name within category
    return filtered.sort((a, b) => {
      const refA = REFERENCE_RANGES[a],
        refB = REFERENCE_RANGES[b];
      const catCompare = (refA?.category || '').localeCompare(refB?.category || '');
      if (catCompare !== 0) return catCompare;
      return (refA?.name || '').localeCompare(refB?.name || '');
    });
  }, [allMetrics, filteredReports, filter, isIgnored]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-blood-tests flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading blood test reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-blood-tests flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-600 dark:text-red-400 mx-auto mb-4" size={32} />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Error loading reports</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const isReportSelected = (reportId: string) =>
    selectedReportIds === null || selectedReportIds.has(reportId);

  const toggleReportSelection = (reportId: string) => {
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

  const handleMetricLongPress = (metricKey: string) => {
    const ref = REFERENCE_RANGES[metricKey];
    setIgnoreDialogState({
      open: true,
      metricKey,
      metricName: ref?.name || metricKey,
      isIgnored: isIgnored(metricKey),
    });
  };

  const handleMetricTap = (metricKey: string) => {
    // Toggle expanded state for this metric on mobile
    setExpandedMobileMetric((prev) => (prev === metricKey ? null : metricKey));
  };

  const handleIgnoreConfirm = () => {
    if (!ignoreDialogState.metricKey) return;
    if (ignoreDialogState.isIgnored) {
      unignoreMetric(ignoreDialogState.metricKey);
    } else {
      ignoreMetric(ignoreDialogState.metricKey);
    }
  };

  const leftContent = (
    <button
      onClick={() => navigate('/')}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      title="Go to Home"
    >
      <FlaskConical className="h-6 w-6 text-blood-tests" strokeWidth={2.5} />
      <span className="text-xl font-bold">Soma</span>
    </button>
  );

  const rightContent = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hidden sm:flex"
        onClick={() => setShowImporter(true)}
        title="Add New Report"
      >
        <Plus size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setShowExportModal(true)}
        title="Export Data"
      >
        <Download size={20} />
      </Button>
    </>
  );

  const bottomContent = (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:-mx-6 sm:px-6 sm:overflow-visible">
      <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs font-medium h-8 flex-shrink-0">
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
        <button
          onClick={() => setFilter('ignored')}
          className={`px-2.5 sm:px-4 flex items-center gap-1 ${filter === 'ignored' ? 'bg-muted text-muted-foreground' : 'text-muted-foreground hover:bg-accent'}`}
        >
          <EyeOff size={14} />
          Ignored
          {ignoredCount > 0 && <span className="text-xs opacity-70">({ignoredCount})</span>}
        </button>
      </div>
      <button
        onClick={() => {
          const allExpanded = Object.keys(CATEGORY_INFO).every(
            (key) => collapsedCategories[key] === false
          );
          const newState: Record<string, boolean> = {};
          Object.keys(CATEGORY_INFO).forEach((key) => {
            newState[key] = allExpanded;
          });
          setCollapsedCategories(newState);
        }}
        className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors flex-shrink-0"
        title={
          Object.keys(CATEGORY_INFO).every((key) => collapsedCategories[key] === false)
            ? 'Collapse all categories'
            : 'Expand all categories'
        }
      >
        {Object.keys(CATEGORY_INFO).every((key) => collapsedCategories[key] === false) ? (
          <ChevronsDownUp size={16} />
        ) : (
          <ChevronsUpDown size={16} />
        )}
      </button>
      <DropdownMenu open={reportsDropdownOpen} onOpenChange={setReportsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 sm:gap-2 h-8 flex-shrink-0 border border-white/10"
            title="Select Reports"
            onPointerDown={handleDropdownPointerDown}
            onPointerMove={handleDropdownPointerMove}
            onPointerUp={handleDropdownPointerUp}
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
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-blood-tests">
      <Navbar leftContent={leftContent} rightContent={rightContent} bottomContent={bottomContent} />

      <main className="max-w-7xl mx-auto px-5 sm:px-6 pt-3 pb-3 sm:pb-4">
        <div>
          {sortedMetrics.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(
                sortedMetrics.reduce<Record<string, string[]>>((acc, key) => {
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
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {categoryInfo.label}
                          <span className="text-xs font-normal text-muted-foreground">
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
                            // Reset individual metric expansion when using category button
                            setExpandedMobileMetric(null);
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
                      <div className="md:p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
                          {metrics.map((key, index) => (
                            <div
                              key={key}
                              className={`py-3 px-4 md:p-0 ${index < metrics.length - 1 ? 'border-b md:border-b-0' : ''}`}
                            >
                              <MetricChart
                                metricKey={key}
                                reports={filteredReports}
                                collapsed={!chartsExpanded}
                                mobileExpanded={expandedMobileMetric === key}
                                onTap={handleMetricTap}
                                onLongPress={handleMetricLongPress}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-xl border p-12 text-center mt-3">
              {filter === 'ignored' ? (
                <>
                  <EyeOff className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium mb-2">No hidden metrics</p>
                  <p className="text-sm text-muted-foreground/70">
                    Long-press any metric card to hide it from view
                  </p>
                </>
              ) : filter === 'abnormal' ? (
                <>
                  <Beaker className="h-12 w-12 text-green-500/50 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium mb-2">All metrics are normal</p>
                  <p className="text-sm text-muted-foreground/70">
                    Great news! All your blood test values are within reference ranges
                  </p>
                </>
              ) : (
                <>
                  <SearchX className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium mb-2">No metrics found</p>
                  <p className="text-sm text-muted-foreground/70">
                    Import a blood test report to see your metrics here
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* FAB Button - mobile only */}
      <FabButton onClick={() => setShowImporter(true)} hideAbove="sm" className="bottom-4" />

      {showImporter && <ReportImporter onClose={() => setShowImporter(false)} />}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          reports={filteredReports}
          ignoredMetrics={ignoredMetrics}
        />
      )}
      <IgnoreMetricDialog
        open={ignoreDialogState.open}
        onOpenChange={(open: boolean) => setIgnoreDialogState((prev) => ({ ...prev, open }))}
        metricName={ignoreDialogState.metricName}
        isIgnored={ignoreDialogState.isIgnored}
        onConfirm={handleIgnoreConfirm}
      />
    </div>
  );
}
