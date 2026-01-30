import { useDashboard } from '../context/DashboardContext';

const PERIODS = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 0, label: 'All' },
];

export function PeriodSelector() {
  const { periodDays, setPeriodDays } = useDashboard();

  return (
    <div className="flex gap-1 bg-muted rounded-md p-0.5 h-8 items-center">
      {PERIODS.map((p) => (
        <button
          key={p.days}
          onClick={() => setPeriodDays(p.days)}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            periodDays === p.days
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
