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
  type: 'init' | 'exec' | 'query' | 'transaction' | 'export' | 'import' | 'close';
  sql?: string;
  params?: unknown[];
  statements?: { sql: string; params?: unknown[] }[];
  tables?: Record<string, Record<string, unknown>[]>;
}

export interface WorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
}

// After Android kills the PWA process, the OS can hold OPFS createSyncAccessHandle()
// locks for several seconds before releasing them. Retry with linear backoff capped at
// 2s per attempt (300, 600, 900 ... 2000, 2000 ms) for a ~16s total budget.
async function createVFS(retries = 12): Promise<AccessHandlePoolVFS> {
  for (let i = 0; i < retries; i++) {
    try {
      const vfs = new AccessHandlePoolVFS('soma-db');
      await vfs.isReady;
      return vfs;
    } catch (err) {
      if (i === retries - 1) throw err;
      // Linear backoff capped at 2s: 300, 600, 900, 1200, 1500, 1800, 2000, 2000...
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

function assertOpen(): void {
  if (db === undefined) throw new Error('Database is closed');
}

async function exec(
  sql: string,
  params: SQLiteCompatibleType[] = []
): Promise<{ changes: number }> {
  assertOpen();
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
  assertOpen();
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

async function transaction(
  statements: { sql: string; params?: SQLiteCompatibleType[] }[]
): Promise<void> {
  await exec('BEGIN IMMEDIATE');
  try {
    for (const statement of statements) {
      await exec(statement.sql, statement.params ?? []);
    }
    await exec('COMMIT');
  } catch (err) {
    try {
      await exec('ROLLBACK');
    } catch {
      // Preserve the original error if rollback itself fails.
    }
    throw err;
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
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

  const tableNames = new Set(existingTables.map(({ name }) => name));
  const tableColumns = new Map<string, Set<string>>();
  for (const { name } of existingTables) {
    const columns = (await query(`PRAGMA table_info(${quoteIdentifier(name)})`)) as {
      name: string;
    }[];
    tableColumns.set(name, new Set(columns.map((column) => column.name)));
  }

  const importStatements: { sql: string; params: SQLiteCompatibleType[] }[] = [];
  for (const [tableName, rows] of Object.entries(tables)) {
    if (!tableNames.has(tableName)) {
      throw new Error(`Backup contains unknown table: ${tableName}`);
    }
    if (!Array.isArray(rows)) {
      throw new Error(`Backup table is not an array: ${tableName}`);
    }

    const allowedColumns = tableColumns.get(tableName)!;
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Backup contains an invalid row in ${tableName}`);
      }
      const columns = Object.keys(row);
      if (columns.length === 0) continue;
      const unknownColumn = columns.find((column) => !allowedColumns.has(column));
      if (unknownColumn) {
        throw new Error(`Backup contains unknown column ${tableName}.${unknownColumn}`);
      }
      importStatements.push({
        sql: `INSERT INTO ${quoteIdentifier(tableName)} (${columns
          .map(quoteIdentifier)
          .join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        params: columns.map((column) => (row[column] as SQLiteCompatibleType) ?? null),
      });
    }
  }

  // Temporarily disable FK checks so backups can be restored in arbitrary table order.
  // The transaction guarantees the existing database is preserved if validation or any
  // insert fails, and the finally block always restores the connection setting.
  await exec('PRAGMA foreign_keys=OFF');
  try {
    await exec('BEGIN IMMEDIATE');
    // Delete children first to support the current foreign-key relationships.
    for (const { name } of [...existingTables].reverse()) {
      await exec(`DELETE FROM ${quoteIdentifier(name)}`);
    }
    for (const statement of importStatements) {
      await exec(statement.sql, statement.params);
    }
    await exec('COMMIT');
  } catch (err) {
    try {
      await exec('ROLLBACK');
    } catch {
      // Preserve the original error if rollback itself fails.
    }
    throw err;
  } finally {
    await exec('PRAGMA foreign_keys=ON');
  }
}

async function handleMessage(e: MessageEvent<WorkerRequest>): Promise<void> {
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
      case 'transaction':
        await transaction(
          (e.data.statements ?? []).map((statement) => ({
            sql: statement.sql,
            params: statement.params as SQLiteCompatibleType[] | undefined,
          }))
        );
        response.result = true;
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
}

// wa-sqlite uses one database handle. Queue requests so async statement stepping,
// transactions, and close cannot interleave on that handle.
let requestQueue = Promise.resolve();
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  requestQueue = requestQueue.catch(() => undefined).then(() => handleMessage(e));
};
