import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getReadings as getBPReadingSummarys } from '@/lib/db/bloodPressure';
import { getSleepEntries, type SleepEntry } from '@/lib/db/sleep';
import { getReports as getBloodTestReports } from '@/lib/db/bloodTests';
import { getActivities } from '@/lib/db/activity';
import { calculateHealthScore, type HealthScoreResult } from '../utils/healthScore';
import type { Activity } from '@/types/activity';
import type { BPReadingSummary } from '@/types/bloodPressure';

interface TimelineEntry {
  id: string;
  type: 'bp' | 'sleep' | 'activity';
  date: Date;
  data: BPReadingSummary | SleepEntry | Activity;
}

interface MetricData {
  value: number;
  unit?: string;
  reference?: {
    min?: number;
    max?: number;
    raw?: string;
  };
}

interface BloodTestReport {
  id: string;
  date: string;
  orderNumber: string;
  orderedBy: string;
  metrics: Record<string, MetricData>;
}

interface MainPageContextType {
  loading: boolean;
  error: string | null;
  healthScore: HealthScoreResult | null;
  bpReadings: BPReadingSummary[];
  sleepEntries: SleepEntry[];
  activities: Activity[];
  bloodTestReports: BloodTestReport[];
  timeline: TimelineEntry[];
  refresh: () => Promise<void>;
}

const MainPageContext = createContext<MainPageContextType | undefined>(undefined);

export function MainPageProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allBpReadings, setAllBpReadings] = useState<BPReadingSummary[]>([]);
  const [allSleepEntries, setAllSleepEntries] = useState<SleepEntry[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [bloodTestReports, setBloodTestReports] = useState<BloodTestReport[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [bpResult, sleepResult, bloodTestResult, activityResult] = await Promise.all([
        getBPReadingSummarys(),
        getSleepEntries(),
        getBloodTestReports(),
        getActivities(),
      ]);

      // Collect and surface any fetch errors
      const fetchErrors: string[] = [];
      if (bpResult.error) {
        console.error('BP fetch error:', bpResult.error);
        fetchErrors.push('blood pressure');
      }
      if (sleepResult.error) {
        console.error('Sleep fetch error:', sleepResult.error);
        fetchErrors.push('sleep');
      }
      if (bloodTestResult.error) {
        console.error('Blood test fetch error:', bloodTestResult.error);
        fetchErrors.push('blood test');
      }
      if (activityResult.error) {
        console.error('Activity fetch error:', activityResult.error);
        fetchErrors.push('activity');
      }

      // Set partial error if some data failed to load
      if (fetchErrors.length > 0) {
        setError(`Failed to load ${fetchErrors.join(', ')} data`);
      }

      // Flatten BP sessions to individual readings
      const bpReadings: BPReadingSummary[] = [];
      if (bpResult.data) {
        for (const session of bpResult.data) {
          // Use session average as single reading for main page
          bpReadings.push({
            date: session.date,
            timeOfDay: session.timeOfDay,
            systolic: session.systolic,
            diastolic: session.diastolic,
            pulse: session.pulse,
            sessionId: session.sessionId,
          });
        }
      }

      setAllBpReadings(bpReadings);
      setAllSleepEntries((sleepResult.data as SleepEntry[]) || []);
      setAllActivities((activityResult.data as Activity[]) || []);
      setBloodTestReports((bloodTestResult.data as BloodTestReport[]) || []);
    } catch (err) {
      setError('Failed to load main page data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Use all data - no filtering needed since chart handles its own date range
  const bpReadings = allBpReadings;
  const sleepEntries = allSleepEntries;
  const activities = allActivities;

  // Calculate health score
  const healthScore = useMemo(() => {
    if (bpReadings.length === 0 && sleepEntries.length === 0 && activities.length === 0)
      return null;
    return calculateHealthScore(bpReadings, sleepEntries, activities);
  }, [bpReadings, sleepEntries, activities]);

  // Build timeline (last 7 days of entries)
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];

    // Add BP readings
    bpReadings.forEach((r) => {
      entries.push({
        id: `bp-${r.sessionId}`,
        type: 'bp',
        date: new Date(r.date + 'T00:00:00'),
        data: r,
      });
    });

    // Add sleep entries (parse date-only strings with time component for local timezone)
    sleepEntries.forEach((e) => {
      entries.push({
        id: `sleep-${e.id}`,
        type: 'sleep',
        date: new Date(e.date + 'T00:00:00'),
        data: e,
      });
    });

    // Add activity entries (parse date-only strings with time component for local timezone)
    activities.forEach((a) => {
      entries.push({
        id: `activity-${a.id}`,
        type: 'activity',
        date: new Date(a.date + 'T00:00:00'),
        data: a,
      });
    });

    // Sort by date descending
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    return entries;
  }, [bpReadings, sleepEntries, activities]);

  return (
    <MainPageContext.Provider
      value={{
        loading,
        error,
        healthScore,
        bpReadings,
        sleepEntries,
        activities,
        bloodTestReports,
        timeline,
        refresh: fetchData,
      }}
    >
      {children}
    </MainPageContext.Provider>
  );
}

export function useMainPage() {
  const context = useContext(MainPageContext);
  if (context === undefined) {
    throw new Error('useMainPage must be used within a MainPageProvider');
  }
  return context;
}
