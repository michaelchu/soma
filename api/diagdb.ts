import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/diagdb -> { diag: 'db-ok', hasDbEnv } or { diag: 'db-fail', message }
 * TEMPORARY diagnostic: dynamically imports the shared ./_db module inside a
 * try/catch so a module-load failure surfaces as JSON with the real error
 * message instead of Vercel's opaque FUNCTION_INVOCATION_FAILED page.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const db = await import('./_db');
    const hasDbEnv = !!(
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING
    );
    db.json(res, 200, { diag: 'db-ok', hasDbEnv });
  } catch (err) {
    res.status(500).json({
      diag: 'db-fail',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
