import { useCallback, useMemo } from 'react';
import {
  getReports,
  addReport as addReportDb,
  updateReport as updateReportDb,
  deleteReport as deleteReportDb,
} from '../../../lib/db/bloodTests';
import { enrichReportMetrics } from '../utils/metricCalculations';
import { useDataManager } from '../../../hooks/useDataManager';

/**
 * Custom hook for managing blood test reports
 * Loads reports from Supabase and enriches them with reference range data
 */
export function useReports() {
  const fetchFn = useMemo(() => getReports, []);
  const processData = useCallback((data) => {
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
  } = useDataManager({
    fetchFn,
    processData,
    errorMessage: 'Failed to load reports',
    idField: 'id',
  });

  const addReport = useCallback(
    async (report) => {
      return addItem(() => addReportDb(report), { refetchAfter: true });
    },
    [addItem]
  );

  const updateReport = useCallback(
    async (id, updates) => {
      return updateItem(id, () => updateReportDb(id, updates), { refetchAfter: true });
    },
    [updateItem]
  );

  const deleteReport = useCallback(
    async (id) => {
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
