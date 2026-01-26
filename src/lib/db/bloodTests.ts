import { supabase } from '../supabase';
import { validateBloodTestReport, sanitizeString } from '../validation';

/**
 * Blood Tests data service
 * CRUD operations for blood test reports and metrics
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
  value: string;
  unit: string;
  reference_min: string | null;
  reference_max: string | null;
  reference_raw: string | null;
}

interface ReportRow {
  id: string;
  user_id: string;
  report_date: string;
  order_number: string | null;
  ordered_by: string | null;
  notes: string | null;
  blood_test_metrics?: MetricRow[];
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

/**
 * Get all blood test reports with their metrics for the current user
 * Uses Supabase's relational query to fetch reports and metrics in a single request
 */
export async function getReports(): Promise<{
  data: BloodTestReport[] | null;
  error: Error | null;
}> {
  // Get current user for explicit filtering (defense in depth alongside RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  // Fetch reports with their metrics in a single query (fixes N+1 problem)
  const { data: reports, error } = await supabase
    .from('blood_test_reports')
    .select(
      `
      *,
      blood_test_metrics (*)
    `
    )
    .eq('user_id', user.id)
    .order('report_date', { ascending: false });

  if (error) {
    console.error('Error fetching blood test reports:', error);
    return { data: null, error };
  }

  if (!reports || reports.length === 0) {
    return { data: [], error: null };
  }

  // Transform to match the existing data shape used by components
  const transformedReports: BloodTestReport[] = (reports as ReportRow[]).map((report) => {
    // Group metrics by metric_key
    const metrics: Record<string, MetricData> = {};
    for (const metric of report.blood_test_metrics || []) {
      metrics[metric.metric_key] = {
        value: parseFloat(metric.value),
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
}

/**
 * Build a reference object from metric row
 */
function buildReferenceObject(metric: MetricRow): Reference {
  const ref: Reference = {};
  if (metric.reference_min !== null) ref.min = parseFloat(metric.reference_min);
  if (metric.reference_max !== null) ref.max = parseFloat(metric.reference_max);
  if (metric.reference_raw) ref.raw = metric.reference_raw;
  return ref;
}

/**
 * Add a new blood test report with metrics
 */
export async function addReport(report: ReportInput): Promise<{
  data: BloodTestReport | null;
  error: Error | null;
}> {
  // Validate input
  const validation = validateBloodTestReport(report);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  // Sanitize string fields
  const sanitizedOrderNumber = report.orderNumber ? sanitizeString(report.orderNumber, 100) : null;
  const sanitizedOrderedBy = report.orderedBy ? sanitizeString(report.orderedBy, 200) : null;
  const sanitizedNotes = report.notes ? sanitizeString(report.notes) : null;

  // Insert report
  const { data: reportData, error: reportError } = await supabase
    .from('blood_test_reports')
    .insert({
      user_id: user.id,
      report_date: report.date,
      order_number: sanitizedOrderNumber,
      ordered_by: sanitizedOrderedBy,
      notes: sanitizedNotes,
    })
    .select()
    .single();

  if (reportError) {
    console.error('Error adding blood test report:', reportError);
    return { data: null, error: reportError };
  }

  // Insert metrics
  if (report.metrics && Object.keys(report.metrics).length > 0) {
    const metricsRows = Object.entries(report.metrics).map(([key, data]) => ({
      report_id: reportData.id,
      metric_key: key,
      value: data.value,
      unit: data.unit || '',
      reference_min: data.reference?.min ?? null,
      reference_max: data.reference?.max ?? null,
      reference_raw: data.reference?.raw || null,
    }));

    const { error: metricsError } = await supabase.from('blood_test_metrics').insert(metricsRows);

    if (metricsError) {
      console.error('Error adding blood test metrics:', metricsError);
      // Clean up the report if metrics failed
      await supabase.from('blood_test_reports').delete().eq('id', reportData.id);
      return { data: null, error: metricsError };
    }
  }

  return {
    data: {
      id: reportData.id,
      date: reportData.report_date,
      orderNumber: reportData.order_number || '',
      orderedBy: reportData.ordered_by || '',
      metrics: report.metrics,
    },
    error: null,
  };
}

/**
 * Update an existing blood test report
 */
export async function updateReport(
  id: string,
  updates: ReportUpdates
): Promise<{ data: Partial<BloodTestReport> | null; error: Error | null }> {
  // Get current user for explicit filtering (defense in depth alongside RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const updateData: Record<string, unknown> = {};
  if (updates.date !== undefined) updateData.report_date = updates.date;
  if (updates.orderNumber !== undefined)
    updateData.order_number = sanitizeString(updates.orderNumber, 100);
  if (updates.orderedBy !== undefined)
    updateData.ordered_by = sanitizeString(updates.orderedBy, 200);
  if (updates.notes !== undefined) updateData.notes = sanitizeString(updates.notes);

  const { data, error } = await supabase
    .from('blood_test_reports')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating blood test report:', error);
    return { data: null, error };
  }

  const reportData = data as ReportRow;
  return {
    data: {
      id: reportData.id,
      date: reportData.report_date,
      orderNumber: reportData.order_number || '',
      orderedBy: reportData.ordered_by || '',
    },
    error: null,
  };
}

/**
 * Delete a blood test report (cascades to metrics)
 */
export async function deleteReport(id: string): Promise<{ error: Error | null }> {
  // Get current user for explicit filtering (defense in depth alongside RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('blood_test_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting blood test report:', error);
  }

  return { error };
}

/**
 * Update a single metric for a report
 */
export async function updateMetric(
  reportId: string,
  metricKey: string,
  data: MetricData
): Promise<{ error: Error | null }> {
  // Get current user for explicit filtering (defense in depth alongside RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  // Verify the report belongs to the user before updating metric
  const { data: report, error: reportError } = await supabase
    .from('blood_test_reports')
    .select('id')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .single();

  if (reportError || !report) {
    console.error('Error verifying report ownership:', reportError);
    return { error: new Error('Report not found or access denied') };
  }

  const { error } = await supabase.from('blood_test_metrics').upsert({
    report_id: reportId,
    metric_key: metricKey,
    value: data.value,
    unit: data.unit || '',
    reference_min: data.reference?.min ?? null,
    reference_max: data.reference?.max ?? null,
    reference_raw: data.reference?.raw || null,
  });

  if (error) {
    console.error('Error updating metric:', error);
  }

  return { error };
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const results: ReportRow[] = [];

  for (const report of reports) {
    // Insert report
    const { data: reportData, error: reportError } = await supabase
      .from('blood_test_reports')
      .insert({
        user_id: user.id,
        report_date: report.date,
        order_number: report.orderNumber || null,
        ordered_by: report.orderedBy || null,
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error inserting report:', reportError);
      continue;
    }

    // Insert metrics
    if (report.metrics && Object.keys(report.metrics).length > 0) {
      const metricsRows = Object.entries(report.metrics).map(([key, data]) => ({
        report_id: reportData.id,
        metric_key: key,
        value: data.value,
        unit: data.unit || '',
        reference_min: data.reference?.min ?? null,
        reference_max: data.reference?.max ?? null,
        reference_raw: data.reference?.raw || null,
      }));

      const { error: metricsError } = await supabase.from('blood_test_metrics').insert(metricsRows);

      if (metricsError) {
        console.error('Error inserting metrics for report:', metricsError);
      }
    }

    results.push(reportData as ReportRow);
  }

  return { data: results, error: null };
}
