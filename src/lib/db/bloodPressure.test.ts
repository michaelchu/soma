import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReadings, addSession, deleteSession } from './bloodPressure';
import type { BPSessionInput } from '@/types/bloodPressure';

vi.stubGlobal('crypto', { randomUUID: () => 'mock-session-uuid' });

const mockQuery = vi.fn();
const mockExec = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../sqlite', () => ({
  querySQL: (...args: unknown[]) => mockQuery(...args),
  execSQL: (...args: unknown[]) => mockExec(...args),
  transactionSQL: (...args: unknown[]) => mockTransaction(...args),
}));

describe('bloodPressure database layer', () => {
  const mockReadingRow = {
    id: 'reading-1',
    session_id: 'session-1',
    recorded_date: '2024-03-15',
    time_of_day: 'morning',
    systolic: 120,
    diastolic: 80,
    pulse: 72,
    notes: 'Morning reading',
    cuff_location: 'left_arm',
  };

  const mockSessionInput: BPSessionInput = {
    date: '2024-03-15',
    timeOfDay: 'morning',
    readings: [
      { systolic: 120, diastolic: 80, pulse: 72, arm: 'L' },
      { systolic: 118, diastolic: 78, pulse: 70, arm: 'L' },
    ],
    notes: 'Morning readings',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReadings', () => {
    it('returns sessions grouped by session_id with averages', async () => {
      const mockReadings = [
        { ...mockReadingRow, id: 'r1', systolic: 120, diastolic: 80, pulse: 70 },
        { ...mockReadingRow, id: 'r2', systolic: 130, diastolic: 90, pulse: 80 },
      ];
      mockQuery.mockResolvedValue(mockReadings);

      const result = await getReadings();

      expect(result.data).toHaveLength(1);
      expect(result.data![0].systolic).toBe(125); // Average
      expect(result.data![0].diastolic).toBe(85);
      expect(result.data![0].pulse).toBe(75);
      expect(result.data![0].readingCount).toBe(2);
    });

    it('maps cuff_location to arm correctly', async () => {
      const mockReadings = [
        { ...mockReadingRow, cuff_location: 'left_arm' },
        { ...mockReadingRow, id: 'r2', cuff_location: 'right_arm' },
        { ...mockReadingRow, id: 'r3', cuff_location: null },
      ];
      mockQuery.mockResolvedValue(mockReadings);

      const result = await getReadings();
      const readings = result.data![0].readings;

      expect(readings[0].arm).toBe('L');
      expect(readings[1].arm).toBe('R');
      expect(readings[2].arm).toBeNull();
    });
  });

  describe('addSession', () => {
    it('adds session with multiple readings', async () => {
      const insertedRows = [
        { ...mockReadingRow, session_id: 'mock-session-uuid' },
        {
          ...mockReadingRow,
          id: 'r2',
          session_id: 'mock-session-uuid',
          systolic: 118,
          diastolic: 78,
        },
      ];
      mockTransaction.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue(insertedRows);

      const result = await addSession(mockSessionInput);

      expect(result.data!.sessionId).toBe('mock-session-uuid');
      expect(result.data!.readingCount).toBe(2);
    });

    it('validates input before adding', async () => {
      const result = await addSession({ date: '', timeOfDay: 'morning', readings: [] });
      expect(result.error!.message).toContain('Date is required');
    });

    it('validates readings', async () => {
      const result = await addSession({
        date: '2024-03-15',
        timeOfDay: 'morning',
        readings: [{ systolic: 50, diastolic: 80 }],
      });
      expect(result.error).toBeDefined();
    });

    it('sanitizes notes and maps arm to cuff_location', async () => {
      mockTransaction.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([{ ...mockReadingRow, session_id: 'mock-session-uuid' }]);

      await addSession({
        date: '2024-03-15',
        timeOfDay: 'morning',
        readings: [{ systolic: 120, diastolic: 80, arm: 'L' }],
        notes: '<script>xss</script>',
      });

      // Check the transactional insert has sanitized notes and correct cuff location.
      const firstInsertParams = mockTransaction.mock.calls[0][0][0].params as unknown[];
      expect(firstInsertParams[7]).not.toContain('<script>'); // notes param
      expect(firstInsertParams[8]).toBe('left_arm'); // cuff_location param
    });

    it('returns an error when the session transaction fails', async () => {
      mockTransaction.mockRejectedValue(new Error('transaction failed'));

      const result = await addSession(mockSessionInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('transaction failed');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('deletes session', async () => {
      mockExec.mockResolvedValue({ changes: 1, lastId: 0 });

      const result = await deleteSession('session-1');

      expect(result.error).toBeNull();
    });
  });
});
