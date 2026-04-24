/// <reference lib="webworker" />

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
// @ts-expect-error wa-sqlite example VFS has no type declarations
import { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js';
import wasmUrl from 'wa-sqlite/dist/wa-sqlite-async.wasm?url';

type SQLiteAPI = ReturnType<typeof SQLite.Factory>;
type SQLiteCompatibleType = number | string | Uint8Array | number[] | bigint | null;

let sqlite3: SQLiteAPI;
let db: number | undefined;

export interface WorkerRequest {
  id: number;
  type: 'init' | 'exec' | 'query' | 'export' | 'import' | 'close';
  sql?: string;
  params?: unknown[];
  tables?: Record<string, Record<string, unknown>[]>;
}

export interface WorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
}

// After Android kills the PWA process, the OS can hold OPFS createSyncAccessHandle()
// locks for several seconds before releasing them. Use 12 retries with capped exponential
// backoff (~10s total) to outlast that window on relaunch.
async function createVFS(retries = 12): Promise<AccessHandlePoolVFS> {
  for (let i = 0; i < retries; i++) {
    try {
      const vfs = new AccessHandlePoolVFS('soma-db');
      await vfs.isReady;
      return vfs;
    } catch (err) {
      if (i === retries - 1) throw err;
      // Backoff: 300, 600, 900, 1200, 1500, 1800, 2000, 2000... ≈ 10s total
      await new Promise((r) => setTimeout(r, Math.min(300 * (i + 1), 2000)));
    }
  }
  throw new Error('Failed to create VFS');
}

async function init(): Promise<void> {
  const module = await SQLiteESMFactory({ locateFile: () => wasmUrl });
  sqlite3 = SQLite.Factory(module);
  const vfs = await createVFS();
  sqlite3.vfs_register(vfs, true);
  db = await sqlite3.open_v2('soma.db');

  await sqlite3.exec(db, 'PRAGMA journal_mode=WAL');
  await sqlite3.exec(db, 'PRAGMA foreign_keys=ON');
}

async function exec(
  sql: string,
  params: SQLiteCompatibleType[] = []
): Promise<{ changes: number }> {
  for await (const stmt of sqlite3.statements(db!, sql)) {
    if (params.length > 0) {
      sqlite3.bind_collection(stmt, params as SQLiteCompatibleType[]);
    }
    await sqlite3.step(stmt);
  }
  return { changes: sqlite3.changes(db!) };
}

async function query(
  sql: string,
  params: SQLiteCompatibleType[] = []
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  for await (const stmt of sqlite3.statements(db!, sql)) {
    if (params.length > 0) {
      sqlite3.bind_collection(stmt, params as SQLiteCompatibleType[]);
    }
    const columns = sqlite3.column_names(stmt);
    while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        row[columns[i]] = sqlite3.column(stmt, i);
      }
      results.push(row);
    }
  }
  return results;
}

async function exportAllData(): Promise<Record<string, Record<string, unknown>[]>> {
  const tables = (await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_version'"
  )) as { name: string }[];

  const data: Record<string, Record<string, unknown>[]> = {};
  for (const { name } of tables) {
    data[name] = await query(`SELECT * FROM "${name}"`);
  }
  return data;
}

async function importAllData(tables: Record<string, Record<string, unknown>[]>): Promise<void> {
  const existingTables = (await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_version'"
  )) as { name: string }[];

  await exec('PRAGMA foreign_keys=OFF');

  for (const { name } of existingTables) {
    await exec(`DELETE FROM "${name}"`);
  }

  for (const [tableName, rows] of Object.entries(tables)) {
    if (rows.length === 0) continue;
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
    for (const row of rows) {
      await exec(
        sql,
        columns.map((c) => (row[c] as SQLiteCompatibleType) ?? null)
      );
    }
  }

  await exec('PRAGMA foreign_keys=ON');
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, type, sql, params, tables } = e.data;
  const response: WorkerResponse = { id };

  try {
    switch (type) {
      case 'init':
        await init();
        response.result = true;
        break;
      case 'exec':
        response.result = await exec(sql!, params as SQLiteCompatibleType[]);
        break;
      case 'query':
        response.result = await query(sql!, params as SQLiteCompatibleType[]);
        break;
      case 'export':
        response.result = await exportAllData();
        break;
      case 'import':
        if (tables) {
          await importAllData(tables);
        }
        response.result = true;
        break;
      case 'close':
        // Close the DB and release all OPFS file handles. Called proactively
        // before Android freezes/kills the process so locks are not held on relaunch.
        if (db !== undefined) {
          await sqlite3.close(db);
          db = undefined;
        }
        response.result = true;
        break;
    }
  } catch (err) {
    response.error = err instanceof Error ? err.message : String(err);
  }

  self.postMessage(response);
};
