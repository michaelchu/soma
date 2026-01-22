import { LatestReading } from '../ui/LatestReading';
import { calculateStats } from '../../utils/bpHelpers';

export function StatisticsTab({ readings }) {
  if (!readings || readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No readings yet
      </div>
    );
  }

  const stats = calculateStats(readings);

  return (
    <div className="space-y-6 pt-4">
      <LatestReading readings={readings} />

      {stats && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Statistics</h3>
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
        </div>
      )}
    </div>
  );
}
