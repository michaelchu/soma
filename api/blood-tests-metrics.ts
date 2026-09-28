import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, badRequest, methodNotAllowed, handleErrors } from './_db';

/**
 * POST /api/blood-tests-metrics
 * Body: { reportId, metricKey, data: { value, unit, reference?: { min?, max?, raw? } } }
 * Upserts a single metric for a report.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'blood-tests-metrics', async () => {
    if (req.method !== 'POST') {
      methodNotAllowed(res, ['POST']);
      return;
    }
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      badRequest(res, 'Request body must be JSON');
      return;
    }
    const { reportId, metricKey, data } = body;
    if (typeof reportId !== 'string' || reportId.length === 0) {
      badRequest(res, 'Invalid reportId');
      return;
    }
    if (typeof metricKey !== 'string' || metricKey.length === 0) {
      badRequest(res, 'Invalid metricKey');
      return;
    }
    const d = data as Record<string, unknown> | undefined;
    if (!d || typeof d.value !== 'number' || !Number.isFinite(d.value)) {
      badRequest(res, 'Invalid metric value');
      return;
    }
    const ref = d.reference as Record<string, unknown> | undefined;
    await query(
      `INSERT INTO blood_test_metrics (id, report_id, metric_key, value, unit, reference_min, reference_max, reference_raw, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (report_id, metric_key) DO UPDATE SET
         value = EXCLUDED.value,
         unit = EXCLUDED.unit,
         reference_min = EXCLUDED.reference_min,
         reference_max = EXCLUDED.reference_max,
         reference_raw = EXCLUDED.reference_raw`,
      [
        randomUUID(),
        reportId,
        metricKey,
        d.value,
        typeof d.unit === 'string' ? d.unit : '',
        ref && typeof ref.min === 'number' && Number.isFinite(ref.min) ? ref.min : null,
        ref && typeof ref.max === 'number' && Number.isFinite(ref.max) ? ref.max : null,
        ref && typeof ref.raw === 'string' ? ref.raw : null,
        new Date().toISOString(),
      ]
    );
    json(res, 200, { ok: true });
  });
}
