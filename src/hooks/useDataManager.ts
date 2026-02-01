import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchResult<T> {
  data: T[] | null;
  error: Error | string | null;
}

interface UseDataManagerOptions<T> {
  fetchFn: () => Promise<FetchResult<T>>;
  processData?: (data: T[]) => T[];
  errorMessage: string;
  idField?: string;
}

interface AddItemOptions<T> {
  refetchAfter?: boolean;
  sortFn?: (a: T, b: T) => number;
}

interface UpdateItemOptions {
  refetchAfter?: boolean;
}

/**
 * Generic hook for managing CRUD operations on data from Supabase
 */

export function useDataManager<T extends { [key: string]: any }>({
  fetchFn,
  processData,
  errorMessage,
  idField = 'id',
}: UseDataManagerOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef(data);
  const isMountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  // Keep fetchFn and processData refs to avoid stale closures
  const fetchFnRef = useRef(fetchFn);
  const processDataRef = useRef(processData);
  const errorMessageRef = useRef(errorMessage);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    processDataRef.current = processData;
    errorMessageRef.current = errorMessage;
  }, [fetchFn, processData, errorMessage]);

  // Keep ref in sync with state
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Initial data load and mounted state tracking
  useEffect(() => {
    isMountedRef.current = true;

    const loadData = async () => {
      const currentFetchId = ++fetchIdRef.current;
      setLoading(true);
      const { data: fetchedData, error: fetchError } = await fetchFnRef.current();

      // Ignore stale responses
      if (!isMountedRef.current || currentFetchId !== fetchIdRef.current) return;

      if (fetchError) {
        setError(errorMessageRef.current);
        setLoading(false);
        return;
      }

      const processed = processDataRef.current
        ? processDataRef.current(fetchedData || [])
        : fetchedData || [];
      setData(processed);
      setError(null);
      setLoading(false);
    };

    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    const { data: fetchedData, error: fetchError } = await fetchFnRef.current();

    // Ignore stale responses
    if (!isMountedRef.current || currentFetchId !== fetchIdRef.current) return;

    if (fetchError) {
      setError(errorMessageRef.current);
      setLoading(false);
      return;
    }

    const processed = processDataRef.current
      ? processDataRef.current(fetchedData || [])
      : fetchedData || [];
    setData(processed);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * Add an item to the data
   */
  const addItem = useCallback(
    async (
      addFn: () => Promise<{ data: T | null; error: Error | string | null }>,
      { refetchAfter = false, sortFn }: AddItemOptions<T> = {}
    ) => {
      const { data: newItem, error: addError } = await addFn();

      if (!isMountedRef.current) return { error: null };

      if (addError) {
        return { error: addError };
      }

      if (refetchAfter) {
        await fetchData();
        if (!isMountedRef.current) return { error: null };
      } else if (newItem) {
        setData((prev) => {
          const updated = [newItem, ...prev];
          return sortFn ? updated.sort(sortFn) : updated;
        });
      }

      return { data: newItem };
    },
    [fetchData]
  );

  /**
   * Update an item in the data
   */
  const updateItem = useCallback(
    async (
      itemId: string | number,
      updateFn: () => Promise<{ data: T | null; error: Error | string | null }>,
      { refetchAfter = false }: UpdateItemOptions = {}
    ) => {
      const { data: updatedItem, error: updateError } = await updateFn();

      if (!isMountedRef.current) return { error: null };

      if (updateError) {
        return { error: updateError };
      }

      if (refetchAfter) {
        await fetchData();
        if (!isMountedRef.current) return { error: null };
      } else if (updatedItem) {
        setData((prev) => prev.map((item) => (item[idField] === itemId ? updatedItem : item)));
      }

      return { data: updatedItem };
    },
    [fetchData, idField]
  );

  /**
   * Delete an item from the data
   */
  const deleteItem = useCallback(
    async (itemId: string | number, deleteFn: () => Promise<{ error: Error | string | null }>) => {
      const deletedItem = dataRef.current.find((item) => item[idField] === itemId);
      const { error: deleteError } = await deleteFn();

      if (!isMountedRef.current) return { error: null, deletedItem };

      if (deleteError) {
        return { error: deleteError };
      }

      setData((prev) => prev.filter((item) => item[idField] !== itemId));

      return { error: null, deletedItem };
    },
    [idField]
  );

  return {
    data,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchData,
    setData,
  };
}
