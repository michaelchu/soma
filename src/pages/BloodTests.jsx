import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { useReports } from './blood-tests/hooks/useReports';
import { useMetricFiltering } from './blood-tests/hooks/useMetricFiltering';
import { useCategoryCollapse } from './blood-tests/hooks/useCategoryCollapse';
import { REFERENCE_RANGES } from './blood-tests/constants/referenceRanges';
import { FilterToolbar } from './blood-tests/components/ui/FilterToolbar';
import { CategorySection } from './blood-tests/components/ui/CategorySection';
import { ReportImporter } from './blood-tests/components/modals/ReportImporter';
import { ExportModal } from './blood-tests/components/modals/ExportModal';

export default function BloodTests() {
  const navigate = useNavigate();
  const { reports, loading, error } = useReports();
  const [showImporter, setShowImporter] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const {
    filter,
    setFilter,
    filteredReports,
    sortedMetrics,
    isReportSelected,
    toggleReportSelection,
    selectAllReports,
    selectedCount,
  } = useMetricFiltering(reports);

  const {
    toggleCategory,
    toggleCategoryCharts,
    toggleAllCategories,
    isCategoryCollapsed,
    areCategoryChartsExpanded,
    areAllExpanded,
  } = useCategoryCollapse();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Group metrics by category
  const metricsByCategory = useMemo(() => {
    return sortedMetrics.reduce((acc, key) => {
      const category = REFERENCE_RANGES[key]?.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(key);
      return acc;
    }, {});
  }, [sortedMetrics]);

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
        </div>
      </div>
    );
  }

  const leftContent = (
    <button
      onClick={() => navigate('/')}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      title="Go to Home"
    >
      <Activity className="h-6 w-6 text-foreground" strokeWidth={2.5} />
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
        <Plus size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setShowExportModal(true)}
        title="Export Data"
      >
        <Download size={16} />
      </Button>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar leftContent={leftContent} rightContent={rightContent} />

      <main className="max-w-7xl mx-auto px-5 sm:px-6 pb-3 sm:pb-4">
        <div>
          <FilterToolbar
            filter={filter}
            setFilter={setFilter}
            reports={reports}
            selectedCount={selectedCount}
            isReportSelected={isReportSelected}
            toggleReportSelection={toggleReportSelection}
            selectAllReports={selectAllReports}
            areAllExpanded={areAllExpanded}
            toggleAllCategories={toggleAllCategories}
            isScrolled={isScrolled}
          />

          {sortedMetrics.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(metricsByCategory).map(([category, metrics]) => (
                <CategorySection
                  key={category}
                  category={category}
                  metrics={metrics}
                  reports={filteredReports}
                  isCollapsed={isCategoryCollapsed(category)}
                  chartsExpanded={areCategoryChartsExpanded(category)}
                  onToggleCollapse={() => toggleCategory(category)}
                  onToggleCharts={() => toggleCategoryCharts(category)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border p-8 text-center">
              <p className="text-muted-foreground">No metrics match your filters.</p>
            </div>
          )}
        </div>
      </main>

      {/* FAB Button - mobile only */}
      <button
        onClick={() => setShowImporter(true)}
        className="sm:hidden fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showImporter && <ReportImporter onClose={() => setShowImporter(false)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}
