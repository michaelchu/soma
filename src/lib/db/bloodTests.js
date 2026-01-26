import { supabase } from '../supabase';
import { validateBloodTestReport } from './validation';

/**
 * Blood Tests data service
 * CRUD operations for blood test reports and metrics
 */

/**
 * Get all blood test reports with their metrics for the current user
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getReports() {
  // Fetch reports
  const { data: reports, error: reportsError } = await supabase
    .from('blood_test_reports')
    .select('*')
    .order('report_date', { ascending: false });

  if (reportsError) {
    console.error('Error fetching blood test reports:', reportsError);
    return { data: null, error: reportsError };
  }

  if (!reports || reports.length === 0) {
    return { data: [], error: null };
  }

  // Fetch all metrics for these reports
  const reportIds = reports.map((r) => r.id);
  const { data: metrics, error: metricsError } = await supabase
    .from('blood_test_metrics')
    .select('*')
    .in('report_id', reportIds);

  if (metricsError) {
    console.error('Error fetching blood test metrics:', metricsError);
    return { data: null, error: metricsError };
  }

  // Group metrics by report_id
  const metricsByReport = {};
  for (const metric of metrics || []) {
    if (!metricsByReport[metric.report_id]) {
      metricsByReport[metric.report_id] = {};
    }
    metricsByReport[metric.report_id][metric.metric_key] = {
      value: parseFloat(metric.value),
      unit: metric.unit,
      reference: buildReferenceObject(metric),
    };
  }

  // Transform to match the existing data shape used by components
  const transformedReports = reports.map((report) => ({
    id: report.id,
    date: report.report_date,
    orderNumber: report.order_number || '',
    orderedBy: report.ordered_by || '',
    metrics: metricsByReport[report.id] || {},
  }));

  return { data: transformedReports, error: null };
}

/**
 * Build a reference object from metric row
 */
function buildReferenceObject(metric) {
  const ref = {};
  if (metric.reference_min !== null) ref.min = parseFloat(metric.reference_min);
  if (metric.reference_max !== null) ref.max = parseFloat(metric.reference_max);
  if (metric.reference_raw) ref.raw = metric.reference_raw;
  return ref;
}

/**
 * Add a new blood test report with metrics
 * @param {Object} report - The report to add
 * @param {string} report.date - Report date (YYYY-MM-DD)
 * @param {string} [report.orderNumber] - Order number
 * @param {string} [report.orderedBy] - Ordering physician
 * @param {Object} report.metrics - Object of metric_key -> {value, unit, reference}
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function addReport(report) {
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

  // Insert report
  const { data: reportData, error: reportError } = await supabase
    .from('blood_test_reports')
    .insert({
      user_id: user.id,
      report_date: report.date,
      order_number: report.orderNumber || null,
      ordered_by: report.orderedBy || null,
      notes: report.notes || null,
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
      orderNumber: reportData.order_number,
      orderedBy: reportData.ordered_by,
      metrics: report.metrics,
    },
    error: null,
  };
}

/**
 * Update an existing blood test report
 * @param {string} id - The report ID
 * @param {Object} updates - Fields to update (date, orderNumber, orderedBy, notes)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateReport(id, updates) {
  const updateData = {};
  if (updates.date !== undefined) updateData.report_date = updates.date;
  if (updates.orderNumber !== undefined) updateData.order_number = updates.orderNumber;
  if (updates.orderedBy !== undefined) updateData.ordered_by = updates.orderedBy;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('blood_test_reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating blood test report:', error);
    return { data: null, error };
  }

  return {
    data: {
      id: data.id,
      date: data.report_date,
      orderNumber: data.order_number,
      orderedBy: data.ordered_by,
    },
    error: null,
  };
}

/**
 * Delete a blood test report (cascades to metrics)
 * @param {string} id - The report ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function deleteReport(id) {
  const { error } = await supabase.from('blood_test_reports').delete().eq('id', id);

  if (error) {
    console.error('Error deleting blood test report:', error);
  }

  return { error };
}

/**
 * Update a single metric for a report
 * @param {string} reportId - The report ID
 * @param {string} metricKey - The metric key
 * @param {Object} data - Metric data {value, unit, reference}
 * @returns {Promise<{error: Error|null}>}
 */
export async function updateMetric(reportId, metricKey, data) {
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

/**
 * Bulk insert reports with metrics (for migration)
 * @param {Array} reports - Array of reports to insert
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function bulkInsertReports(reports) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const results = [];

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

    results.push(reportData);
  }

  return { data: results, error: null };
}
