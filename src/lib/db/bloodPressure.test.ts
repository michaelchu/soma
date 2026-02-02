import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getReadings, addSession, deleteSession } from './bloodPressure';
import { supabase } from '../supabase';
import type { BPSessionInput } from '@/types/bloodPressure';

vi.stubGlobal('crypto', { randomUUID: () => 'mock-session-uuid' });

vi.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

describe('bloodPressure database layer', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockReadingRow = {
    id: 'reading-1',
    user_id: 'user-123',
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

  const createMockQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test authentication once
  it('returns error for unauthenticated user', async () => {
    (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null } });

    expect((await getReadings()).error?.message).toBe('Not authenticated');
    expect((await addSession(mockSessionInput)).error?.message).toBe('Not authenticated');
    expect((await deleteSession('session-1')).error?.message).toBe('Not authenticated');
  });

  describe('getReadings', () => {
    it('returns sessions grouped by session_id with averages', async () => {
      const mockReadings = [
        { ...mockReadingRow, id: 'r1', systolic: 120, diastolic: 80, pulse: 70 },
        { ...mockReadingRow, id: 'r2', systolic: 130, diastolic: 90, pulse: 80 },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({ data: mockReadings, error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

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
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({ data: mockReadings, error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getReadings();
      const readings = result.data![0].readings;

      expect(readings[0].arm).toBe('L');
      expect(readings[1].arm).toBe('R');
      expect(readings[2].arm).toBeNull();
    });

    it('filters by user_id for security', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await getReadings();

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
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
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.select.mockResolvedValue({ data: insertedRows, error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

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
        readings: [{ systolic: 50, diastolic: 80 }], // systolic < diastolic
      });
      expect(result.error).toBeDefined();
    });

    it('sanitizes notes and maps arm to cuff_location', async () => {
      const insertedRows = [{ ...mockReadingRow, session_id: 'mock-session-uuid' }];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.select.mockResolvedValue({ data: insertedRows, error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await addSession({
        date: '2024-03-15',
        timeOfDay: 'morning',
        readings: [{ systolic: 120, diastolic: 80, arm: 'L' }],
        notes: '<script>xss</script>',
      });

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall[0].notes).not.toContain('<script>');
      expect(insertCall[0].cuff_location).toBe('left_arm');
    });
  });

  describe('deleteSession', () => {
    it('deletes session', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await deleteSession('session-1');

      expect(result.error).toBeNull();
    });

    it('filters by both session_id and user_id for security', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await deleteSession('session-1');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('session_id', 'session-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
