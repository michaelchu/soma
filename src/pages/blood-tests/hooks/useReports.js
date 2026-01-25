import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getReports,
  addReport as addReportDb,
  updateReport as updateReportDb,
  deleteReport as deleteReportDb,
} from '../../../lib/db/bloodTests';
import { enrichReportMetrics } from '../utils/metricCalculations';

/**
 * Process and update reports state
 */
function processReportsData(data, setReports, setError, setLoading) {
  if (!data || data.length === 0) {
    setReports([]);
    setError(null);
    setLoading(false);
    return;
  }

  const enrichedReports = enrichReportMetrics(data);
  setReports(enrichedReports);
  setError(null);
  setLoading(false);
}

/**
 * Custom hook for managing blood test reports
 * Loads reports from Supabase and enriches them with reference range data
 */
export function useReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial data load
  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const { data, error: fetchError } = await getReports();

      if (!isMountedRef.current) return;

      if (fetchError) {
        setError('Failed to load reports');
        setLoading(false);
        return;
      }

      processReportsData(data, setReports, setError, setLoading);
    };

    loadReports();
  }, []);

  // Refetch function for manual refresh and after mutations
  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await getReports();

    if (!isMountedRef.current) return;

    if (fetchError) {
      setError('Failed to load reports');
      setLoading(false);
      return;
    }

    processReportsData(data, setReports, setError, setLoading);
  }, []);

  const addReport = useCallback(
    async (report) => {
      const { data, error: addError } = await addReportDb(report);

      if (!isMountedRef.current) return { error: null };

      if (addError) {
        return { error: addError };
      }

      // Refetch to get enriched data
      await fetchReports();

      // Check again after async operation
      if (!isMountedRef.current) return { error: null };

      return { data };
    },
    [fetchReports]
  );

  const updateReport = useCallback(
    async (id, updates) => {
      const { data, error: updateError } = await updateReportDb(id, updates);

      if (!isMountedRef.current) return { error: null };

      if (updateError) {
        return { error: updateError };
      }

      // Refetch to get enriched data
      await fetchReports();

      // Check again after async operation
      if (!isMountedRef.current) return { error: null };

      return { data };
    },
    [fetchReports]
  );

  const deleteReport = useCallback(async (id) => {
    const { error: deleteError } = await deleteReportDb(id);

    if (!isMountedRef.current) return { error: null };

    if (deleteError) {
      return { error: deleteError };
    }

    // Remove from local state
    setReports((prev) => prev.filter((r) => r.id !== id));

    return { error: null };
  }, []);

  const refetch = useCallback(() => {
    fetchReports();
  }, [fetchReports]);

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
