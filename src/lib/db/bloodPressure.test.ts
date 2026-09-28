import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReadings, addSession, deleteSession, updateSession } from './bloodPressure';
import type { BPSessionInput } from '@/types/bloodPressure';

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
      mockGet.mockResolvedValue({ rows: mockReadings });

      const result = await getReadings();

      expect(mockGet).toHaveBeenCalledWith('/api/blood-pressure');
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
      mockGet.mockResolvedValue({ rows: mockReadings });

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
      mockPost.mockResolvedValue({ sessionId: 'mock-session-uuid', rows: insertedRows });

      const result = await addSession(mockSessionInput);

      expect(result.data!.sessionId).toBe('mock-session-uuid');
      expect(result.data!.readingCount).toBe(2);
    });

    it('validates input before adding', async () => {
      const result = await addSession({ date: '', timeOfDay: 'morning', readings: [] });
      expect(result.error!.message).toContain('Date is required');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('validates readings', async () => {
      const result = await addSession({
        date: '2024-03-15',
        timeOfDay: 'morning',
        readings: [{ systolic: 50, diastolic: 80 }],
      });
      expect(result.error).toBeDefined();
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('sanitizes notes and sends arm for server-side cuff mapping', async () => {
      mockPost.mockResolvedValue({
        sessionId: 'mock-session-uuid',
        rows: [{ ...mockReadingRow, session_id: 'mock-session-uuid' }],
      });

      await addSession({
        date: '2024-03-15',
        timeOfDay: 'morning',
        readings: [{ systolic: 120, diastolic: 80, arm: 'L' }],
        notes: '<script>xss</script>',
      });

      const body = mockPost.mock.calls[0][1] as {
        notes: string;
        session: { readings: Array<{ arm: string | null }> };
      };
      expect(body.notes).not.toContain('<script>');
      expect(body.session.readings[0].arm).toBe('L');
    });

    it('returns an error when the request fails', async () => {
      mockPost.mockRejectedValue(new Error('request failed'));

      const result = await addSession(mockSessionInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('request failed');
    });
  });

  describe('deleteSession', () => {
    it('deletes session', async () => {
      mockDelete.mockResolvedValue({ ok: true });

      const result = await deleteSession('session-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/blood-pressure?sessionId=session-1');
      expect(result.error).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('replaces readings and recalculates session averages', async () => {
      mockPut.mockResolvedValue({
        sessionId: 'session-1',
        rows: [
          { ...mockReadingRow, systolic: 120, diastolic: 80, pulse: 70 },
          {
            ...mockReadingRow,
            id: 'reading-2',
            systolic: 130,
            diastolic: 90,
            pulse: 80,
            cuff_location: 'right_arm',
          },
        ],
      });

      const result = await updateSession('session-1', mockSessionInput);

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        sessionId: 'session-1',
        systolic: 125,
        diastolic: 85,
        pulse: 75,
        readingCount: 2,
      });
      expect(result.data?.readings[1].arm).toBe('R');
      expect(mockPut.mock.calls[0][0]).toContain('sessionId=session-1');
    });

    it('returns the request error', async () => {
      mockPut.mockRejectedValue(new Error('replace failed'));

      const result = await updateSession('session-1', mockSessionInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('replace failed');
    });
  });
});
