import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExec = vi.fn<(...args: unknown[]) => Promise<{ changes: number }>>(async () => ({
  changes: 1,
}));
const mockClose = vi.fn(async () => undefined);
const mockOpen = vi.fn(async () => 1);
const mockStep = vi.fn<(...args: unknown[]) => Promise<number>>(async (..._args: unknown[]) => 101);
const mockStatements = vi.fn<(...args: unknown[]) => AsyncGenerator<unknown>>(async function* (
  ..._args: unknown[]
) {
  yield 1;
});
const mockColumnNames = vi.fn((..._args: unknown[]) => [] as string[]);
const mockColumn = vi.fn<(...args: unknown[]) => unknown>((..._args: unknown[]) => undefined);

vi.mock('wa-sqlite/dist/wa-sqlite-async.mjs', () => ({
  default: vi.fn(async () => ({})),
}));

vi.mock('wa-sqlite', () => ({
  SQLITE_ROW: 100,
  SQLITE_DONE: 101,
  Factory: () => ({
    vfs_register: vi.fn(),
    open_v2: mockOpen,
    exec: mockExec,
    close: mockClose,
    statements: mockStatements,
    bind_collection: vi.fn(),
    step: mockStep,
    changes: vi.fn(() => 1),
    column_names: mockColumnNames,
    column: mockColumn,
  }),
}));

vi.mock('wa-sqlite/src/examples/AccessHandlePoolVFS.js', () => ({
  AccessHandlePoolVFS: class {
    isReady = Promise.resolve();
  },
}));

describe('SQLite worker protocol', () => {
  beforeEach(() => {
    vi.resetModules();
    mockExec.mockClear();
    mockClose.mockClear();
    mockOpen.mockClear();
    mockStep.mockClear();
    mockStatements.mockClear();
    mockColumnNames.mockClear();
    mockColumn.mockClear();
    mockExec.mockImplementation(async () => ({ changes: 1 }));
    mockStep.mockImplementation(async () => 101);
    mockStatements.mockImplementation(async function* () {
      yield 1;
    });
  });

  it('initializes and closes the database through worker messages', async () => {
    const responses: unknown[] = [];
    const workerScope = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: (response: unknown) => responses.push(response),
    };
    vi.stubGlobal('self', workerScope);

    await import('./sqlite-worker');
    workerScope.onmessage!({ data: { id: 1, type: 'init' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    workerScope.onmessage!({ data: { id: 2, type: 'close' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(responses).toEqual([
      { id: 1, result: true },
      { id: 2, result: true },
    ]);
    expect(mockOpen).toHaveBeenCalledWith('soma.db');
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('rolls back a failed transaction and returns the original error', async () => {
    const responses: unknown[] = [];
    const workerScope = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: (response: unknown) => responses.push(response),
    };
    vi.stubGlobal('self', workerScope);

    await import('./sqlite-worker');
    workerScope.onmessage!({ data: { id: 1, type: 'init' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    mockStep.mockResolvedValueOnce(101).mockRejectedValueOnce(new Error('statement failed'));
    workerScope.onmessage!({
      data: { id: 2, type: 'transaction', statements: [{ sql: 'FAIL' }] },
    } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(responses[1]).toEqual({ id: 2, error: 'statement failed' });
    expect(mockStatements.mock.calls.some(([, sql]) => sql === 'ROLLBACK')).toBe(true);
  });

  it('rejects imports containing unknown tables before deleting local rows', async () => {
    const responses: unknown[] = [];
    const workerScope = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: (response: unknown) => responses.push(response),
    };
    vi.stubGlobal('self', workerScope);

    await import('./sqlite-worker');
    workerScope.onmessage!({ data: { id: 1, type: 'init' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    workerScope.onmessage!({
      data: { id: 2, type: 'import', tables: { not_a_table: [{ id: 'x' }] } },
    } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(responses[1]).toEqual({ id: 2, error: 'Backup contains unknown table: not_a_table' });
    expect(mockExec.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM'))).toBe(false);
  });

  it('rejects unknown backup columns before changing local data', async () => {
    const responses: unknown[] = [];
    const workerScope = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: (response: unknown) => responses.push(response),
    };
    vi.stubGlobal('self', workerScope);
    await import('./sqlite-worker');
    workerScope.onmessage!({ data: { id: 1, type: 'init' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const steps = new WeakMap<object, number>();
    mockStatements.mockImplementation(async function* (...args: unknown[]) {
      yield { sql: String(args[1]) };
    });
    mockStep.mockImplementation(async (...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      const count = steps.get(statement) ?? 0;
      steps.set(statement, count + 1);
      return count === 0 &&
        (statement.sql.includes('sqlite_master') || statement.sql.startsWith('PRAGMA'))
        ? 100
        : 101;
    });
    mockColumnNames.mockImplementation(() => ['name']);
    mockColumn.mockImplementation((...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      return statement.sql.includes('sqlite_master') ? 'activities' : 'id';
    });

    workerScope.onmessage!({
      data: { id: 2, type: 'import', tables: { activities: [{ unexpected: 'value' }] } },
    } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(responses[1]).toEqual({
      id: 2,
      error: 'Backup contains unknown column activities.unexpected',
    });
    expect(mockStatements.mock.calls.map(([, sql]) => String(sql))).not.toContain(
      'PRAGMA foreign_keys=OFF'
    );
  });

  it('rolls back failed imports and restores foreign-key checks', async () => {
    const responses: unknown[] = [];
    const workerScope = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: (response: unknown) => responses.push(response),
    };
    vi.stubGlobal('self', workerScope);
    await import('./sqlite-worker');
    workerScope.onmessage!({ data: { id: 1, type: 'init' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const steps = new WeakMap<object, number>();
    mockStatements.mockImplementation(async function* (...args: unknown[]) {
      yield { sql: String(args[1]) };
    });
    mockStep.mockImplementation(async (...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      if (statement.sql.includes('INSERT INTO')) throw new Error('insert failed');
      const count = steps.get(statement) ?? 0;
      steps.set(statement, count + 1);
      return count === 0 &&
        (statement.sql.includes('sqlite_master') || statement.sql.startsWith('PRAGMA'))
        ? 100
        : 101;
    });
    mockColumnNames.mockImplementation(() => ['name']);
    mockColumn.mockImplementation((...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      return statement.sql.includes('sqlite_master') ? 'activities' : 'id';
    });

    workerScope.onmessage!({
      data: { id: 2, type: 'import', tables: { activities: [{ id: 'activity-1' }] } },
    } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(responses[1]).toEqual({ id: 2, error: 'insert failed' });
    const executedSql = mockStatements.mock.calls.map(([, sql]) => String(sql));
    expect(executedSql).toContain('ROLLBACK');
    expect(executedSql).toContain('PRAGMA foreign_keys=ON');
  });

  it('serves query and export requests with rows from SQLite', async () => {
    const responses: unknown[] = [];
    const workerScope = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: (response: unknown) => responses.push(response),
    };
    vi.stubGlobal('self', workerScope);
    await import('./sqlite-worker');
    workerScope.onmessage!({ data: { id: 1, type: 'init' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statements = new WeakMap<object, number>();
    mockStatements.mockImplementation(async function* (...args: unknown[]) {
      yield { sql: String(args[1]) };
    });
    mockStep.mockImplementation(async (...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      const count = statements.get(statement) ?? 0;
      statements.set(statement, count + 1);
      return count === 0 ? 100 : 101;
    });
    mockColumnNames.mockImplementation((...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      return statement.sql.includes('sqlite_master') ? ['name'] : ['id'];
    });
    mockColumn.mockImplementation((...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      const index = args[1] as number;
      return index === 0
        ? String(statement.sql).includes('sqlite_master')
          ? 'activities'
          : 42
        : null;
    });

    workerScope.onmessage!({
      data: { id: 2, type: 'query', sql: 'SELECT id FROM activities', params: [42] },
    } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(responses[1]).toEqual({ id: 2, result: [{ id: 42 }] });

    workerScope.onmessage!({ data: { id: 3, type: 'export' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(responses[2]).toEqual({ id: 3, result: { activities: [{ id: 42 }] } });
  });

  it('validates and restores a well-formed table backup transactionally', async () => {
    const responses: unknown[] = [];
    const workerScope = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: (response: unknown) => responses.push(response),
    };
    vi.stubGlobal('self', workerScope);
    await import('./sqlite-worker');
    workerScope.onmessage!({ data: { id: 1, type: 'init' } } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const steps = new WeakMap<object, number>();
    mockStatements.mockImplementation(async function* (...args: unknown[]) {
      yield { sql: String(args[1]) };
    });
    mockStep.mockImplementation(async (...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      const count = steps.get(statement) ?? 0;
      steps.set(statement, count + 1);
      return count === 0 &&
        (statement.sql.includes('sqlite_master') || statement.sql.startsWith('PRAGMA'))
        ? 100
        : 101;
    });
    mockColumnNames.mockImplementation(() => ['name']);
    mockColumn.mockImplementation((...args: unknown[]) => {
      const statement = args[0] as { sql: string };
      return statement.sql.includes('sqlite_master') ? 'activities' : 'id';
    });

    workerScope.onmessage!({
      data: { id: 2, type: 'import', tables: { activities: [{ id: 'activity-1' }] } },
    } as MessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(responses[1]).toEqual({ id: 2, result: true });
    const executedSql = mockStatements.mock.calls.map(([, sql]) => String(sql));
    expect(executedSql).toContain('PRAGMA foreign_keys=OFF');
    expect(executedSql).toContain('COMMIT');
    expect(executedSql.some((sql) => sql.includes('INSERT INTO "activities"'))).toBe(true);
    expect(executedSql).toContain('PRAGMA foreign_keys=ON');
  });
});
