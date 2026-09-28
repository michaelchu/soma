import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, badRequest, methodNotAllowed, handleErrors } from './_db.js';

/**
 * POST /api/blood-tests-bulk
 * Body: { reports: [{ date, orderNumber?, orderedBy?, metrics: { key: { value, unit, reference? } } }] }
 * Bulk-inserts reports with metrics (migration tool). Each report is atomic.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'blood-tests-bulk', async () => {
    if (req.method !== 'POST') {
      methodNotAllowed(res, ['POST']);
      return;
    }
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || !Array.isArray(body.reports)) {
      badRequest(res, 'Body must include a reports array');
      return;
    }
    const results: Record<string, unknown>[] = [];
    for (const raw of body.reports as unknown[]) {
      const report = raw as Record<string, unknown>;
      if (!report || typeof report.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(report.date)) {
        badRequest(res, 'Each report needs a valid date (YYYY-MM-DD)');
        return;
      }
      const reportId = randomUUID();
      const now = new Date().toISOString();
      const params: unknown[] = [
        reportId,
        report.date,
        typeof report.orderNumber === 'string' ? report.orderNumber : null,
        typeof report.orderedBy === 'string' ? report.orderedBy : null,
        now,
        now,
      ];
      let statement = `WITH new_report AS (
        INSERT INTO blood_test_reports (id, report_date, order_number, ordered_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      )`;
      const metrics =
        report.metrics && typeof report.metrics === 'object'
          ? Object.entries(report.metrics as Record<string, Record<string, unknown>>)
          : [];
      if (metrics.length > 0) {
        params.push(now);
        const nowPlaceholder = `$${params.length}`;
        const valueLists = metrics.map(([key, metric]) => {
          const ref = metric.reference as Record<string, unknown> | undefined;
          const placeholders = [
            `$${params.length + 1}::text`,
            `$${params.length + 2}::text`,
            `$${params.length + 3}::double precision`,
            `$${params.length + 4}::text`,
            `$${params.length + 5}::double precision`,
            `$${params.length + 6}::double precision`,
            `$${params.length + 7}::text`,
          ];
          params.push(
            randomUUID(),
            key,
            metric.value,
            typeof metric.unit === 'string' ? metric.unit : '',
            ref && typeof ref.min === 'number' ? ref.min : null,
            ref && typeof ref.max === 'number' ? ref.max : null,
            ref && typeof ref.raw === 'string' ? ref.raw : null
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
      results.push({
        id: reportId,
        report_date: report.date,
        order_number: typeof report.orderNumber === 'string' ? report.orderNumber : null,
        ordered_by: typeof report.orderedBy === 'string' ? report.orderedBy : null,
        notes: null,
      });
    }
    json(res, 201, { reports: results });
  });
}
