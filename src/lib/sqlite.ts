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
    initPromise = send({ type: 'init' }).then(() => undefined);
  }
  return initPromise;
}

export async function initDatabase(schemaSql: string): Promise<void> {
  await ensureInit();
  await send({ type: 'exec', sql: schemaSql });

  // Request persistent storage to prevent eviction
  if (navigator.storage?.persist) {
    await navigator.storage.persist();
  }
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
