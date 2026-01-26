import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Download, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FabButton } from '@/components/ui/fab-button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { BPProvider, useBP } from './blood-pressure/context/BPContext';
import { BottomNav } from './blood-pressure/components/ui/BottomNav';
import { FilterBar, filterReadings } from './blood-pressure/components/ui/FilterBar';
import { ReadingsTab } from './blood-pressure/components/tabs/ReadingsTab';
import { StatisticsTab } from './blood-pressure/components/tabs/StatisticsTab';
import { ChartsTab } from './blood-pressure/components/tabs/ChartsTab';
import { ReadingForm } from './blood-pressure/components/modals/ReadingForm';
import { ExportModal } from './blood-pressure/components/modals/ExportModal';
import { SettingsModal } from './blood-pressure/components/modals/SettingsModal';
import { LatestReading } from './blood-pressure/components/ui/LatestReading';
import { calculateStats } from './blood-pressure/utils/bpHelpers';

const VALID_TABS = ['readings', 'statistics', 'charts'];

function BloodPressureContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { readings, loading, error } = useBP();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [timeOfDay, setTimeOfDay] = useState('all');

  // Get active tab from URL, default to 'readings'
  const tabParam = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'readings';

  const setActiveTab = (tab) => {
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading blood pressure readings...</p>
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
            Error loading readings
          </p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
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
    <div className="min-h-screen flex flex-col bg-background pb-14 md:pb-0">
      <Navbar
        leftContent={
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Home"
          >
            <Activity className="h-6 w-6 text-foreground" strokeWidth={2.5} />
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
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-6 pt-4 pb-0 md:pb-4">
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
            {/* Filter Bar */}
            <div className="sticky top-[49px] z-10 bg-background pb-4 mb-0 md:mb-4 -mx-5 sm:-mx-6 md:mx-0 px-5 sm:px-6 md:px-0 border-b -mt-4 pt-4">
              <FilterBar
                dateRange={dateRange}
                timeOfDay={timeOfDay}
                onDateRangeChange={setDateRange}
                onTimeOfDayChange={setTimeOfDay}
              />
            </div>

            {/* Mobile: Tab-based view with scrollable content */}
            <div className="md:hidden">{renderMobileTabContent()}</div>

            {/* Desktop: Full card layout */}
            <div className="hidden md:block space-y-6">
              {/* Latest Reading & Stats - side by side */}
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-lg border bg-card shadow-sm p-6">
                  <LatestReading readings={filteredReadings} />
                </div>
                <div className="rounded-lg border bg-card shadow-sm p-6">
                  <h3 className="text-base font-semibold mb-4">Statistics</h3>
                  {(() => {
                    const stats = calculateStats(filteredReadings);
                    if (!stats) return <p className="text-muted-foreground">No data</p>;
                    return (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Average</p>
                          <p className="text-lg font-semibold">
                            {stats.avgSystolic}/{stats.avgDiastolic}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Readings</p>
                          <p className="text-lg font-semibold">{stats.count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Systolic Range</p>
                          <p className="font-medium">
                            {stats.minSystolic} - {stats.maxSystolic}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Diastolic Range</p>
                          <p className="font-medium">
                            {stats.minDiastolic} - {stats.maxDiastolic}
                          </p>
                        </div>
                        {stats.avgPulse && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Average Pulse</p>
                            <p className="font-medium">{stats.avgPulse} bpm</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Charts Section */}
              <div className="rounded-lg border bg-card shadow-sm p-6">
                <ChartsTab readings={filteredReadings} dateRange={dateRange} />
              </div>

              {/* Readings Table */}
              <ReadingsTab readings={filteredReadings} />
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
