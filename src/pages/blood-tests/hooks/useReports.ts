import { useCallback, useMemo } from 'react';
import {
  getReports,
  addReport as addReportDb,
  updateReport as updateReportDb,
  deleteReport as deleteReportDb,
} from '../../../lib/db/bloodTests';
import { enrichReportMetrics } from '../utils/metricCalculations';
import { useDataManager } from '../../../hooks/useDataManager';
import type { BloodTestReportInput } from '@/types';

interface EnrichedMetric {
  value: number;
  unit: string;
  reference?: {
    min?: number;
    max?: number;
    raw?: string;
  };
  min: number | null;
  max: number | null;
  category: string;
  name: string;
  description: string;
  clinicalNotes: string;
  optimalMin: number | null;
  optimalMax: number | null;
}

interface EnrichedReport {
  id: string;
  date: string;
  orderNumber: string;
  orderedBy: string;
  metrics: Record<string, EnrichedMetric>;
}

/**
 * Custom hook for managing blood test reports
 * Loads reports from Supabase and enriches them with reference range data
 */
export function useReports() {
  // Cast fetchFn to match expected type - getReports returns raw data that gets processed
  const fetchFn = useMemo(
    () =>
      getReports as unknown as () => Promise<{
        data: EnrichedReport[] | null;
        error: Error | null;
      }>,
    []
  );
  const processData = useCallback((data: EnrichedReport[]) => {
    if (!data || data.length === 0) return [];
    // Cast is safe because enrichReportMetrics transforms the raw reports to enriched reports
    return enrichReportMetrics(
      data as unknown as Parameters<typeof enrichReportMetrics>[0]
    ) as unknown as EnrichedReport[];
  }, []);

  const {
    data: reports,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch,
  } = useDataManager<EnrichedReport>({
    fetchFn,
    processData,
    errorMessage: 'Failed to load reports',
    idField: 'id',
  });

  const addReport = useCallback(
    async (report: BloodTestReportInput) => {
      // Cast is safe because we're using refetchAfter which will re-fetch and enrich
      return addItem(
        () => addReportDb(report) as Promise<{ data: EnrichedReport | null; error: Error | null }>,
        { refetchAfter: true }
      );
    },
    [addItem]
  );

  const updateReport = useCallback(
    async (id: string, updates: Partial<BloodTestReportInput>) => {
      // Cast is safe because we're using refetchAfter which will re-fetch and enrich
      return updateItem(
        id,
        () =>
          updateReportDb(id, updates) as Promise<{
            data: EnrichedReport | null;
            error: Error | null;
          }>,
        { refetchAfter: true }
      );
    },
    [updateItem]
  );

  const deleteReport = useCallback(
    async (id: string) => {
      return deleteItem(id, () => deleteReportDb(id));
    },
    [deleteItem]
  );

  return {
    reports,
    loading,
    error,
    addReport,
    updateReport,
    deleteReport,
    refetch,
  };
}
