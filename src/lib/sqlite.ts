import type { WorkerRequest, WorkerResponse } from './sqlite-worker';

let worker: Worker | null = null;
let messageId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let initPromise: Promise<void> | null = null;

// Terminate old worker on HMR so OPFS file handles are released
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    worker?.terminate();
    worker = null;
    initPromise = null;
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

// Close the SQLite DB inside the worker and terminate it, releasing all OPFS
// file handles. Called proactively on page freeze/hide so Android does not
// hold OS-level locks after the process is suspended or killed.
async function closeDatabase(): Promise<void> {
  if (!worker) return;
  try {
    await send({ type: 'close' });
  } finally {
    worker.terminate();
    worker = null;
    initPromise = null;
    pending.clear();
  }
}

if (typeof document !== 'undefined') {
  // freeze fires on Chrome for Android just before the renderer is frozen/killed.
  // This is the primary hook — it gives us a guaranteed chance to release OPFS
  // handles cleanly so they are not held by the OS when the PWA relaunches.
  document.addEventListener('freeze', () => {
    closeDatabase();
  });

  // visibilitychange is a fallback for graceful backgrounds where freeze may
  // not fire (e.g. desktop Chrome, older Android versions).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      closeDatabase();
    }
  });
}

export async function initDatabase(schemaSql: string): Promise<void> {
  // Request persistent storage FIRST so OPFS data is protected from Android
  // eviction before we write anything.
  if (navigator.storage?.persist) {
    await navigator.storage.persist();
  }

  await ensureInit();
  await send({ type: 'exec', sql: schemaSql });
}

export async function runMigrations(migrations: [number, string][]): Promise<void> {
  await ensureInit();
  const rows = (await send({
    type: 'query',
    sql: 'SELECT MAX(version) as v FROM schema_version',
  })) as { v: number | null }[];
  const currentVersion = rows[0]?.v ?? 0;

  for (const [targetVersion, sql] of migrations) {
    if (targetVersion > currentVersion) {
      await send({ type: 'exec', sql });
    }
  }
}

export async function execSQL(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  await ensureInit();
  return (await send({ type: 'exec', sql, params })) as { changes: number };
}

export async function querySQL<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureInit();
  return (await send({ type: 'query', sql, params })) as T[];
}

export async function exportData(): Promise<Record<string, Record<string, unknown>[]>> {
  await ensureInit();
  return (await send({ type: 'export' })) as Record<string, Record<string, unknown>[]>;
}

export async function importData(tables: Record<string, Record<string, unknown>[]>): Promise<void> {
  await ensureInit();
  await send({ type: 'import', tables });
}
