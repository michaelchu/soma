import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, badRequest, methodNotAllowed, handleErrors, getQueryParam } from './_db.js';

/**
 * GET    /api/blood-tests          -> { reports, metrics }
 * POST   /api/blood-tests          -> { reportId } (report + metrics, atomic)
 * PUT    /api/blood-tests?id=...   -> { report }
 * DELETE /api/blood-tests?id=...   -> { ok: true } (metrics cascade)
 */

const REPORT_COLUMNS = 'id, report_date, order_number, ordered_by, notes, created_at, updated_at';
const METRIC_COLUMNS =
  'id, report_id, metric_key, value, unit, reference_min, reference_max, reference_raw, created_at';

interface MetricInput {
  value: number;
  unit: string;
  reference?: { min?: number; max?: number; raw?: string };
}

function parseMetric(value: unknown): MetricInput | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  if (typeof m.value !== 'number' || !Number.isFinite(m.value)) return null;
  const ref = m.reference as Record<string, unknown> | undefined;
  const reference: MetricInput['reference'] = {};
  if (ref && typeof ref === 'object') {
    if (typeof ref.min === 'number' && Number.isFinite(ref.min)) reference.min = ref.min;
    if (typeof ref.max === 'number' && Number.isFinite(ref.max)) reference.max = ref.max;
    if (typeof ref.raw === 'string') reference.raw = ref.raw;
  }
  return {
    value: m.value,
    unit: typeof m.unit === 'string' ? m.unit : '',
    ...(Object.keys(reference).length > 0 ? { reference } : {}),
  };
}

function parseReportBody(body: unknown):
  | {
      date: string;
      orderNumber: string | null;
      orderedBy: string | null;
      notes: string | null;
      metrics: Record<string, MetricInput>;
    }
  | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Request body must be JSON' };
  const b = body as Record<string, unknown>;
  const report = b.report as Record<string, unknown> | undefined;
  if (!report || typeof report !== 'object') return { error: 'Missing report' };
  if (typeof report.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(report.date)) {
    return { error: 'Invalid date (expected YYYY-MM-DD)' };
  }
  const metrics: Record<string, MetricInput> = {};
  const rawMetrics = report.metrics;
  if (rawMetrics != null) {
    if (typeof rawMetrics !== 'object' || Array.isArray(rawMetrics)) {
      return { error: 'Invalid metrics' };
    }
    for (const [key, value] of Object.entries(rawMetrics as Record<string, unknown>)) {
      const metric = parseMetric(value);
      if (!metric) return { error: `Invalid metric "${key}"` };
      metrics[key] = metric;
    }
  }
  const optStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  return {
    date: report.date,
    orderNumber: optStr(report.orderNumber),
    orderedBy: optStr(report.orderedBy),
    notes: optStr(report.notes),
    metrics,
  };
}

async function insertReportWithMetrics(
  reportId: string,
  date: string,
  orderNumber: string | null,
  orderedBy: string | null,
  notes: string | null,
  metrics: Record<string, MetricInput>
): Promise<void> {
  const now = new Date().toISOString();
  const params: unknown[] = [reportId, date, orderNumber, orderedBy, notes, now, now];
  let statement = `WITH new_report AS (
    INSERT INTO blood_test_reports (id, report_date, order_number, ordered_by, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  )`;
  const entries = Object.entries(metrics);
  if (entries.length > 0) {
    params.push(now);
    const nowPlaceholder = `$${params.length}`;
    const valueLists = entries.map(([key, metric]) => {
      const placeholders = [
        `$${params.length + 1}::text`, // id
        `$${params.length + 2}::text`, // metric_key
        `$${params.length + 3}::double precision`, // value
        `$${params.length + 4}::text`, // unit
        `$${params.length + 5}::double precision`, // reference_min
        `$${params.length + 6}::double precision`, // reference_max
        `$${params.length + 7}::text`, // reference_raw
      ];
      params.push(
        randomUUID(),
        key,
        metric.value,
        metric.unit,
        metric.reference?.min ?? null,
        metric.reference?.max ?? null,
        metric.reference?.raw ?? null
      );
      return `(${placeholders.join(', ')})`;
    });
    statement += `
    INSERT INTO blood_test_metrics (id, report_id, metric_key, value, unit, reference_min, reference_max, reference_raw, created_at)
    SELECT v.id, new_report.id, v.metric_key, v.value, v.unit, v.reference_min, v.reference_max, v.reference_raw, ${nowPlaceholder}::timestamptz
    FROM new_report CROSS JOIN (VALUES ${valueLists.join(', ')}) AS v(id, metric_key, value, unit, reference_min, reference_max, reference_raw)`;
  } else {
    statement += ` SELECT id FROM new_report`;
  }
  await query(statement, params);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'blood-tests', async () => {
    if (req.method === 'GET') {
      const reports = await query(
        `SELECT ${REPORT_COLUMNS} FROM blood_test_reports ORDER BY report_date DESC`
      );
      const metrics = await query(`SELECT ${METRIC_COLUMNS} FROM blood_test_metrics`);
      json(res, 200, { reports, metrics });
      return;
    }

    if (req.method === 'POST') {
      const parsed = parseReportBody(req.body);
      if ('error' in parsed) {
        badRequest(res, parsed.error);
        return;
      }
      const reportId = randomUUID();
      await insertReportWithMetrics(
        reportId,
        parsed.date,
        parsed.orderNumber,
        parsed.orderedBy,
        parsed.notes,
        parsed.metrics
      );
      json(res, 201, { reportId });
      return;
    }

    if (req.method === 'PUT') {
      const id = getQueryParam(req, 'id');
      if (!id) {
        badRequest(res, 'Missing id query parameter');
        return;
      }
      if (!req.body || typeof req.body !== 'object') {
        badRequest(res, 'Request body must be JSON');
        return;
      }
      const b = req.body as Record<string, unknown>;
      const setClauses: string[] = [];
      const params: unknown[] = [id];
      const allowed: [string, string][] = [
        ['date', 'report_date'],
        ['orderNumber', 'order_number'],
        ['orderedBy', 'ordered_by'],
        ['notes', 'notes'],
      ];
      for (const [bodyKey, column] of allowed) {
        if (b[bodyKey] !== undefined) {
          if (
            bodyKey === 'date' &&
            (typeof b[bodyKey] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b[bodyKey] as string))
          ) {
            badRequest(res, 'Invalid date (expected YYYY-MM-DD)');
            return;
          }
          if (bodyKey !== 'date' && b[bodyKey] !== null && typeof b[bodyKey] !== 'string') {
            badRequest(res, `Invalid ${bodyKey}`);
            return;
          }
          params.push(b[bodyKey]);
          setClauses.push(`${column}=$${params.length}`);
        }
      }
      if (setClauses.length === 0) {
        badRequest(res, 'No fields to update');
        return;
      }
      params.push(new Date().toISOString());
      setClauses.push(`updated_at=$${params.length}`);
      const rows = await query(
        `UPDATE blood_test_reports SET ${setClauses.join(', ')} WHERE id=$1 RETURNING ${REPORT_COLUMNS}`,
        params
      );
      if (rows.length === 0) {
        json(res, 404, { error: 'Report not found' });
        return;
      }
      json(res, 200, { report: rows[0] });
      return;
    }

    if (req.method === 'DELETE') {
      const id = getQueryParam(req, 'id');
      if (!id) {
        badRequest(res, 'Missing id query parameter');
        return;
      }
      await query('DELETE FROM blood_test_reports WHERE id = $1', [id]);
      json(res, 200, { ok: true });
      return;
    }

    methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  });
}
