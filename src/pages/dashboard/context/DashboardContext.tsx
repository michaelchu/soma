import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getReadings as getBPReadings } from '@/lib/db/bloodPressure';
import { getSleepEntries } from '@/lib/db/sleep';
import { calculateHealthScore, type HealthScoreResult } from '../utils/healthScore';

interface BPReading {
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  sessionId: string;
}

interface SleepEntry {
  id: string;
  date: string;
  durationMinutes: number;
  sleepStart: string | null;
  sleepEnd: string | null;
  hrvLow: number | null;
  hrvHigh: number | null;
  restingHr: number | null;
  deepSleepPct: number | null;
  remSleepPct: number | null;
  lightSleepPct: number | null;
  awakePct: number | null;
  notes: string | null;
}

interface TimelineEntry {
  id: string;
  type: 'bp' | 'sleep';
  date: Date;
  data: BPReading | SleepEntry;
}

interface DashboardContextType {
  loading: boolean;
  error: string | null;
  healthScore: HealthScoreResult | null;
  bpReadings: BPReading[];
  sleepEntries: SleepEntry[];
  timeline: TimelineEntry[];
  periodDays: number;
  setPeriodDays: (days: number) => void;
  refresh: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allBpReadings, setAllBpReadings] = useState<BPReading[]>([]);
  const [allSleepEntries, setAllSleepEntries] = useState<SleepEntry[]>([]);
  const [periodDays, setPeriodDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [bpResult, sleepResult] = await Promise.all([getBPReadings(), getSleepEntries()]);

      if (bpResult.error) {
        console.error('BP fetch error:', bpResult.error);
      }
      if (sleepResult.error) {
        console.error('Sleep fetch error:', sleepResult.error);
      }

      // Flatten BP sessions to individual readings
      const bpReadings: BPReading[] = [];
      if (bpResult.data) {
        for (const session of bpResult.data) {
          // Use session average as single reading for dashboard
          bpReadings.push({
            datetime: session.datetime,
            systolic: session.systolic,
            diastolic: session.diastolic,
            pulse: session.pulse,
            sessionId: session.sessionId,
          });
        }
      }

      setAllBpReadings(bpReadings);
      setAllSleepEntries((sleepResult.data as SleepEntry[]) || []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data by period
  const { bpReadings, sleepEntries } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    cutoff.setHours(0, 0, 0, 0);

    const filteredBp = allBpReadings.filter((r) => new Date(r.datetime) >= cutoff);
    const filteredSleep = allSleepEntries.filter((e) => new Date(e.date) >= cutoff);

    return { bpReadings: filteredBp, sleepEntries: filteredSleep };
  }, [allBpReadings, allSleepEntries, periodDays]);

  // Calculate health score
  const healthScore = useMemo(() => {
    if (bpReadings.length === 0 && sleepEntries.length === 0) return null;
    return calculateHealthScore(bpReadings, sleepEntries);
  }, [bpReadings, sleepEntries]);

  // Build timeline (last 7 days of entries)
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];

    // Add BP readings
    bpReadings.forEach((r) => {
      entries.push({
        id: `bp-${r.sessionId}`,
        type: 'bp',
        date: new Date(r.datetime),
        data: r,
      });
    });

    // Add sleep entries
    sleepEntries.forEach((e) => {
      entries.push({
        id: `sleep-${e.id}`,
        type: 'sleep',
        date: new Date(e.date),
        data: e,
      });
    });

    // Sort by date descending
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    return entries;
  }, [bpReadings, sleepEntries]);

  return (
    <DashboardContext.Provider
      value={{
        loading,
        error,
        healthScore,
        bpReadings,
        sleepEntries,
        timeline,
        periodDays,
        setPeriodDays,
        refresh: fetchData,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
