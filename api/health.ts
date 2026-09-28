import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, methodNotAllowed, handleErrors } from './_db.js';

/**
 * GET /api/health -> { ok: true }
 * Startup connectivity check: verifies the database is reachable (and ensures
 * the schema exists) so the app can show its error overlay when offline or
 * misconfigured instead of failing on the first data load.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'health', async () => {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET']);
      return;
    }
    await query('SELECT 1 AS ok');
    json(res, 200, { ok: true });
  });
}
