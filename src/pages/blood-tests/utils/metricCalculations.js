import { REFERENCE_RANGES } from '../constants/referenceRanges';

/**
 * Enrich reports with reference range data
 * Uses report-specific reference ranges from markdown file, supplemented with
 * metadata from the REFERENCE_RANGES constant (category, optimal ranges, etc.)
 * @param {Array} reports - Array of report objects
 * @returns {Array} Enriched reports with full metric data
 */
export function enrichReportMetrics(reports) {
  return reports.map(report => ({
    ...report,
    metrics: Object.fromEntries(
      Object.entries(report.metrics).map(([key, data]) => {
        const ref = REFERENCE_RANGES[key];

        // Use report-specific reference ranges if available, otherwise fall back to constants
        const min = data.reference?.min ?? ref?.min ?? null;
        const max = data.reference?.max ?? ref?.max ?? null;
        const unit = data.unit ?? ref?.unit ?? '';

        return [key, {
          ...data,
          // Keep the parsed reference object for future use
          reference: data.reference,
          // Add individual min/max for easy access
          min,
          max,
          unit,
          // Add metadata from constants
          category: ref?.category || 'other',
          name: ref?.name || key,
          description: ref?.description || '',
          clinicalNotes: ref?.clinicalNotes || '',
          optimalMin: ref?.optimalRange?.min ?? null,
          optimalMax: ref?.optimalRange?.max ?? null,
        }];
      })
    )
  }));
}
