import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Download } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { PageLoading, PageError } from '@/components/shared/PageStates';
import { DashboardProvider, useDashboard } from './dashboard/context/DashboardContext';
import { PeriodSelector } from './dashboard/components/PeriodSelector';
import { HealthScoreGauge } from './dashboard/components/HealthScoreGauge';
import { KeyMetrics } from './dashboard/components/KeyMetrics';
import { Insights } from './dashboard/components/Insights';
import { Timeline } from './dashboard/components/Timeline';
import { ExportModal } from './dashboard/components/ExportModal';

function DashboardContent() {
  const navigate = useNavigate();
  const { loading, error, bpReadings, sleepEntries, bloodTestReports, periodDays } = useDashboard();
  const [showExport, setShowExport] = useState(false);

  const hasData = bpReadings.length > 0 || sleepEntries.length > 0 || bloodTestReports.length > 0;

  if (loading) {
    return <PageLoading icon={Activity} message="Loading dashboard..." />;
  }

  if (error) {
    return <PageError title="Error loading dashboard" message={error} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
          hasData && (
            <Button
              onClick={() => setShowExport(true)}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Export Data"
            >
              <Download className="h-5 w-5" />
            </Button>
          )
        }
      />

      {/* Sticky toolbar with period selector */}
      <div className="sticky top-[49px] z-10 bg-background border-b -mt-4 pt-2 pb-2">
        <div className="max-w-2xl mx-auto w-full px-5 sm:px-6 flex justify-center">
          <PeriodSelector />
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 space-y-8">
        {/* Health Score */}
        <section>
          <HealthScoreGauge />
        </section>

        {/* Key Metrics */}
        <section className="border-t border-b py-4">
          <KeyMetrics />
        </section>

        {/* Insights */}
        <section>
          <Insights />
        </section>

        {/* Timeline */}
        <section className="border-t pt-6">
          <Timeline />
        </section>
      </main>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          bpReadings={bpReadings}
          sleepEntries={sleepEntries}
          bloodTestReports={bloodTestReports}
          periodDays={periodDays}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
