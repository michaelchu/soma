import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Moon, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FabButton } from '@/components/ui/fab-button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { SleepProvider, useSleep } from './sleep/context/SleepContext';
import { BottomNav } from './sleep/components/ui/BottomNav';
import { FilterBar, filterEntries } from './sleep/components/ui/FilterBar';
import { ReadingsTab } from './sleep/components/tabs/ReadingsTab';
import { StatisticsTab } from './sleep/components/tabs/StatisticsTab';
import { ChartsTab } from './sleep/components/tabs/ChartsTab';
import { SleepEntryForm } from './sleep/components/modals/SleepEntryForm';
import { LatestEntry } from './sleep/components/ui/LatestEntry';
import { calculateSleepStats } from './sleep/utils/sleepHelpers';

const VALID_TABS = ['readings', 'statistics', 'charts'];

function SleepContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entries, loading, error } = useSleep();
  const [showForm, setShowForm] = useState(false);
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Moon className="animate-pulse text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading sleep data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-600 dark:text-red-400 mx-auto mb-4" size={32} />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
            Error loading sleep data
          </p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const renderMobileTabContent = () => {
    switch (activeTab) {
      case 'readings':
        return <ReadingsTab entries={filteredEntries} />;
      case 'statistics':
        return (
          <StatisticsTab entries={filteredEntries} allEntries={entries} dateRange={dateRange} />
        );
      case 'charts':
        return <ChartsTab entries={filteredEntries} />;
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
            <div className="sticky top-[49px] z-10 bg-background pb-4 mb-0 md:mb-4 -mx-5 sm:-mx-6 md:mx-0 px-5 sm:px-6 md:px-0 border-b -mt-4 pt-4">
              <FilterBar dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>

            {/* Mobile: Tab-based view with scrollable content */}
            <div className="md:hidden pt-4">{renderMobileTabContent()}</div>

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

              {/* Charts Section */}
              <div className="rounded-lg border bg-card shadow-sm p-6">
                <ChartsTab entries={filteredEntries} />
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
