import { useDashboard } from '../context/DashboardContext';
import { getHealthScoreColor, getHealthScoreLabel } from '../utils/healthScore';

export function HealthScoreGauge() {
  const { healthScore } = useDashboard();

  if (!healthScore) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add BP readings or sleep entries to see your health score
        </p>
      </div>
    );
  }

  const { overall, primaryDriver, actionItem } = healthScore;
  const colorClass = getHealthScoreColor(overall);
  const label = getHealthScoreLabel(overall);

  return (
    <div className="text-center">
      {/* Score */}
      <div className="mb-2 pt-4">
        <span className={`text-6xl font-bold ${colorClass}`}>{overall}</span>
      </div>
      <p className={`text-lg font-medium ${colorClass}`}>{label}</p>
      <p className="text-sm text-muted-foreground mt-1">{primaryDriver}</p>

      {/* Action item */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-foreground">{actionItem}</p>
      </div>
    </div>
  );
}
