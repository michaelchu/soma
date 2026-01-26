import { useState, useMemo } from 'react';
import { REFERENCE_RANGES } from '../constants/referenceRanges';
import { getStatus } from '../utils/statusHelpers';

/**
 * Custom hook for filtering and managing blood test metrics
 */
export function useMetricFiltering(reports) {
  const [filter, setFilter] = useState('all');
  const [selectedReportIds, setSelectedReportIds] = useState(null); // null = all selected

  // Get all unique metrics across all reports
  const allMetrics = useMemo(() => {
    const metrics = new Set();
    reports.forEach((r) => Object.keys(r.metrics).forEach((k) => metrics.add(k)));
    return metrics;
  }, [reports]);

  // Filter reports based on checkbox selection
  const filteredReports = useMemo(
    () =>
      selectedReportIds === null ? reports : reports.filter((r) => selectedReportIds.has(r.id)),
    [reports, selectedReportIds]
  );

  // Filter metrics based on filter type and filtered reports
  const filteredMetrics = useMemo(() => {
    return Array.from(allMetrics).filter((key) => {
      const ref = REFERENCE_RANGES[key];
      if (!ref) return false;
      const reportsWithMetric = filteredReports.filter((r) => r.metrics[key]);
      if (reportsWithMetric.length === 0) return false;
      if (filter === 'abnormal') {
        return reportsWithMetric.some((r) => {
          const metric = r.metrics[key];
          return getStatus(metric.value, metric.min, metric.max) !== 'normal';
        });
      }
      return true;
    });
  }, [allMetrics, filteredReports, filter]);

  // Sort metrics by category, then by name
  const sortedMetrics = useMemo(() => {
    return filteredMetrics.sort((a, b) => {
      const refA = REFERENCE_RANGES[a];
      const refB = REFERENCE_RANGES[b];
      const catCompare = (refA?.category || '').localeCompare(refB?.category || '');
      if (catCompare !== 0) return catCompare;
      return (refA?.name || '').localeCompare(refB?.name || '');
    });
  }, [filteredMetrics]);

  const isReportSelected = (reportId) =>
    selectedReportIds === null || selectedReportIds.has(reportId);

  const toggleReportSelection = (reportId) => {
    setSelectedReportIds((prev) => {
      if (prev === null) {
        // First uncheck: create Set with all IDs except this one
        const allIds = new Set(reports.map((r) => r.id));
        allIds.delete(reportId);
        return allIds;
      }
      const next = new Set(prev);
      if (next.has(reportId)) {
        // Don't allow unchecking the last report
        if (next.size === 1) {
          return prev;
        }
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      // If all are selected again, return to null state
      if (next.size === reports.length) {
        return null;
      }
      return next;
    });
  };

  const selectAllReports = () => setSelectedReportIds(null);

  const selectedCount = selectedReportIds === null ? reports.length : selectedReportIds.size;

  return {
    filter,
    setFilter,
    filteredReports,
    sortedMetrics,
    isReportSelected,
    toggleReportSelection,
    selectAllReports,
    selectedCount,
  };
}
