import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addReport,
  bulkInsertReports,
  deleteReport,
  getReports,
  updateMetric,
  updateReport,
} from './bloodTests';

const mockQuery = vi.fn();
const mockExec = vi.fn();
const mockTransaction = vi.fn();

vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' });

vi.mock('../sqlite', () => ({
  querySQL: (...args: unknown[]) => mockQuery(...args),
  execSQL: (...args: unknown[]) => mockExec(...args),
  transactionSQL: (...args: unknown[]) => mockTransaction(...args),
}));

const reportInput = {
  date: '2024-03-15',
  orderNumber: 'ORD-1',
  orderedBy: 'Dr. Test',
  notes: '<script>bad</script>',
  metrics: {
    glucose: { value: 5.2, unit: 'mmol/L', reference: { min: 3.9, max: 5.5 } },
  },
};

const reportRow = {
  id: 'report-1',
  report_date: '2024-03-15',
  order_number: 'ORD-1',
  ordered_by: 'Dr. Test',
  notes: null,
};

const metricRow = {
  id: 'metric-1',
  report_id: 'report-1',
  metric_key: 'glucose',
  value: 5.2,
  unit: 'mmol/L',
  reference_min: 3.9,
  reference_max: 5.5,
  reference_raw: null,
};

describe('blood test database layer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an empty report list without querying metrics', async () => {
    mockQuery.mockResolvedValue([]);

    const result = await getReports();

    expect(result).toEqual({ data: [], error: null });
    expect(mockQuery).toHaveBeenCalledOnce();
  });

  it('groups metrics into reports', async () => {
    mockQuery.mockResolvedValueOnce([reportRow]).mockResolvedValueOnce([metricRow]);

    const result = await getReports();

    expect(result.error).toBeNull();
    expect(result.data?.[0].metrics.glucose).toEqual({
      value: 5.2,
      unit: 'mmol/L',
      reference: { min: 3.9, max: 5.5 },
    });
  });

  it('inserts a report and metrics in one transaction', async () => {
    mockTransaction.mockResolvedValue(undefined);

    const result = await addReport(reportInput);

    expect(result.error).toBeNull();
    expect(result.data?.orderNumber).toBe('ORD-1');
    expect(mockTransaction).toHaveBeenCalledOnce();
    const statements = mockTransaction.mock.calls[0][0] as { sql: string; params: unknown[] }[];
    expect(statements).toHaveLength(2);
    expect(statements[0].params[4]).not.toContain('<script>');
  });

  it('does not write invalid reports', async () => {
    const result = await addReport({ ...reportInput, date: '' });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Date is required');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns an error when the report transaction rolls back', async () => {
    mockTransaction.mockRejectedValue(new Error('constraint failed'));

    const result = await addReport(reportInput);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('constraint failed');
  });

  it('updates report fields and maps the returned row', async () => {
    mockExec.mockResolvedValue({ changes: 1 });
    mockQuery.mockResolvedValue([reportRow]);

    const result = await updateReport('report-1', { orderNumber: 'ORD-2' });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: 'report-1', orderNumber: 'ORD-1' });
    expect(mockExec.mock.calls[0][0]).toContain('order_number=?');
  });

  it('upserts existing and new metrics', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 'metric-1' }]);
    mockExec.mockResolvedValue({ changes: 1 });
    expect(
      (await updateMetric('report-1', 'glucose', reportInput.metrics.glucose)).error
    ).toBeNull();
    expect(mockExec.mock.calls[0][0]).toContain('UPDATE blood_test_metrics');

    vi.clearAllMocks();
    mockQuery.mockResolvedValueOnce([]);
    expect(
      (await updateMetric('report-1', 'glucose', reportInput.metrics.glucose)).error
    ).toBeNull();
    expect(mockExec.mock.calls[0][0]).toContain('INSERT INTO blood_test_metrics');
  });

  it('handles delete failures', async () => {
    mockExec.mockRejectedValue(new Error('delete failed'));

    const result = await deleteReport('report-1');

    expect(result.error?.message).toBe('delete failed');
  });

  it('bulk inserts reports transactionally', async () => {
    mockTransaction.mockResolvedValue(undefined);

    const result = await bulkInsertReports([
      { date: '2024-03-15', metrics: reportInput.metrics },
      { date: '2024-03-16', metrics: {} },
    ]);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });
});
