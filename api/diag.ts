import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/diag -> { diag: 'ok' }
 * TEMPORARY diagnostic: no local imports, tests whether serverless functions
 * execute at all in this deployment.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(200).json({ diag: 'ok' });
}
