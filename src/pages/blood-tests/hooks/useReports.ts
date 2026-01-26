import { useCallback, useMemo } from 'react';
import {
  getReports,
  addReport as addReportDb,
  updateReport as updateReportDb,
  deleteReport as deleteReportDb,
} from '../../../lib/db/bloodTests';
import { enrichReportMetrics } from '../utils/metricCalculations';
import { useDataManager } from '../../../hooks/useDataManager';
import type { BloodTestReport, BloodTestReportInput } from '@/types';

interface EnrichedMetric {
  value: number;
  unit: string;
  reference?: {
    min?: number;
    max?: number;
    raw?: string;
  };
  min?: number;
  max?: number;
}

interface EnrichedReport extends Omit<BloodTestReport, 'metrics'> {
  metrics: Record<string, EnrichedMetric>;
}

/**
 * Custom hook for managing blood test reports
 * Loads reports from Supabase and enriches them with reference range data
 */
export function useReports() {
  const fetchFn = useMemo(() => getReports, []);
  const processData = useCallback((data: BloodTestReport[]) => {
    if (!data || data.length === 0) return [];
    return enrichReportMetrics(data);
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
      return addItem(() => addReportDb(report), { refetchAfter: true });
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
