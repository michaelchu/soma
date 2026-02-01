import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Activity, Download, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FabButton } from '@/components/ui/fab-button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { PageLoading, PageError } from '@/components/shared/PageStates';
import { BPProvider, useBloodPressure } from './blood-pressure/context/BPContext';
import { BottomNav } from './blood-pressure/components/ui/BottomNav';
import { FilterBar, filterReadings } from './blood-pressure/components/ui/FilterBar';
import { ReadingsTab } from './blood-pressure/components/tabs/ReadingsTab';
import { StatisticsTab } from './blood-pressure/components/tabs/StatisticsTab';
import { ChartsTab } from './blood-pressure/components/tabs/ChartsTab';
import { DesktopBPView } from './blood-pressure/components/desktop/DesktopBPView';
import { ReadingForm } from './blood-pressure/components/modals/ReadingForm';
import { ExportModal } from './blood-pressure/components/modals/ExportModal';
import { SettingsModal } from './blood-pressure/components/modals/SettingsModal';
import type { TimeOfDay } from '@/types/bloodPressure';

const VALID_TABS = ['readings', 'statistics', 'charts'];

function BloodPressureContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { readings, loading, error } = useBloodPressure();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | 'all'>('all');

  // Get active tab from URL, default to 'readings'
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'readings';

  const setActiveTab = (tab: string) => {
    if (tab === 'readings') {
      // Remove tab param for default tab to keep URL clean
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const filteredReadings = useMemo(
    () => filterReadings(readings, dateRange, timeOfDay),
    [readings, dateRange, timeOfDay]
  );

  if (loading) {
    return (
      <PageLoading
        icon={Activity}
        message="Loading blood pressure readings..."
        iconAnimation="spin"
      />
    );
  }

  if (error) {
    return <PageError title="Error loading readings" message={error} />;
  }

  const renderMobileTabContent = () => {
    switch (activeTab) {
      case 'readings':
        return <ReadingsTab readings={filteredReadings} />;
      case 'statistics':
        return (
          <StatisticsTab
            readings={filteredReadings}
            allReadings={readings}
            dateRange={dateRange}
            timeOfDay={timeOfDay}
          />
        );
      case 'charts':
        return <ChartsTab readings={filteredReadings} dateRange={dateRange} />;
      default:
        return <ReadingsTab readings={filteredReadings} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-bp pb-14 md:pb-0">
      <Navbar
        leftContent={
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Home"
          >
            <Activity className="h-6 w-6 text-bp" strokeWidth={2.5} />
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
              title="Add Reading"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setShowExport(true)}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Export Data"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setShowSettings(true)}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </>
        }
        bottomContent={
          readings.length > 0 ? (
            <FilterBar
              dateRange={dateRange}
              timeOfDay={timeOfDay}
              onDateRangeChange={setDateRange}
              onTimeOfDayChange={setTimeOfDay}
            />
          ) : undefined
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-6 pb-0 md:pb-4">
        {readings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No blood pressure readings yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Reading
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: Tab-based view with scrollable content */}
            <div className="md:hidden">{renderMobileTabContent()}</div>

            {/* Desktop: Full card layout */}
            <div className="hidden md:block">
              <DesktopBPView
                readings={filteredReadings}
                allReadings={readings}
                dateRange={dateRange}
                timeOfDay={timeOfDay}
              />
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

      {/* Add Reading Modal */}
      <ReadingForm open={showForm} onOpenChange={setShowForm} />

      {/* Export Modal */}
      {showExport && (
        <ExportModal readings={filteredReadings} onClose={() => setShowExport(false)} />
      )}

      {/* Settings Modal */}
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}

export default function BloodPressure() {
  return (
    <BPProvider>
      <BloodPressureContent />
    </BPProvider>
  );
}
