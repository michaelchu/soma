import type { WorkerRequest, WorkerResponse } from './sqlite-worker';
import { SCHEMA_VERSION } from './sqlite-schema';

let worker: Worker | null = null;
let messageId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let initPromise: Promise<void> | null = null;
let databaseReady: Promise<void> | null = null;

// Reject all in-flight send() promises so callers don't hang indefinitely
// when the worker is terminated mid-flight (e.g. during freeze/visibilitychange).
function rejectPending(reason: string): void {
  const err = new Error(reason);
  for (const handler of pending.values()) {
    handler.reject(err);
  }
  pending.clear();
}

// Close the SQLite DB inside the worker and terminate it, releasing all OPFS
// file handles. A 500ms timeout is applied to the close RPC so the worker is
// always terminated and OPFS handles released even if the worker is unresponsive
// (common right before/after a freeze event on Android).
async function closeDatabase(): Promise<void> {
  if (!worker) return;
  try {
    await Promise.race([
      send({ type: 'close' }),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('close timed out')), 500)),
    ]);
  } catch {
    // Ignore - we always terminate in finally regardless.
  } finally {
    worker.terminate();
    worker = null;
    initPromise = null;
    databaseReady = null;
    rejectPending('Database closed - worker terminated');
  }
}

const onFreeze = () => {
  void closeDatabase().catch((err) => {
    console.error('Failed to close SQLite database on freeze:', err);
  });
};

const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    void closeDatabase().catch((err) => {
      console.error('Failed to close SQLite database on visibilitychange:', err);
    });
  }
};

if (typeof document !== 'undefined') {
  // freeze fires on Chrome for Android just before the renderer is frozen/killed.
  // This is the primary hook - it gives us a guaranteed chance to release OPFS
  // handles cleanly so they are not held by the OS when the PWA relaunches.
  document.addEventListener('freeze', onFreeze);

  // visibilitychange is a fallback for graceful backgrounds where freeze may
  // not fire (e.g. desktop Chrome, older Android versions).
  document.addEventListener('visibilitychange', onVisibilityChange);
}

// Terminate old worker on HMR so OPFS file handles are released.
// Also remove the lifecycle listeners to prevent duplicates across HMR reloads.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.removeEventListener('freeze', onFreeze);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    worker?.terminate();
    worker = null;
    initPromise = null;
    databaseReady = null;
    pending.clear();
  });
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./sqlite-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, result, error } = e.data;
      const handler = pending.get(id);
      if (handler) {
        pending.delete(id);
        if (error) {
          handler.reject(new Error(error));
        } else {
          handler.resolve(result);
        }
      }
    };
  }
  return worker;
}

function send(msg: Omit<WorkerRequest, 'id'>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...msg, id });
  });
}

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    // Reset initPromise on failure so the next call can retry rather than
    // permanently re-throwing the same rejection for the page lifetime.
    initPromise = send({ type: 'init' })
      .then(() => undefined)
      .catch((err) => {
        initPromise = null;
        throw err;
      });
  }
  return initPromise;
}

async function runMigrationsInternal(migrations: [number, string][]): Promise<void> {
  const rows = (await send({
    type: 'query',
    sql: 'SELECT MAX(version) as v FROM schema_version',
  })) as { v: number | null }[];
  const currentVersion = rows[0]?.v ?? null;

  // A new database is created from the current schema SQL, so it does not need
  // to replay historical ALTER statements. Record the current version instead.
  if (currentVersion === null) {
    await send({
      type: 'exec',
      sql: 'INSERT OR IGNORE INTO schema_version (version) VALUES (?)',
      params: [SCHEMA_VERSION],
    });
    await repairBloodPressureSchema();
    return;
  }

  let appliedVersion = currentVersion;
  for (const [targetVersion, sql] of migrations) {
    if (targetVersion > appliedVersion) {
      await send({
        type: 'transaction',
        statements: [{ sql }],
      });
      appliedVersion = targetVersion;
    }
  }
  await repairBloodPressureSchema();
}

// Version 2 was previously recorded before its ALTER statements ran. Repair any
// database left in that state so an interrupted upgrade is self-healing.
async function repairBloodPressureSchema(): Promise<void> {
  const columns = (await send({
    type: 'query',
    sql: 'PRAGMA table_info(blood_pressure_readings)',
  })) as { name: string }[];
  const existing = new Set(columns.map((column) => column.name));
  const additions: { sql: string }[] = [];
  const requiredColumns = [
    ['irregular_heartbeat', 'INTEGER DEFAULT 0'],
    ['body_position', 'TEXT'],
    ['pulse_pressure', 'INTEGER'],
    ['mean_arterial_pressure', 'REAL'],
    ['category', 'TEXT'],
  ];
  for (const [name, definition] of requiredColumns) {
    if (!existing.has(name)) {
      additions.push({
        sql: `ALTER TABLE blood_pressure_readings ADD COLUMN ${name} ${definition}`,
      });
    }
  }
  if (additions.length > 0) {
    additions.push({
      sql: 'CREATE INDEX IF NOT EXISTS idx_bp_readings_category ON blood_pressure_readings(category)',
    });
    additions.push({
      sql: 'INSERT OR REPLACE INTO schema_version (version) VALUES (2)',
    });
    await send({ type: 'transaction', statements: additions });
  }
}

export async function runMigrations(migrations: [number, string][]): Promise<void> {
  await ensureInit();
  await runMigrationsInternal(migrations);
}

export async function initDatabase(
  schemaSql: string,
  migrations: [number, string][] = []
): Promise<void> {
  if (!databaseReady) {
    databaseReady = (async () => {
      // Request persistent storage FIRST so OPFS data is protected from Android
      // eviction before we write anything.
      if (navigator.storage?.persist) {
        await navigator.storage.persist();
      }

      await ensureInit();
      await send({ type: 'exec', sql: schemaSql });
      if (migrations.length > 0) {
        await runMigrationsInternal(migrations);
      }
    })().catch((err) => {
      databaseReady = null;
      throw err;
    });
  }
  await databaseReady;
}

async function ensureReady(): Promise<void> {
  if (databaseReady) {
    await databaseReady;
  } else {
    await ensureInit();
  }
}

export async function execSQL(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  await ensureReady();
  return (await send({ type: 'exec', sql, params })) as { changes: number };
}

export async function transactionSQL(
  statements: { sql: string; params?: unknown[] }[]
): Promise<void> {
  await ensureReady();
  await send({ type: 'transaction', statements });
}

export async function querySQL<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureReady();
  return (await send({ type: 'query', sql, params })) as T[];
}

export interface DatabaseBackup {
  schemaVersion: number;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function exportData(): Promise<DatabaseBackup> {
  await ensureReady();
  const tables = (await send({ type: 'export' })) as Record<string, Record<string, unknown>[]>;
  return { schemaVersion: SCHEMA_VERSION, tables };
}

export async function importData(backup: DatabaseBackup): Promise<void> {
  await ensureReady();
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
  await send({ type: 'import', tables: backup.tables });
}
