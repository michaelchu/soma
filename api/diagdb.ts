import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from './_db';

/**
 * GET /api/diagdb -> { diag: 'db-ok', hasDbEnv: boolean }
 * TEMPORARY diagnostic: imports the shared ./_db module (which pulls in
 * @neondatabase/serverless) but never opens a connection. Tests whether the
 * shared module chain loads in the function runtime. Reports only whether a
 * database URL env var is present, never its value.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const hasDbEnv = !!(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING
  );
  json(res, 200, { diag: 'db-ok', hasDbEnv });
}
