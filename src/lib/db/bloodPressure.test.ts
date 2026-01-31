import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getReadings, addSession, deleteSession } from './bloodPressure';
import { supabase } from '../supabase';
import type { BPSessionInput } from '@/types/bloodPressure';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'mock-session-uuid',
});

// Mock the supabase client
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('bloodPressure database layer', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockReadingRow = {
    id: 'reading-1',
    user_id: 'user-123',
    session_id: 'session-1',
    recorded_at: '2024-03-15T10:00:00Z',
    systolic: 120,
    diastolic: 80,
    pulse: 72,
    notes: 'Morning reading',
    cuff_location: 'left_arm',
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
  };

  const mockSessionInput: BPSessionInput = {
    datetime: '2024-03-15T10:00:00',
    readings: [
      { systolic: 120, diastolic: 80, pulse: 72, arm: 'L' },
      { systolic: 118, diastolic: 78, pulse: 70, arm: 'L' },
    ],
    notes: 'Morning readings',
  };

  // Helper to create mock query builder
  const createMockQueryBuilder = () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    return queryBuilder;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReadings', () => {
    it('returns sessions for authenticated user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: [mockReadingRow],
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getReadings();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].sessionId).toBe('session-1');
      expect(result.data![0].systolic).toBe(120);
      expect(result.data![0].diastolic).toBe(80);
    });

    it('returns error for unauthenticated user', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await getReadings();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(new Error('Not authenticated'));
    });

    it('handles database errors', async () => {
      const mockError = new Error('Database error');
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: null,
        error: mockError,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getReadings();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('groups readings by session_id', async () => {
      const mockReadings = [
        { ...mockReadingRow, id: 'reading-1', session_id: 'session-1', systolic: 120 },
        { ...mockReadingRow, id: 'reading-2', session_id: 'session-1', systolic: 118 },
        { ...mockReadingRow, id: 'reading-3', session_id: 'session-2', systolic: 130 },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockReadings,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getReadings();

      expect(result.data).toHaveLength(2);
      // Session 1 should have 2 readings
      const session1 = result.data!.find((s) => s.sessionId === 'session-1');
      expect(session1?.readingCount).toBe(2);
      expect(session1?.readings).toHaveLength(2);
    });

    it('calculates session averages correctly', async () => {
      const mockReadings = [
        { ...mockReadingRow, id: 'reading-1', systolic: 120, diastolic: 80, pulse: 70 },
        { ...mockReadingRow, id: 'reading-2', systolic: 130, diastolic: 90, pulse: 80 },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockReadings,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getReadings();

      expect(result.data![0].systolic).toBe(125); // (120+130)/2
      expect(result.data![0].diastolic).toBe(85); // (80+90)/2
      expect(result.data![0].pulse).toBe(75); // (70+80)/2
    });

    it('handles readings without pulse', async () => {
      const mockReadings = [
        { ...mockReadingRow, id: 'reading-1', pulse: null },
        { ...mockReadingRow, id: 'reading-2', pulse: null },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockReadings,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getReadings();

      expect(result.data![0].pulse).toBeNull();
    });

    it('maps cuff_location to arm correctly', async () => {
      const mockReadings = [
        { ...mockReadingRow, id: 'reading-1', cuff_location: 'left_arm' },
        { ...mockReadingRow, id: 'reading-2', cuff_location: 'right_arm' },
        { ...mockReadingRow, id: 'reading-3', cuff_location: 'left_wrist' },
        { ...mockReadingRow, id: 'reading-4', cuff_location: null },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockReadings,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getReadings();

      const readings = result.data![0].readings;
      expect(readings[0].arm).toBe('L');
      expect(readings[1].arm).toBe('R');
      expect(readings[2].arm).toBe('L');
      expect(readings[3].arm).toBeNull();
    });
  });

  describe('addSession', () => {
    it('adds session for authenticated user', async () => {
      const insertedRows = [
        { ...mockReadingRow, id: 'reading-1', session_id: 'mock-session-uuid' },
        {
          ...mockReadingRow,
          id: 'reading-2',
          session_id: 'mock-session-uuid',
          systolic: 118,
          diastolic: 78,
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.select.mockResolvedValue({
        data: insertedRows,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await addSession(mockSessionInput);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.sessionId).toBe('mock-session-uuid');
      expect(result.data!.readingCount).toBe(2);
    });

    it('returns error for unauthenticated user', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await addSession(mockSessionInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('validates input before adding', async () => {
      const invalidInput: BPSessionInput = {
        datetime: '',
        readings: [{ systolic: 120, diastolic: 80 }],
      };

      const result = await addSession(invalidInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Datetime is required');
    });

    it('validates readings', async () => {
      const invalidInput: BPSessionInput = {
        datetime: '2024-03-15T10:00:00',
        readings: [{ systolic: 50, diastolic: 80 }], // systolic < diastolic
      };

      const result = await addSession(invalidInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('rejects empty readings array', async () => {
      const invalidInput: BPSessionInput = {
        datetime: '2024-03-15T10:00:00',
        readings: [],
      };

      const result = await addSession(invalidInput);

      expect(result.data).toBeNull();
      expect(result.error!.message).toContain('At least one reading is required');
    });

    it('sanitizes notes before inserting', async () => {
      const insertedRows = [{ ...mockReadingRow, session_id: 'mock-session-uuid' }];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.select.mockResolvedValue({
        data: insertedRows,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const inputWithHtml: BPSessionInput = {
        datetime: '2024-03-15T10:00:00',
        readings: [{ systolic: 120, diastolic: 80 }],
        notes: '<script>alert("xss")</script>',
      };

      await addSession(inputWithHtml);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall[0].notes).not.toContain('<script>');
    });

    it('only adds notes to first reading', async () => {
      const insertedRows = [
        { ...mockReadingRow, id: 'reading-1', session_id: 'mock-session-uuid', notes: 'Notes' },
        { ...mockReadingRow, id: 'reading-2', session_id: 'mock-session-uuid', notes: null },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.select.mockResolvedValue({
        data: insertedRows,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await addSession(mockSessionInput);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall[0].notes).toBeDefined();
      expect(insertCall[1].notes).toBeNull();
    });

    it('maps arm to cuff_location correctly', async () => {
      const insertedRows = [{ ...mockReadingRow, session_id: 'mock-session-uuid' }];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.select.mockResolvedValue({
        data: insertedRows,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const input: BPSessionInput = {
        datetime: '2024-03-15T10:00:00',
        readings: [
          { systolic: 120, diastolic: 80, arm: 'L' },
          { systolic: 118, diastolic: 78, arm: 'R' },
        ],
      };

      await addSession(input);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall[0].cuff_location).toBe('left_arm');
      expect(insertCall[1].cuff_location).toBe('right_arm');
    });
  });

  describe('deleteSession', () => {
    it('deletes session for authenticated user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder) // First eq (session_id)
        .mockResolvedValueOnce({ error: null }); // Second eq (user_id)

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await deleteSession('session-1');

      expect(result.error).toBeNull();
    });

    it('returns error for unauthenticated user', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await deleteSession('session-1');

      expect(result.error?.message).toBe('Not authenticated');
    });

    it('handles database errors', async () => {
      const mockError = new Error('Delete failed');
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ error: mockError });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await deleteSession('session-1');

      expect(result.error).toEqual(mockError);
    });

    it('filters by both session_id and user_id for security', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ error: null });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await deleteSession('session-1');

      expect(supabase.from).toHaveBeenCalledWith('blood_pressure_readings');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('session_id', 'session-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
