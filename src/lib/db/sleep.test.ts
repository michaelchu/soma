import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  addSleepEntry,
  deleteSleepEntry,
  getSleepEntries,
  updateSleepEntry,
  type SleepEntryInput,
} from './sleep';

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

const input: SleepEntryInput = {
  date: '2024-03-15',
  timezone: 'America/Toronto',
  totalSleepMinutes: 450,
  sleepStart: '22:30',
  sleepEnd: '06:30',
  hrvLow: 35,
  hrvHigh: 55,
  restingHr: 52,
  notes: 'Good sleep',
};

const row = {
  id: 'sleep-1',
  date: '2024-03-15',
  timezone: 'America/Toronto',
  total_sleep_minutes: 450,
  sleep_start: '22:30',
  sleep_end: '06:30',
  hrv_low: 35,
  hrv_high: 55,
  resting_hr: 52,
  lowest_hr_time: null,
  hr_drop_minutes: null,
  deep_sleep_pct: null,
  rem_sleep_pct: null,
  light_sleep_pct: null,
  awake_pct: null,
  skin_temp_avg: null,
  sleep_cycles_full: null,
  sleep_cycles_partial: null,
  movement_count: null,
  notes: 'Good sleep',
};

describe('sleep database layer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads entries and calculates overnight duration', async () => {
    mockGet.mockResolvedValue({ rows: [row] });

    const result = await getSleepEntries();

    expect(mockGet).toHaveBeenCalledWith('/api/sleep');
    expect(result.error).toBeNull();
    expect(result.data?.[0]).toMatchObject({ id: 'sleep-1', durationMinutes: 480 });
  });

  it('adds and maps a sleep entry', async () => {
    mockPost.mockResolvedValue({ row });

    const result = await addSleepEntry(input);

    expect(result.error).toBeNull();
    expect(result.data?.timezone).toBe('America/Toronto');
    expect(mockPost).toHaveBeenCalledOnce();
    expect((mockPost.mock.calls[0][1] as { timezone: string }).timezone).toBe('America/Toronto');
  });

  it('rejects invalid input before touching the API', async () => {
    const result = await addSleepEntry({ ...input, date: '' });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Date is required');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns an error when an insert fails', async () => {
    mockPost.mockRejectedValue(new Error('insert failed'));

    const result = await addSleepEntry(input);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('insert failed');
  });

  it('updates an entry and sends missing timezone as null', async () => {
    mockPut.mockResolvedValue({ row });

    await updateSleepEntry('sleep-1', { ...input, timezone: undefined });

    const body = mockPut.mock.calls[0][1] as { timezone: string | null };
    expect(body.timezone).toBeNull();
    expect(mockPut.mock.calls[0][0]).toContain('id=sleep-1');
  });

  it('returns an error when an update fails', async () => {
    mockPut.mockRejectedValue(new Error('update failed'));

    const result = await updateSleepEntry('sleep-1', input);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('update failed');
  });

  it('handles fetch and delete failures', async () => {
    mockGet.mockRejectedValue(new Error('fetch failed'));
    expect((await getSleepEntries()).error?.message).toBe('fetch failed');

    mockDelete.mockRejectedValue(new Error('delete failed'));
    expect((await deleteSleepEntry('sleep-1')).error?.message).toBe('delete failed');
  });
});
