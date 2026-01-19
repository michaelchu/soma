import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  AlertTriangle,
  FileText,
  Plus,
  Download,
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [collapsedCategories, setCollapsedCategories] = useState({});

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
  const latestReport = sortedReports[0];

  const filteredMetrics = Array.from(allMetrics).filter((key) => {
    const ref = REFERENCE_RANGES[key];
    if (!ref) return false;
    const reportsWithMetric = reports.filter((r) => r.metrics[key]);
    if (reportsWithMetric.length === 0) return false;
    if (selectedCategory !== 'all' && ref.category !== selectedCategory) return false;
    if (filter === 'abnormal')
      return reportsWithMetric.some((r) => {
        const metric = r.metrics[key];
        return getStatus(metric.value, metric.min, metric.max) !== 'normal';
      });
    return true;
  });

  const sortedMetrics = filteredMetrics.sort((a, b) => {
    const refA = REFERENCE_RANGES[a],
      refB = REFERENCE_RANGES[b];
    const aLatestReport = [...reports.filter((r) => r.metrics[a])].sort(
      (x, y) => new Date(y.date) - new Date(x.date)
    )[0];
    const bLatestReport = [...reports.filter((r) => r.metrics[b])].sort(
      (x, y) => new Date(y.date) - new Date(x.date)
    )[0];
    const aLatest = aLatestReport?.metrics[a];
    const bLatest = bLatestReport?.metrics[b];
    const aStatus = aLatest ? getStatus(aLatest.value, aLatest.min, aLatest.max) : 'normal';
    const bStatus = bLatest ? getStatus(bLatest.value, bLatest.min, bLatest.max) : 'normal';
    const aDate = aLatestReport ? new Date(aLatestReport.date) : new Date(0);
    const bDate = bLatestReport ? new Date(bLatestReport.date) : new Date(0);

    switch (sortBy) {
      case 'priority':
        // Abnormal first, then by date, then by category
        if (aStatus !== 'normal' && bStatus === 'normal') return -1;
        if (aStatus === 'normal' && bStatus !== 'normal') return 1;
        if (aDate.getTime() !== bDate.getTime()) return bDate - aDate;
        return (refA?.category || '').localeCompare(refB?.category || '');
      case 'category':
        // Group by category, then by name
        const catCompare = (refA?.category || '').localeCompare(refB?.category || '');
        if (catCompare !== 0) return catCompare;
        return (refA?.name || '').localeCompare(refB?.name || '');
      case 'name':
        // Alphabetical by metric name
        return (refA?.name || '').localeCompare(refB?.name || '');
      default:
        return 0;
    }
  });

  const currentAbnormalCount = latestReport
    ? Object.entries(latestReport.metrics).filter(([key, m]) => {
        const ref = REFERENCE_RANGES[key];
        return ref && getStatus(m.value, m.min, m.max) !== 'normal';
      }).length
    : 0;

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
              <Button
                size="sm"
                onClick={() => setShowImporter(true)}
                className="flex items-center gap-1 sm:gap-2"
                title="Add New Report"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Report</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1 sm:gap-2"
                title="Export Data"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefPanel(true)}
                className="flex items-center gap-1 sm:gap-2"
                title="Reference Ranges"
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline">Ranges</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Mobile: Overview summary bar */}
          <div className="lg:hidden bg-card rounded-xl p-3 border">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Reports:</span>{' '}
                  <span className="font-semibold">{reports.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Latest:</span>{' '}
                  <span className="font-semibold">
                    {latestReport
                      ? new Date(latestReport.date).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
              <div
                className={`font-semibold ${currentAbnormalCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}
              >
                {currentAbnormalCount > 0 ? `${currentAbnormalCount} flagged` : '✓ Normal'}
              </div>
            </div>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <div className="bg-card rounded-xl p-4 border">
              <h3 className="font-semibold text-foreground mb-3">Overview</h3>
              {latestReport && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Latest</span>
                    <span className="text-sm font-medium">
                      {new Date(latestReport.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tests</span>
                    <span className="text-sm font-medium">
                      {Object.keys(latestReport.metrics).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Abnormal</span>
                    <span
                      className={`text-sm font-medium ${currentAbnormalCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}
                    >
                      {currentAbnormalCount > 0 ? `${currentAbnormalCount} flagged` : 'All normal'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl p-4 border">
              <h3 className="font-semibold text-foreground mb-3">Reports ({reports.length})</h3>
              <div className="space-y-1">
                {sortedReports.map((report) => {
                  const abnormalCount = Object.entries(report.metrics).filter(([key, m]) => {
                    const ref = REFERENCE_RANGES[key];
                    return ref && getStatus(m.value, m.min, m.max) !== 'normal';
                  }).length;
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-lg group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(report.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Object.keys(report.metrics).length} tests{' '}
                            {abnormalCount > 0 && (
                              <span className="text-amber-500">· {abnormalCount} ⚠</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                To add or edit reports, update{' '}
                <code className="bg-muted px-1 rounded">reports.md</code>
              </div>
            </div>

            {/* <AISummary reports={reports} /> */}
          </div>

          <div className="lg:col-span-3">
            {/* Mobile: AI Summary above charts */}
            {/* <div className="lg:hidden mb-4">
              <AISummary reports={reports} />
            </div> */}

            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
              <div className="flex rounded-lg border bg-card overflow-hidden text-xs sm:text-sm">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 sm:px-4 py-2 ${filter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('abnormal')}
                  className={`px-3 sm:px-4 py-2 flex items-center gap-1 ${filter === 'abnormal' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  <AlertTriangle size={14} />
                  <span className="hidden xs:inline">Ever </span>Abnormal
                </button>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] text-xs sm:text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] text-xs sm:text-sm">
                  <ArrowUpDown size={14} className="mr-1" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
              <span className="hidden sm:inline text-sm text-muted-foreground self-center ml-auto">
                {sortedMetrics.length} of {allMetrics.size} metrics
              </span>
            </div>

            {/* Historical Abnormals - below filter bar */}
            <div className="mb-4">
              <HistoricalAbnormalTable reports={reports} />
            </div>

            {sortedMetrics.length > 0 ? (
              sortBy === 'category' ? (
                // Group by category with collapsible sections
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
                    const isCollapsed = collapsedCategories[category] ?? false;
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
                                <MetricChart key={key} metricKey={key} reports={reports} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Regular grid layout
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {sortedMetrics.map((key) => (
                    <MetricChart key={key} metricKey={key} reports={reports} />
                  ))}
                </div>
              )
            ) : (
              <div className="bg-card rounded-xl border p-8 text-center">
                <p className="text-muted-foreground">No metrics match your filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showRefPanel && <ReferenceRangePanel onClose={() => setShowRefPanel(false)} />}
      {showImporter && <ReportImporter onClose={() => setShowImporter(false)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}
