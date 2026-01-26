import { useState, useEffect, useCallback } from 'react';
import {
  getReports,
  addReport as addReportDb,
  updateReport as updateReportDb,
  deleteReport as deleteReportDb,
} from '../../../lib/db/bloodTests';
import { enrichReportMetrics } from '../utils/metricCalculations';

/**
 * Custom hook for managing blood test reports
 * Loads reports from Supabase and enriches them with reference range data
 */
export function useReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await getReports();

    if (fetchError) {
      setError('Failed to load reports');
      console.error('Error fetching reports:', fetchError);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setReports([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Enrich reports with reference range data from constants
    const enrichedReports = enrichReportMetrics(data);
    setReports(enrichedReports);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      setLoading(true);
      const { data, error: fetchError } = await getReports();

      if (cancelled) return;

      if (fetchError) {
        setError('Failed to load reports');
        console.error('Error fetching reports:', fetchError);
        setLoading(false);
        return;
      }

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
    };

    loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const addReport = useCallback(
    async (report) => {
      const { data, error: addError } = await addReportDb(report);

      if (addError) {
        console.error('Error adding report:', addError);
        return { error: addError };
      }

      // Refetch to get enriched data
      await fetchReports();

      return { data };
    },
    [fetchReports]
  );

  const updateReport = useCallback(
    async (id, updates) => {
      const { data, error: updateError } = await updateReportDb(id, updates);

      if (updateError) {
        console.error('Error updating report:', updateError);
        return { error: updateError };
      }

      // Refetch to get enriched data
      await fetchReports();

      return { data };
    },
    [fetchReports]
  );

  const deleteReport = useCallback(async (id) => {
    const { error: deleteError } = await deleteReportDb(id);

    if (deleteError) {
      console.error('Error deleting report:', deleteError);
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
