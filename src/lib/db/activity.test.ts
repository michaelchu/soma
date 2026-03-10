import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActivities, addActivity, updateActivity, deleteActivity } from './activity';
import type { ActivityInput } from '@/types/activity';

const mockQuery = vi.fn();
const mockExec = vi.fn();

vi.mock('../sqlite', () => ({
  querySQL: (...args: unknown[]) => mockQuery(...args),
  execSQL: (...args: unknown[]) => mockExec(...args),
}));

describe('activity database layer', () => {
  const mockActivityRow = {
    id: 'activity-1',
    date: '2024-03-15',
    time_of_day: 'morning',
    activity_type: 'walking',
    duration_minutes: 30,
    intensity: 3,
    notes: 'Great walk!',
    zone1_minutes: null,
    zone2_minutes: null,
    zone3_minutes: null,
    zone4_minutes: null,
    zone5_minutes: null,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActivities', () => {
    it('returns activities', async () => {
      mockQuery.mockResolvedValue([mockActivityRow]);

      const result = await getActivities();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        id: 'activity-1',
        activityType: 'walking',
        durationMinutes: 30,
      });
    });

    it('returns error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      const result = await getActivities();

      expect(result.error?.message).toBe('DB error');
      expect(result.data).toBeNull();
    });
  });

  describe('addActivity', () => {
    it('adds activity with validation', async () => {
      mockExec.mockResolvedValue({ changes: 1, lastId: 1 });
      mockQuery.mockResolvedValue([mockActivityRow]);

      const result = await addActivity(mockActivityInput);

      expect(result.error).toBeNull();
      expect(result.data!.activityType).toBe('walking');
    });

    it('validates input before adding', async () => {
      const result = await addActivity({ ...mockActivityInput, date: '' });
      expect(result.error!.message).toContain('Date is required');
    });

    it('sanitizes notes (XSS prevention)', async () => {
      mockExec.mockResolvedValue({ changes: 1, lastId: 1 });
      mockQuery.mockResolvedValue([{ ...mockActivityRow, notes: 'alert("xss")' }]);

      await addActivity({ ...mockActivityInput, notes: '<script>alert("xss")</script>' });

      const insertCall = mockExec.mock.calls[0];
      const params = insertCall[1] as unknown[];
      expect(params[6]).not.toContain('<script>');
    });
  });

  describe('updateActivity', () => {
    it('updates activity with validation', async () => {
      mockExec.mockResolvedValue({ changes: 1, lastId: 1 });
      mockQuery.mockResolvedValue([{ ...mockActivityRow, duration_minutes: 45 }]);

      const result = await updateActivity('activity-1', {
        ...mockActivityInput,
        durationMinutes: 45,
      });

      expect(result.data!.durationMinutes).toBe(45);
    });
  });

  describe('deleteActivity', () => {
    it('deletes activity', async () => {
      mockExec.mockResolvedValue({ changes: 1, lastId: 0 });

      const result = await deleteActivity('activity-1');

      expect(result.error).toBeNull();
    });
  });
});
