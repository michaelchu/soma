import { querySQL, execSQL } from '../sqlite';
import { validateBloodTestReport, sanitizeString } from '../validation';
import { logError } from '../logger';

/**
 * Blood Tests data service
 * CRUD operations for blood test reports and metrics (local SQLite)
 */

interface Reference {
  min?: number;
  max?: number;
  raw?: string;
}

interface MetricData {
  value: number;
  unit: string;
  reference?: Reference;
}

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

interface BloodTestReport {
  id: string;
  date: string;
  orderNumber: string;
  orderedBy: string;
  metrics: Record<string, MetricData>;
}

interface ReportInput {
  date: string;
  orderNumber?: string;
  orderedBy?: string;
  notes?: string;
  metrics: Record<string, MetricData>;
}

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

/**
 * Get all blood test reports with their metrics
 */
export async function getReports(): Promise<{
  data: BloodTestReport[] | null;
  error: Error | null;
}> {
  try {
    const reports = await querySQL<ReportRow>(
      'SELECT * FROM blood_test_reports ORDER BY report_date DESC'
    );

    if (reports.length === 0) {
      return { data: [], error: null };
    }

    const allMetrics = await querySQL<MetricRow>('SELECT * FROM blood_test_metrics');

    // Group metrics by report_id
    const metricsByReport = new Map<string, MetricRow[]>();
    for (const metric of allMetrics) {
      if (!metricsByReport.has(metric.report_id)) {
        metricsByReport.set(metric.report_id, []);
      }
      metricsByReport.get(metric.report_id)!.push(metric);
    }

    const transformedReports: BloodTestReport[] = reports.map((report) => {
      const metrics: Record<string, MetricData> = {};
      for (const metric of metricsByReport.get(report.id) || []) {
        metrics[metric.metric_key] = {
          value: metric.value,
          unit: metric.unit,
          reference: buildReferenceObject(metric),
        };
      }

      return {
        id: report.id,
        date: report.report_date,
        orderNumber: report.order_number || '',
        orderedBy: report.ordered_by || '',
        metrics,
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

    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();

    await execSQL(
      `INSERT INTO blood_test_reports (id, report_date, order_number, ordered_by, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reportId, report.date, sanitizedOrderNumber, sanitizedOrderedBy, sanitizedNotes, now, now]
    );

    // Insert metrics
    if (report.metrics && Object.keys(report.metrics).length > 0) {
      for (const [key, data] of Object.entries(report.metrics)) {
        const metricId = crypto.randomUUID();
        await execSQL(
          `INSERT INTO blood_test_metrics (id, report_id, metric_key, value, unit, reference_min, reference_max, reference_raw, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            metricId,
            reportId,
            key,
            data.value,
            data.unit || '',
            data.reference?.min ?? null,
            data.reference?.max ?? null,
            data.reference?.raw || null,
            now,
          ]
        );
      }
    }

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
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (updates.date !== undefined) {
      setClauses.push('report_date=?');
      params.push(updates.date);
    }
    if (updates.orderNumber !== undefined) {
      setClauses.push('order_number=?');
      params.push(sanitizeString(updates.orderNumber, 100));
    }
    if (updates.orderedBy !== undefined) {
      setClauses.push('ordered_by=?');
      params.push(sanitizeString(updates.orderedBy, 200));
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes=?');
      params.push(sanitizeString(updates.notes));
    }

    setClauses.push("updated_at=datetime('now')");
    params.push(id);

    await execSQL(`UPDATE blood_test_reports SET ${setClauses.join(', ')} WHERE id=?`, params);

    const rows = await querySQL<ReportRow>('SELECT * FROM blood_test_reports WHERE id = ?', [id]);
    const report = rows[0];

    return {
      data: {
        id: report.id,
        date: report.report_date,
        orderNumber: report.order_number || '',
        orderedBy: report.ordered_by || '',
      },
      error: null,
    };
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
    await execSQL('DELETE FROM blood_test_reports WHERE id = ?', [id]);
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
    // Check if metric exists
    const existing = await querySQL<MetricRow>(
      'SELECT id FROM blood_test_metrics WHERE report_id = ? AND metric_key = ?',
      [reportId, metricKey]
    );

    if (existing.length > 0) {
      await execSQL(
        `UPDATE blood_test_metrics SET value=?, unit=?, reference_min=?, reference_max=?, reference_raw=?
         WHERE report_id=? AND metric_key=?`,
        [
          data.value,
          data.unit || '',
          data.reference?.min ?? null,
          data.reference?.max ?? null,
          data.reference?.raw || null,
          reportId,
          metricKey,
        ]
      );
    } else {
      const metricId = crypto.randomUUID();
      await execSQL(
        `INSERT INTO blood_test_metrics (id, report_id, metric_key, value, unit, reference_min, reference_max, reference_raw, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          metricId,
          reportId,
          metricKey,
          data.value,
          data.unit || '',
          data.reference?.min ?? null,
          data.reference?.max ?? null,
          data.reference?.raw || null,
        ]
      );
    }

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
    const results: ReportRow[] = [];

    for (const report of reports) {
      const reportId = crypto.randomUUID();
      const now = new Date().toISOString();

      await execSQL(
        `INSERT INTO blood_test_reports (id, report_date, order_number, ordered_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [reportId, report.date, report.orderNumber || null, report.orderedBy || null, now, now]
      );

      if (report.metrics && Object.keys(report.metrics).length > 0) {
        for (const [key, data] of Object.entries(report.metrics)) {
          const metricId = crypto.randomUUID();
          await execSQL(
            `INSERT INTO blood_test_metrics (id, report_id, metric_key, value, unit, reference_min, reference_max, reference_raw, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              metricId,
              reportId,
              key,
              data.value,
              data.unit || '',
              data.reference?.min ?? null,
              data.reference?.max ?? null,
              data.reference?.raw || null,
              now,
            ]
          );
        }
      }

      results.push({
        id: reportId,
        report_date: report.date,
        order_number: report.orderNumber || null,
        ordered_by: report.orderedBy || null,
        notes: null,
      });
    }

    return { data: results, error: null };
  } catch (err) {
    logError('bloodTests.bulkInsertReports', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
