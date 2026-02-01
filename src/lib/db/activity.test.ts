import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getActivities, addActivity, updateActivity, deleteActivity } from './activity';
import { supabase } from '../supabase';
import type { ActivityInput } from '@/types/activity';

vi.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
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

  const createMockQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test authentication once - all operations require it
  it('returns error for unauthenticated user', async () => {
    (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null } });

    expect((await getActivities()).error?.message).toBe('Not authenticated');
    expect((await addActivity(mockActivityInput)).error?.message).toBe('Not authenticated');
    expect((await updateActivity('id', mockActivityInput)).error?.message).toBe(
      'Not authenticated'
    );
    expect((await deleteActivity('id')).error?.message).toBe('Not authenticated');
  });

  describe('getActivities', () => {
    it('returns activities for authenticated user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({ data: [mockActivityRow], error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await getActivities();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        id: 'activity-1',
        activityType: 'walking',
        durationMinutes: 30,
      });
    });

    it('filters by user_id for security', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await getActivities();

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('addActivity', () => {
    it('adds activity with validation', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({ data: mockActivityRow, error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await addActivity(mockActivityInput);

      expect(result.error).toBeNull();
      expect(result.data!.activityType).toBe('walking');
    });

    it('validates input before adding', async () => {
      const result = await addActivity({ ...mockActivityInput, date: '' });
      expect(result.error!.message).toContain('Date is required');
    });

    it('sanitizes notes (XSS prevention)', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({ data: mockActivityRow, error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await addActivity({ ...mockActivityInput, notes: '<script>alert("xss")</script>' });

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.notes).not.toContain('<script>');
    });
  });

  describe('updateActivity', () => {
    it('updates activity with validation', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockActivityRow, duration_minutes: 45 },
        error: null,
      });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await updateActivity('activity-1', {
        ...mockActivityInput,
        durationMinutes: 45,
      });

      expect(result.data!.durationMinutes).toBe(45);
    });

    it('filters by both id and user_id for security', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({ data: mockActivityRow, error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await updateActivity('activity-1', mockActivityInput);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'activity-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('deleteActivity', () => {
    it('deletes activity', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      const result = await deleteActivity('activity-1');

      expect(result.error).toBeNull();
    });

    it('filters by both id and user_id for security', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValueOnce({ error: null });
      (supabase.auth.getUser as Mock).mockResolvedValue({ data: { user: mockUser } });
      (supabase.from as Mock).mockReturnValue(mockQueryBuilder);

      await deleteActivity('activity-1');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'activity-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
