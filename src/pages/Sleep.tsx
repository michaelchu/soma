import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Moon, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FabButton } from '@/components/ui/fab-button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { PageLoading, PageError } from '@/components/shared/PageStates';
import { SleepProvider, useSleep } from './sleep/context/SleepContext';
import { BottomNav } from './sleep/components/ui/BottomNav';
import { FilterBar, filterEntries } from './sleep/components/ui/FilterBar';
import { ReadingsTab } from './sleep/components/tabs/ReadingsTab';
import { DetailsTab } from './sleep/components/tabs/DetailsTab';
import { StatisticsTab } from './sleep/components/tabs/StatisticsTab';
import { SleepEntryForm } from './sleep/components/modals/SleepEntryForm';
import { ExportModal } from './sleep/components/modals/ExportModal';
import { LatestEntry } from './sleep/components/ui/LatestEntry';
import { calculateSleepStats } from './sleep/utils/sleepHelpers';

const VALID_TABS = ['readings', 'details', 'statistics'];

function SleepContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entries, loading, error } = useSleep();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [dateRange, setDateRange] = useState('30');

  // Get active tab from URL, default to 'readings'
  const tabParam = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'readings';

  const setActiveTab = (tab: string) => {
    if (tab === 'readings') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const filteredEntries = useMemo(() => filterEntries(entries, dateRange), [entries, dateRange]);

  if (loading) {
    return <PageLoading icon={Moon} message="Loading sleep data..." />;
  }

  if (error) {
    return <PageError title="Error loading sleep data" message={error} />;
  }

  const renderMobileTabContent = () => {
    switch (activeTab) {
      case 'readings':
        return <ReadingsTab entries={filteredEntries} />;
      case 'details':
        return <DetailsTab entries={filteredEntries} allEntries={entries} dateRange={dateRange} />;
      case 'statistics':
        return (
          <StatisticsTab entries={filteredEntries} allEntries={entries} dateRange={dateRange} />
        );
      default:
        return <ReadingsTab entries={filteredEntries} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-14 md:pb-0">
      <Navbar
        leftContent={
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Home"
          >
            <Moon className="h-6 w-6 text-foreground" strokeWidth={2.5} />
            <span className="text-xl font-bold">Soma</span>
          </button>
        }
        rightContent={
          <>
            {entries.length > 0 && (
              <Button
                onClick={() => setShowExport(true)}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Export Data"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            <Button
              onClick={() => setShowForm(true)}
              size="icon"
              variant="ghost"
              className="hidden md:flex h-8 w-8"
              title="Add Entry"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-6 pt-4 pb-0 md:pb-4">
        {entries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No sleep entries yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="sticky top-[49px] z-10 bg-background pb-2 mb-0 md:mb-4 -mx-5 sm:-mx-6 md:mx-0 px-5 sm:px-6 md:px-0 border-b -mt-4 pt-2">
              <FilterBar dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>

            {/* Mobile: Tab-based view with scrollable content */}
            <div className={`md:hidden ${activeTab !== 'readings' ? 'pt-4' : ''}`}>
              {renderMobileTabContent()}
            </div>

            {/* Desktop: Full card layout */}
            <div className="hidden md:block space-y-6">
              {/* Latest Entry & Stats - side by side */}
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-lg border bg-card shadow-sm p-6">
                  <LatestEntry entries={filteredEntries} />
                </div>
                <div className="rounded-lg border bg-card shadow-sm p-6">
                  <h3 className="text-base font-semibold mb-4">Statistics</h3>
                  {(() => {
                    const stats = calculateSleepStats(filteredEntries);
                    if (!stats) return <p className="text-muted-foreground">No data</p>;
                    return (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Entries</p>
                          <p className="text-lg font-semibold">{stats.count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Duration</p>
                          <p className="text-lg font-semibold">
                            {Math.floor(stats.avgDuration / 60)}h {stats.avgDuration % 60}m
                          </p>
                        </div>
                        {stats.avgRestingHr !== null && (
                          <div>
                            <p className="text-muted-foreground">Avg Resting HR</p>
                            <p className="font-medium">{stats.avgRestingHr} bpm</p>
                          </div>
                        )}
                        {stats.avgDeepPct !== null && stats.avgRemPct !== null && (
                          <div>
                            <p className="text-muted-foreground">Avg Restorative</p>
                            <p className="font-medium">{stats.avgDeepPct + stats.avgRemPct}%</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Readings Table */}
              <ReadingsTab entries={filteredEntries} />
            </div>
          </>
        )}
      </main>

      {/* FAB Button - mobile only, readings tab only */}
      {activeTab === 'readings' && <FabButton onClick={() => setShowForm(true)} />}

      {/* Bottom Navigation - mobile only */}
      <div className="md:hidden">
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Add Entry Modal */}
      <SleepEntryForm open={showForm} onOpenChange={setShowForm} />

      {/* Export Modal */}
      {showExport && <ExportModal entries={filteredEntries} onClose={() => setShowExport(false)} />}
    </div>
  );
}

export default function Sleep() {
  return (
    <SleepProvider>
      <SleepContent />
    </SleepProvider>
  );
}
