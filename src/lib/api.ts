/* eslint-disable no-undef */
/**
 * HTTP client for the Soma server API.
 *
 * The app's data now lives in Postgres (Neon), accessed through Vercel
 * serverless functions under /api/*. The database credentials stay on the
 * server — the browser only ever talks to these same-origin endpoints.
 */

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      cache: 'no-store',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? `Network error: ${err.message}` : 'Network error');
  }
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Ignore JSON parse errors and fall back to the status message.
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export interface DatabaseBackup {
  schemaVersion: number;
  tables: Record<string, Record<string, unknown>[]>;
}

export const SCHEMA_VERSION = 2;

/** Download a full backup of the server database (used by Google Drive backup). */
export async function exportData(): Promise<DatabaseBackup> {
  return apiGet<DatabaseBackup>('/api/backup');
}

/** Replace the server database contents from a backup (used by Google Drive restore). */
export async function importData(backup: DatabaseBackup): Promise<void> {
  if (!backup || typeof backup !== 'object' || !backup.tables) {
    throw new Error('Invalid backup format');
  }
  if (
    typeof backup.schemaVersion !== 'number' ||
    backup.schemaVersion < 1 ||
    backup.schemaVersion > SCHEMA_VERSION
  ) {
    throw new Error(`Unsupported backup schema version: ${String(backup.schemaVersion)}`);
  }
  await apiPost<{ ok: boolean }>('/api/backup', backup);
}

/** Startup connectivity check — rejects when the API/database is unreachable. */
export async function checkApiHealth(): Promise<void> {
  await apiGet<{ ok: boolean }>('/api/health');
}
