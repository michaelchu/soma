import { useCallback, useMemo } from 'react';
import {
  getSleepEntries,
  addSleepEntry as addSleepEntryDb,
  updateSleepEntry as updateSleepEntryDb,
  deleteSleepEntry as deleteSleepEntryDb,
  SleepEntry,
  SleepEntryInput,
} from '../../../lib/db/sleep';
import { useDataManager } from '../../../hooks/useDataManager';

/**
 * Custom hook to load and manage sleep entries from Supabase
 */
export function useSleepEntries() {
  const fetchFn = useMemo(() => getSleepEntries, []);

  const {
    data: entries,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch,
  } = useDataManager<SleepEntry>({
    fetchFn,
    errorMessage: 'Failed to load sleep entries',
    idField: 'id',
  });

  const sortByDateDesc = useCallback(
    (a: SleepEntry, b: SleepEntry) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    []
  );

  const addEntry = useCallback(
    async (entry: SleepEntryInput) => {
      return addItem(() => addSleepEntryDb(entry), { sortFn: sortByDateDesc });
    },
    [addItem, sortByDateDesc]
  );

  const updateEntry = useCallback(
    async (id: string, entry: SleepEntryInput) => {
      return updateItem(id, () => updateSleepEntryDb(id, entry));
    },
    [updateItem]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      return deleteItem(id, () => deleteSleepEntryDb(id));
    },
    [deleteItem]
  );

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refetch,
  };
}
