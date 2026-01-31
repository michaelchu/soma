import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getActivities, addActivity, updateActivity, deleteActivity } from './activity';
import { supabase } from '../supabase';
import type { ActivityInput } from '@/types/activity';

// Mock the supabase client
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('activity database layer', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockActivityRow = {
    id: 'activity-1',
    user_id: 'user-123',
    date: '2024-03-15',
    time_of_day: 'morning',
    activity_type: 'walking',
    duration_minutes: 30,
    intensity: 3,
    notes: 'Great walk!',
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
  };

  const mockActivityInput: ActivityInput = {
    date: '2024-03-15',
    timeOfDay: 'morning',
    activityType: 'walking',
    durationMinutes: 30,
    intensity: 3,
    notes: 'Great walk!',
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

  describe('getActivities', () => {
    it('returns activities for authenticated user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: [mockActivityRow],
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getActivities();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({
        id: 'activity-1',
        userId: 'user-123',
        date: '2024-03-15',
        timeOfDay: 'morning',
        activityType: 'walking',
        durationMinutes: 30,
        intensity: 3,
        notes: 'Great walk!',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z',
      });
    });

    it('returns error for unauthenticated user', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await getActivities();

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

      const result = await getActivities();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('filters by user_id and orders by date', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await getActivities();

      expect(supabase.from).toHaveBeenCalledWith('activities');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
    });
  });

  describe('addActivity', () => {
    it('adds activity for authenticated user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: mockActivityRow,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await addActivity(mockActivityInput);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.activityType).toBe('walking');
    });

    it('returns error for unauthenticated user', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await addActivity(mockActivityInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('validates input before adding', async () => {
      const invalidInput: ActivityInput = {
        date: '',
        timeOfDay: 'morning',
        activityType: 'walking',
        durationMinutes: 30,
        intensity: 3,
      };

      const result = await addActivity(invalidInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Date is required');
    });

    it('sanitizes notes before inserting', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: mockActivityRow,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const inputWithHtml: ActivityInput = {
        ...mockActivityInput,
        notes: '<script>alert("xss")</script>',
      };

      await addActivity(inputWithHtml);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.notes).not.toContain('<script>');
    });

    it('handles null notes', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockActivityRow, notes: null },
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const inputWithoutNotes: ActivityInput = {
        ...mockActivityInput,
        notes: undefined,
      };

      await addActivity(inputWithoutNotes);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.notes).toBeNull();
    });
  });

  describe('updateActivity', () => {
    it('updates activity for authenticated user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockActivityRow, duration_minutes: 45 },
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await updateActivity('activity-1', {
        ...mockActivityInput,
        durationMinutes: 45,
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.durationMinutes).toBe(45);
    });

    it('returns error for unauthenticated user', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await updateActivity('activity-1', mockActivityInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('validates input before updating', async () => {
      const invalidInput: ActivityInput = {
        date: '2024-03-15',
        timeOfDay: 'morning',
        activityType: 'walking',
        durationMinutes: -1, // Invalid
        intensity: 3,
      };

      const result = await updateActivity('activity-1', invalidInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('filters by both id and user_id', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: mockActivityRow,
        error: null,
      });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await updateActivity('activity-1', mockActivityInput);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'activity-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('deleteActivity', () => {
    it('deletes activity for authenticated user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      // Chain: delete().eq('id', ...).eq('user_id', ...)
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder) // First eq (id) returns builder
        .mockResolvedValueOnce({ error: null }); // Second eq (user_id) resolves

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await deleteActivity('activity-1');

      expect(result.error).toBeNull();
    });

    it('returns error for unauthenticated user', async () => {
      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await deleteActivity('activity-1');

      expect(result.error?.message).toBe('Not authenticated');
    });

    it('handles database errors', async () => {
      const mockError = new Error('Delete failed');
      const mockQueryBuilder = createMockQueryBuilder();
      // For delete, the last eq returns the error
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder) // First eq call (id)
        .mockResolvedValueOnce({ error: mockError }); // Second eq call (user_id) resolves

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await deleteActivity('activity-1');

      expect(result.error).toEqual(mockError);
    });

    it('filters by both id and user_id for security', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ error: null });

      (supabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
      });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await deleteActivity('activity-1');

      expect(supabase.from).toHaveBeenCalledWith('activities');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'activity-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
