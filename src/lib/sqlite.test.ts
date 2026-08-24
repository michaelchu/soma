import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MIGRATIONS, SCHEMA_SQL } from './sqlite-schema';

type Message = { id: number; type: string; sql?: string };

class FakeWorker {
  static messages: Message[] = [];
  static schemaVersion: number | null = null;
  static tableColumns = [
    'irregular_heartbeat',
    'body_position',
    'pulse_pressure',
    'mean_arterial_pressure',
    'category',
  ];
  onmessage: ((event: { data: { id: number; result?: unknown; error?: string } }) => void) | null =
    null;

  postMessage(message: Message) {
    FakeWorker.messages.push(message);
    queueMicrotask(() => {
      let result: unknown = true;
      if (message.type === 'query' && message.sql?.includes('MAX(version)')) {
        result = [{ v: FakeWorker.schemaVersion }];
      } else if (message.type === 'query' && message.sql?.includes('table_info')) {
        result = FakeWorker.tableColumns.map((name) => ({ name }));
      } else if (message.type === 'query') {
        result = [];
      } else if (message.type === 'export') {
        result = { activities: [] };
      }
      this.onmessage?.({ data: { id: message.id, result } });
    });
  }

  terminate() {}
}

describe('sqlite client lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWorker.messages = [];
    FakeWorker.schemaVersion = null;
    FakeWorker.tableColumns = [
      'irregular_heartbeat',
      'body_position',
      'pulse_pressure',
      'mean_arterial_pressure',
      'category',
    ];
    vi.stubGlobal('Worker', FakeWorker);
  });

  it('waits for schema initialization before serving queries', async () => {
    const sqlite = await import('./sqlite');
    const ready = sqlite.initDatabase(SCHEMA_SQL, MIGRATIONS);
    const query = sqlite.querySQL('SELECT * FROM activities');

    await Promise.all([ready, query]);

    const firstApplicationQuery = FakeWorker.messages.findIndex(
      (message) => message.type === 'query' && message.sql?.includes('FROM activities')
    );
    const schemaVersionInsert = FakeWorker.messages.findIndex((message) =>
      message.sql?.includes('INSERT OR IGNORE INTO schema_version')
    );
    expect(firstApplicationQuery).toBeGreaterThan(schemaVersionInsert);
  });

  it('serializes transaction requests through the client API', async () => {
    const sqlite = await import('./sqlite');
    await sqlite.initDatabase(SCHEMA_SQL, MIGRATIONS);

    await sqlite.transactionSQL([{ sql: 'INSERT INTO activities (id) VALUES (?)', params: ['a'] }]);

    expect(FakeWorker.messages.some((message) => message.type === 'transaction')).toBe(true);
  });

  it('runs historical migrations for a version 1 database', async () => {
    FakeWorker.schemaVersion = 1;
    const sqlite = await import('./sqlite');

    await sqlite.initDatabase(SCHEMA_SQL, MIGRATIONS);

    expect(FakeWorker.messages.filter((message) => message.type === 'transaction')).toHaveLength(1);
  });

  it('repairs a database marked v2 when required columns are missing', async () => {
    FakeWorker.schemaVersion = 2;
    FakeWorker.tableColumns = ['irregular_heartbeat', 'body_position'];
    const sqlite = await import('./sqlite');

    await sqlite.initDatabase(SCHEMA_SQL, MIGRATIONS);

    const repair = FakeWorker.messages.find((message) => message.type === 'transaction');
    expect(repair).toBeDefined();
  });

  it('wraps exports with the current schema version', async () => {
    const sqlite = await import('./sqlite');
    await sqlite.initDatabase(SCHEMA_SQL, MIGRATIONS);

    await expect(sqlite.exportData()).resolves.toEqual({
      schemaVersion: 2,
      tables: { activities: [] },
    });
  });

  it('rejects unsupported backups before opening the database', async () => {
    const sqlite = await import('./sqlite');

    await expect(sqlite.importData({ schemaVersion: 99, tables: {} })).rejects.toThrow(
      'Unsupported backup schema version'
    );
    expect(FakeWorker.messages).toHaveLength(0);
  });
});
