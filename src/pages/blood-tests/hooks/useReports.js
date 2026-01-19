import { useState, useEffect } from 'react';
import { loadReportsFromMarkdown } from '../services/markdownParser';
import { enrichReportMetrics } from '../utils/metricCalculations';

/**
 * Custom hook for managing blood test reports
 * Loads reports from markdown file and enriches them with reference range data
 */
export function useReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const rawReports = await loadReportsFromMarkdown();

        if (rawReports.length === 0) {
          setError('No reports found in the markdown file');
        }

        // Enrich reports with reference range data
        const enrichedReports = enrichReportMetrics(rawReports);
        setReports(enrichedReports);
      } catch (err) {
        console.error('Error loading reports:', err);
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { reports, loading, error };
}
