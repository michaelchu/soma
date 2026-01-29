import { useCallback } from 'react';
import {
  getActivities,
  addActivity as addActivityDb,
  updateActivity as updateActivityDb,
  deleteActivity as deleteActivityDb,
} from '../../../lib/db/activity';
import { useDataManager } from '../../../hooks/useDataManager';
import type { Activity, ActivityInput } from '@/types/activity';

/**
 * Custom hook to load and manage activity entries from Supabase
 */
export function useActivityEntries() {
  const {
    data: activities,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch,
  } = useDataManager<Activity>({
    fetchFn: getActivities,
    errorMessage: 'Failed to load activities',
    idField: 'id',
  });

  const addActivity = useCallback(
    async (input: ActivityInput) => {
      return addItem(() => addActivityDb(input), { refetchAfter: true });
    },
    [addItem]
  );

  const updateActivity = useCallback(
    async (id: string, input: ActivityInput) => {
      return updateItem(id, () => updateActivityDb(id, input), { refetchAfter: true });
    },
    [updateItem]
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      return deleteItem(id, () => deleteActivityDb(id));
    },
    [deleteItem]
  );

  return {
    activities,
    loading,
    error,
    addActivity,
    updateActivity,
    deleteActivity,
    refetch,
  };
}
