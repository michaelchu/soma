import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addReport,
  bulkInsertReports,
  deleteReport,
  getReports,
  updateMetric,
  updateReport,
} from './bloodTests';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../api', () => ({
  apiGet: (...args: unknown[]) => mockGet(...args),
  apiPost: (...args: unknown[]) => mockPost(...args),
  apiPut: (...args: unknown[]) => mockPut(...args),
  apiDelete: (...args: unknown[]) => mockDelete(...args),
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

  it('returns an empty report list without fetching metrics', async () => {
    mockGet.mockResolvedValue({ reports: [], metrics: [] });

    const result = await getReports();

    expect(result).toEqual({ data: [], error: null });
    expect(mockGet).toHaveBeenCalledWith('/api/blood-tests');
  });

  it('groups metrics into reports', async () => {
    mockGet.mockResolvedValue({ reports: [reportRow], metrics: [metricRow] });

    const result = await getReports();

    expect(result.error).toBeNull();
    expect(result.data?.[0].metrics.glucose).toEqual({
      value: 5.2,
      unit: 'mmol/L',
      reference: { min: 3.9, max: 5.5 },
    });
  });

  it('creates a report with metrics via the API', async () => {
    mockPost.mockResolvedValue({ reportId: 'generated-id' });

    const result = await addReport(reportInput);

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('generated-id');
    expect(result.data?.orderNumber).toBe('ORD-1');
    expect(mockPost).toHaveBeenCalledOnce();
    const body = mockPost.mock.calls[0][1] as { report: { notes: string } };
    expect(body.report.notes).not.toContain('<script>');
  });

  it('does not write invalid reports', async () => {
    const result = await addReport({ ...reportInput, date: '' });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Date is required');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns an error when the API request fails', async () => {
    mockPost.mockRejectedValue(new Error('constraint failed'));

    const result = await addReport(reportInput);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('constraint failed');
  });

  it('updates report fields and maps the returned row', async () => {
    mockPut.mockResolvedValue({ report: reportRow });

    const result = await updateReport('report-1', { orderNumber: 'ORD-2' });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: 'report-1', orderNumber: 'ORD-1' });
    expect(mockPut.mock.calls[0][0]).toContain('id=report-1');
    const body = mockPut.mock.calls[0][1] as { orderNumber: string };
    expect(body.orderNumber).toBe('ORD-2');
  });

  it('upserts metrics through the metrics endpoint', async () => {
    mockPost.mockResolvedValue({ ok: true });

    const result = await updateMetric('report-1', 'glucose', reportInput.metrics.glucose);

    expect(result.error).toBeNull();
    expect(mockPost).toHaveBeenCalledWith('/api/blood-tests-metrics', {
      reportId: 'report-1',
      metricKey: 'glucose',
      data: reportInput.metrics.glucose,
    });
  });

  it('handles delete failures', async () => {
    mockDelete.mockRejectedValue(new Error('delete failed'));

    const result = await deleteReport('report-1');

    expect(result.error?.message).toBe('delete failed');
  });

  it('bulk inserts reports through the bulk endpoint', async () => {
    const inserted = [
      { id: 'r1', report_date: '2024-03-15', order_number: null, ordered_by: null, notes: null },
      { id: 'r2', report_date: '2024-03-16', order_number: null, ordered_by: null, notes: null },
    ];
    mockPost.mockResolvedValue({ reports: inserted });

    const result = await bulkInsertReports([
      { date: '2024-03-15', metrics: reportInput.metrics },
      { date: '2024-03-16', metrics: {} },
    ]);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/blood-tests-bulk',
      expect.objectContaining({ reports: expect.any(Array) })
    );
  });
});
