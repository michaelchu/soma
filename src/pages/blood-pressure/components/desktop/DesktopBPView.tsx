import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BPTimeChart } from '../charts/BPTimeChart';
import { BPScatterChart } from '../charts/BPScatterChart';
import { ReadingsTab } from '../tabs/ReadingsTab';
import { calculateFullStats, getPreviousPeriodReadings } from '../../utils/bpHelpers';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';
import { useSettings } from '@/lib/SettingsContext';
import { BP_GUIDELINES, DEFAULT_GUIDELINE } from '../../constants/bpGuidelines';
import { ChangeIndicator, type ChangeConfig } from '@/components/shared/ChangeIndicator';
import type { TimeOfDay } from '@/types/bloodPressure';

interface BPSession {
  sessionId: string;
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  readingCount: number;
  readings: Array<{
    id: string;
    systolic: number;
    diastolic: number;
    arm: 'L' | 'R' | null;
    pulse?: number | null;
  }>;
}

interface DesktopBPViewProps {
  readings: BPSession[];
  allReadings: BPSession[];
  dateRange: string;
  timeOfDay: TimeOfDay | 'all';
}

interface StatValues {
  min: number | null;
  max: number | null;
  avg: number | null;
}

interface FullStats {
  systolic: StatValues;
  diastolic: StatValues;
  pulse: StatValues;
  pp: StatValues;
  map: StatValues;
  count: number;
}

interface NormalThresholds {
  systolic: number;
  diastolic: number;
}

function CompactStatsBar({
  readings,
  allReadings,
  dateRange,
  timeOfDay,
  isExpanded,
  onToggleExpand,
}: {
  readings: BPSession[];
  allReadings: BPSession[];
  dateRange: string;
  timeOfDay: TimeOfDay | 'all';
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { settings } = useSettings();

  // Get the normal thresholds from the selected guideline
  const normalThresholds = useMemo(() => {
    const guidelineKey = settings.bpGuideline || DEFAULT_GUIDELINE;
    const guideline = BP_GUIDELINES[guidelineKey];
    const thresholds = guideline?.thresholds || {};
    const normalCategory = thresholds.normal || thresholds.optimal || {};

    return {
      systolic: (normalCategory.systolic?.max ?? 119) + 1,
      diastolic: (normalCategory.diastolic?.max ?? 79) + 1,
    };
  }, [settings.bpGuideline]);

  const currentStats = useMemo(() => calculateFullStats(readings), [readings]);
  const previousReadings = useMemo(
    () => getPreviousPeriodReadings(allReadings, dateRange, timeOfDay),
    [allReadings, dateRange, timeOfDay]
  );
  const previousStats = useMemo(() => calculateFullStats(previousReadings), [previousReadings]);

  if (!currentStats) return null;

  const hasPulseData = currentStats.pulse?.avg != null;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Compact Stats Summary */}
      <div className="p-4 flex items-center gap-6">
        <div className="flex items-center gap-6 flex-1">
          {/* Entries count */}
          <div className="text-center">
            <p className="text-2xl font-bold">{currentStats.count}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">readings</p>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Avg BP */}
          <div className="text-center">
            <p className="text-2xl font-bold">
              {currentStats.systolic.avg != null ? Math.round(currentStats.systolic.avg) : '—'}/
              {currentStats.diastolic.avg != null ? Math.round(currentStats.diastolic.avg) : '—'}
              <span className="text-sm font-normal text-muted-foreground ml-1">mmHg</span>
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">avg BP</p>
          </div>

          {/* Avg Pulse */}
          {hasPulseData && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(currentStats.pulse.avg!)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">bpm</span>
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">avg pulse</p>
              </div>
            </>
          )}

          {/* Avg PP */}
          {currentStats.pp?.avg != null && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(currentStats.pp.avg)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">mmHg</span>
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">avg PP</p>
              </div>
            </>
          )}

          {/* Avg MAP */}
          {currentStats.map?.avg != null && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(currentStats.map.avg)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">mmHg</span>
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">avg MAP</p>
              </div>
            </>
          )}
        </div>

        {/* Expand button */}
        <div className="flex items-center">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Less</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Details</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Detailed Stats Table */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Detailed Statistics</h3>
              <DetailedStatsTable
                currentStats={currentStats}
                previousStats={previousStats}
                dateRange={dateRange}
                normalThresholds={normalThresholds}
              />
            </div>

            {/* Reference Ranges */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Reference Ranges</h3>
              <ReferenceRangesTable />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailedStatsTable({
  currentStats,
  previousStats,
  dateRange,
  normalThresholds,
}: {
  currentStats: FullStats | null;
  previousStats: FullStats | null;
  dateRange: string;
  normalThresholds: NormalThresholds;
}) {
  if (!currentStats) return null;

  const rows: Array<{
    label: string;
    key: keyof Omit<FullStats, 'count'>;
    unit: string;
    config: ChangeConfig;
  }> = [
    {
      label: 'Systolic',
      key: 'systolic',
      unit: 'mmHg',
      config: { type: 'lowerIsBetter', optimalMax: normalThresholds.systolic },
    },
    {
      label: 'Diastolic',
      key: 'diastolic',
      unit: 'mmHg',
      config: { type: 'lowerIsBetter', optimalMax: normalThresholds.diastolic },
    },
    {
      label: 'Pulse',
      key: 'pulse',
      unit: 'bpm',
      config: { type: 'midpoint', midpoint: 80, bufferMin: 70, bufferMax: 90 },
    },
    {
      label: 'PP',
      key: 'pp',
      unit: 'mmHg',
      config: { type: 'midpoint', midpoint: 45, bufferMin: 40, bufferMax: 50 },
    },
    {
      label: 'MAP',
      key: 'map',
      unit: 'mmHg',
      config: { type: 'midpoint', midpoint: 85, bufferMin: 80, bufferMax: 90 },
    },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          <th className="text-left py-2 pr-3 font-medium text-muted-foreground text-xs">Metric</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Min</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Max</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Avg</th>
          <th className="text-center py-2 pl-2 font-medium text-muted-foreground text-xs">
            vs Prev
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const current = currentStats[row.key] as StatValues | undefined;
          const previous = previousStats?.[row.key] as StatValues | undefined;

          // Skip pulse row if no pulse data
          if (row.key === 'pulse' && current?.avg === null) {
            return null;
          }

          if (!current || current.avg === null) return null;

          return (
            <tr key={row.key} className="border-b border-white/10 last:border-0">
              <td className="py-2 pr-3 font-medium text-xs">{row.label}</td>
              <td className="py-2 px-2 text-center font-mono text-xs">
                {current.min != null ? Math.round(current.min) : '—'}
              </td>
              <td className="py-2 px-2 text-center font-mono text-xs">
                {current.max != null ? Math.round(current.max) : '—'}
              </td>
              <td className="py-2 px-2 text-center font-mono font-semibold text-xs">
                {Math.round(current.avg)}
              </td>
              <td className="py-2 pl-2 text-center text-xs">
                <ChangeIndicator
                  current={current.avg}
                  previous={previous?.avg ?? null}
                  config={row.config}
                  disabled={dateRange === 'all'}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReferenceRangesTable() {
  const { guideline } = useBloodPressureSettings();

  // Get normal thresholds from the guideline
  const normalCategory = guideline?.thresholds?.normal || guideline?.thresholds?.optimal;
  const sysMax = normalCategory?.systolic?.max;
  const diaMax = normalCategory?.diastolic?.max;

  const ranges = [
    {
      metric: 'Systolic',
      range: sysMax != null ? `< ${sysMax + 1} mmHg` : '< 120 mmHg',
    },
    {
      metric: 'Diastolic',
      range: diaMax != null ? `< ${diaMax + 1} mmHg` : '< 80 mmHg',
    },
    { metric: 'Pulse (resting)', range: '60–100 bpm' },
    { metric: 'Pulse Pressure', range: '30–60 mmHg' },
    { metric: 'Mean Arterial Pressure', range: '70–100 mmHg' },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          <th className="text-left py-2 pr-3 font-medium text-muted-foreground text-xs">Metric</th>
          <th className="text-right py-2 pl-3 font-medium text-muted-foreground text-xs">
            Normal ({guideline?.name || 'AHA 2017'})
          </th>
        </tr>
      </thead>
      <tbody>
        {ranges.map((row) => (
          <tr key={row.metric} className="border-b border-white/10 last:border-0">
            <td className="py-2 pr-3 font-medium text-xs">{row.metric}</td>
            <td className="py-2 pl-3 text-right font-mono text-xs">{row.range}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DesktopBPView({ readings, allReadings, dateRange, timeOfDay }: DesktopBPViewProps) {
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [showTrendline, setShowTrendline] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showMAP, setShowMAP] = useState(false);

  if (readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No blood pressure readings in this period
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Charts Section - 2 columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Trend Over Time
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => setShowTrendline(!showTrendline)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                  showTrendline
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Trend
              </button>
              <button
                onClick={() => setShowMarkers(!showMarkers)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                  showMarkers
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Markers
              </button>
              <button
                onClick={() => setShowMAP(!showMAP)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                  showMAP
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                MAP
              </button>
            </div>
          </div>
          <BPTimeChart
            readings={readings}
            height={320}
            showTrendline={showTrendline}
            showMarkers={showMarkers}
            showMAP={showMAP}
          />
        </div>

        {/* Distribution Chart */}
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
            Distribution
          </h3>
          <BPScatterChart readings={readings} height={320} />
        </div>
      </div>

      {/* Compact Stats Bar */}
      <CompactStatsBar
        readings={readings}
        allReadings={allReadings}
        dateRange={dateRange}
        timeOfDay={timeOfDay}
        isExpanded={statsExpanded}
        onToggleExpand={() => setStatsExpanded(!statsExpanded)}
      />

      {/* Readings Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <ReadingsTab readings={readings} />
      </div>
    </div>
  );
}
