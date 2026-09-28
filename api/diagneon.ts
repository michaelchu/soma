import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/diagneon -> { diag: 'neon-ok' } or { diag: 'neon-fail', message }
 * TEMPORARY diagnostic: dynamically imports @neondatabase/serverless directly
 * inside a try/catch to see whether the package itself loads in the runtime.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const m = await import('@neondatabase/serverless');
    res.status(200).json({ diag: 'neon-ok', hasNeon: typeof m.neon === 'function' });
  } catch (err) {
    res.status(500).json({
      diag: 'neon-fail',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
