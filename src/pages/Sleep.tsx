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
import { DetailsTab } from './sleep/components/tabs/DetailsTab';
import { StatisticsTab } from './sleep/components/tabs/StatisticsTab';
import { SleepEntryForm } from './sleep/components/modals/SleepEntryForm';
import { ExportModal } from './sleep/components/modals/ExportModal';
import { DesktopSleepView } from './sleep/components/desktop/DesktopSleepView';

const VALID_TABS = ['details', 'statistics'];

function SleepContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entries, loading, error } = useSleep();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [dateRange, setDateRange] = useState('1m');

  // Get active tab from URL, default to 'details'
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'details';

  const setActiveTab = (tab: string) => {
    if (tab === 'details') {
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
      case 'details':
        return <DetailsTab entries={filteredEntries} allEntries={entries} dateRange={dateRange} />;
      case 'statistics':
        return (
          <StatisticsTab entries={filteredEntries} allEntries={entries} dateRange={dateRange} />
        );
      default:
        return <DetailsTab entries={filteredEntries} allEntries={entries} dateRange={dateRange} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-sleep pb-14 md:pb-0">
      <Navbar
        leftContent={
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Home"
          >
            <Moon className="h-6 w-6 text-sleep" strokeWidth={2.5} />
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
        bottomContent={
          entries.length > 0 ? (
            <FilterBar dateRange={dateRange} onDateRangeChange={setDateRange} />
          ) : undefined
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-6 pb-0 md:pb-4">
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
            {/* Mobile: Tab-based view with scrollable content */}
            <div className="md:hidden pt-4">
              {renderMobileTabContent()}
            </div>

            {/* Desktop view */}
            <div className="hidden md:block pt-4">
              <DesktopSleepView
                entries={filteredEntries}
                allEntries={entries}
                dateRange={dateRange}
              />
            </div>
          </>
        )}
      </main>

      {/* FAB Button - mobile only, details tab only */}
      {activeTab === 'details' && <FabButton onClick={() => setShowForm(true)} />}

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
