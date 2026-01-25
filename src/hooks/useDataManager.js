import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for managing CRUD operations on data from Supabase
 *
 * @param {Object} options
 * @param {Function} options.fetchFn - Async function that fetches data, returns { data, error }
 * @param {Function} [options.processData] - Optional function to transform/enrich fetched data
 * @param {string} options.errorMessage - Error message shown when fetch fails
 * @param {string} options.idField - Field name used as unique identifier (e.g., 'sessionId', 'id')
 */
export function useDataManager({ fetchFn, processData, errorMessage, idField = 'id' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dataRef = useRef(data);
  const isMountedRef = useRef(true);

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
      setLoading(true);
      const { data: fetchedData, error: fetchError } = await fetchFnRef.current();

      if (!isMountedRef.current) return;

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
    setLoading(true);
    const { data: fetchedData, error: fetchError } = await fetchFnRef.current();

    if (!isMountedRef.current) return;

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
   * @param {Function} addFn - Async function that adds data to DB, returns { data, error }
   * @param {Object} options
   * @param {boolean} [options.refetchAfter=false] - If true, refetch all data after add
   * @param {Function} [options.sortFn] - Optional sort function for local state update
   */
  const addItem = useCallback(
    async (addFn, { refetchAfter = false, sortFn } = {}) => {
      const { data: newItem, error: addError } = await addFn();

      if (!isMountedRef.current) return { error: null };

      if (addError) {
        return { error: addError };
      }

      if (refetchAfter) {
        await fetchData();
        if (!isMountedRef.current) return { error: null };
      } else {
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
   * @param {string|number} itemId - ID of item to update
   * @param {Function} updateFn - Async function that updates data in DB, returns { data, error }
   * @param {Object} options
   * @param {boolean} [options.refetchAfter=false] - If true, refetch all data after update
   */
  const updateItem = useCallback(
    async (itemId, updateFn, { refetchAfter = false } = {}) => {
      const { data: updatedItem, error: updateError } = await updateFn();

      if (!isMountedRef.current) return { error: null };

      if (updateError) {
        return { error: updateError };
      }

      if (refetchAfter) {
        await fetchData();
        if (!isMountedRef.current) return { error: null };
      } else {
        setData((prev) => prev.map((item) => (item[idField] === itemId ? updatedItem : item)));
      }

      return { data: updatedItem };
    },
    [fetchData, idField]
  );

  /**
   * Delete an item from the data
   * @param {string|number} itemId - ID of item to delete
   * @param {Function} deleteFn - Async function that deletes data from DB, returns { error }
   */
  const deleteItem = useCallback(
    async (itemId, deleteFn) => {
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
