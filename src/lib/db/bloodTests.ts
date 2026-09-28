import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { validateBloodTestReport, sanitizeString } from '../validation';
import { logError } from '../logger';
import type { BloodTestReport, BloodTestReportInput, MetricReference, MetricValue } from '@/types';

/**
 * Blood Tests data service
 * CRUD operations for blood test reports and metrics (server API backed by Postgres)
 */

type Reference = MetricReference;
type MetricData = MetricValue;

interface MetricRow {
  id: string;
  report_id: string;
  metric_key: string;
  value: number;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
  reference_raw: string | null;
}

interface ReportRow {
  id: string;
  report_date: string;
  order_number: string | null;
  ordered_by: string | null;
  notes: string | null;
}

export type { BloodTestReport };
type ReportInput = BloodTestReportInput;

interface ReportUpdates {
  date?: string;
  orderNumber?: string;
  orderedBy?: string;
  notes?: string;
}

function buildReferenceObject(metric: MetricRow): Reference {
  const ref: Reference = {};
  if (metric.reference_min !== null) ref.min = metric.reference_min;
  if (metric.reference_max !== null) ref.max = metric.reference_max;
  if (metric.reference_raw) ref.raw = metric.reference_raw;
  return ref;
}

function rowToReportHeader(row: ReportRow): {
  id: string;
  date: string;
  orderNumber: string;
  orderedBy: string;
} {
  return {
    id: row.id,
    date: row.report_date,
    orderNumber: row.order_number || '',
    orderedBy: row.ordered_by || '',
  };
}

/**
 * Get all blood test reports with their metrics
 */
export async function getReports(): Promise<{
  data: BloodTestReport[] | null;
  error: Error | null;
}> {
  try {
    const { reports, metrics } = await apiGet<{ reports: ReportRow[]; metrics: MetricRow[] }>(
      '/api/blood-tests'
    );

    if (reports.length === 0) {
      return { data: [], error: null };
    }

    // Group metrics by report_id
    const metricsByReport = new Map<string, MetricRow[]>();
    for (const metric of metrics) {
      if (!metricsByReport.has(metric.report_id)) {
        metricsByReport.set(metric.report_id, []);
      }
      metricsByReport.get(metric.report_id)!.push(metric);
    }

    const transformedReports: BloodTestReport[] = reports.map((report) => {
      const reportMetrics: Record<string, MetricData> = {};
      for (const metric of metricsByReport.get(report.id) || []) {
        reportMetrics[metric.metric_key] = {
          value: metric.value,
          unit: metric.unit,
          reference: buildReferenceObject(metric),
        };
      }

      return {
        ...rowToReportHeader(report),
        metrics: reportMetrics,
      };
    });

    return { data: transformedReports, error: null };
  } catch (err) {
    logError('bloodTests.getReports', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Add a new blood test report with metrics
 */
export async function addReport(report: ReportInput): Promise<{
  data: BloodTestReport | null;
  error: Error | null;
}> {
  const validation = validateBloodTestReport(report);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  try {
    const sanitizedOrderNumber = report.orderNumber
      ? sanitizeString(report.orderNumber, 100)
      : null;
    const sanitizedOrderedBy = report.orderedBy ? sanitizeString(report.orderedBy, 200) : null;
    const sanitizedNotes = report.notes ? sanitizeString(report.notes) : null;

    const { reportId } = await apiPost<{ reportId: string }>('/api/blood-tests', {
      report: {
        date: report.date,
        orderNumber: sanitizedOrderNumber,
        orderedBy: sanitizedOrderedBy,
        notes: sanitizedNotes,
        metrics: report.metrics,
      },
    });

    return {
      data: {
        id: reportId,
        date: report.date,
        orderNumber: sanitizedOrderNumber || '',
        orderedBy: sanitizedOrderedBy || '',
        metrics: report.metrics,
      },
      error: null,
    };
  } catch (err) {
    logError('bloodTests.addReport', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing blood test report
 */
export async function updateReport(
  id: string,
  updates: ReportUpdates
): Promise<{ data: Partial<BloodTestReport> | null; error: Error | null }> {
  try {
    const body: Record<string, unknown> = {};
    if (updates.date !== undefined) body.date = updates.date;
    if (updates.orderNumber !== undefined)
      body.orderNumber = sanitizeString(updates.orderNumber, 100);
    if (updates.orderedBy !== undefined) body.orderedBy = sanitizeString(updates.orderedBy, 200);
    if (updates.notes !== undefined) body.notes = sanitizeString(updates.notes);

    const { report } = await apiPut<{ report: ReportRow }>(
      `/api/blood-tests?id=${encodeURIComponent(id)}`,
      body
    );

    return { data: rowToReportHeader(report), error: null };
  } catch (err) {
    logError('bloodTests.updateReport', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a blood test report (cascades to metrics via FK)
 */
export async function deleteReport(id: string): Promise<{ error: Error | null }> {
  try {
    await apiDelete(`/api/blood-tests?id=${encodeURIComponent(id)}`);
    return { error: null };
  } catch (err) {
    logError('bloodTests.deleteReport', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a single metric for a report (upsert)
 */
export async function updateMetric(
  reportId: string,
  metricKey: string,
  data: MetricData
): Promise<{ error: Error | null }> {
  try {
    await apiPost('/api/blood-tests-metrics', { reportId, metricKey, data });
    return { error: null };
  } catch (err) {
    logError('bloodTests.updateMetric', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

interface BulkReportInput {
  date: string;
  orderNumber?: string;
  orderedBy?: string;
  metrics: Record<string, MetricData>;
}

/**
 * Bulk insert reports with metrics (for migration)
 */
export async function bulkInsertReports(
  reports: BulkReportInput[]
): Promise<{ data: ReportRow[] | null; error: Error | null }> {
  try {
    const { reports: inserted } = await apiPost<{ reports: ReportRow[] }>('/api/blood-tests-bulk', {
      reports: reports.map((report) => ({
        date: report.date,
        orderNumber: report.orderNumber || null,
        orderedBy: report.orderedBy || null,
        metrics: report.metrics,
      })),
    });
    return { data: inserted, error: null };
  } catch (err) {
    logError('bloodTests.bulkInsertReports', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
