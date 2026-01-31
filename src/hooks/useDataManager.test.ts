import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataManager } from './useDataManager';

interface TestItem {
  id: string;
  name: string;
  value: number;
}

describe('useDataManager', () => {
  const mockItems: TestItem[] = [
    { id: '1', name: 'Item 1', value: 100 },
    { id: '2', name: 'Item 2', value: 200 },
    { id: '3', name: 'Item 3', value: 300 },
  ];

  const createMockFetchFn = (items: TestItem[] = mockItems, shouldError = false) => {
    return vi
      .fn()
      .mockResolvedValue(
        shouldError
          ? { data: null, error: new Error('Fetch failed') }
          : { data: items, error: null }
      );
  };

  describe('initial state and data fetching', () => {
    it('starts with correct initial state', () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('fetches data on mount', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockItems);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
      const fetchFn = createMockFetchFn([], true);
      const errorMessage = 'Custom error message';

      const { result } = renderHook(() => useDataManager<TestItem>({ fetchFn, errorMessage }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.data).toEqual([]);
    });

    it('processes data with processData function', async () => {
      const fetchFn = createMockFetchFn();
      const processData = (items: TestItem[]) => items.filter((item) => item.value > 150);

      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, processData, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data.every((item) => item.value > 150)).toBe(true);
    });
  });

  describe('refetch', () => {
    it('refetches data when called', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('addItem', () => {
    it('adds item to data', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: '4', name: 'Item 4', value: 400 };
      const addFn = vi.fn().mockResolvedValue({ data: newItem, error: null });

      await act(async () => {
        await result.current.addItem(addFn);
      });

      expect(result.current.data).toHaveLength(4);
      expect(result.current.data[0]).toEqual(newItem);
    });

    it('returns error when add fails', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const addError = new Error('Add failed');
      const addFn = vi.fn().mockResolvedValue({ data: null, error: addError });

      let addResult: { data?: TestItem | null; error?: Error | string | null };
      await act(async () => {
        addResult = await result.current.addItem(addFn);
      });

      expect(addResult!.error).toBe(addError);
      expect(result.current.data).toHaveLength(3);
    });

    it('sorts items when sortFn provided', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: '4', name: 'Item 4', value: 150 };
      const addFn = vi.fn().mockResolvedValue({ data: newItem, error: null });
      const sortFn = (a: TestItem, b: TestItem) => a.value - b.value;

      await act(async () => {
        await result.current.addItem(addFn, { sortFn });
      });

      expect(result.current.data.map((i) => i.value)).toEqual([100, 150, 200, 300]);
    });
  });

  describe('updateItem', () => {
    it('updates item in data', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const updatedItem: TestItem = { id: '2', name: 'Updated Item 2', value: 250 };
      const updateFn = vi.fn().mockResolvedValue({ data: updatedItem, error: null });

      await act(async () => {
        await result.current.updateItem('2', updateFn);
      });

      expect(result.current.data.find((item) => item.id === '2')).toEqual(updatedItem);
    });

    it('returns error when update fails', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const updateError = new Error('Update failed');
      const updateFn = vi.fn().mockResolvedValue({ data: null, error: updateError });

      let updateResult: { data?: TestItem | null; error?: Error | string | null };
      await act(async () => {
        updateResult = await result.current.updateItem('2', updateFn);
      });

      expect(updateResult!.error).toBe(updateError);
      expect(result.current.data.find((item) => item.id === '2')?.name).toBe('Item 2');
    });
  });

  describe('deleteItem', () => {
    it('removes item from data and returns deleted item', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const deleteFn = vi.fn().mockResolvedValue({ error: null });

      let deleteResult: { error: Error | string | null; deletedItem?: TestItem };
      await act(async () => {
        deleteResult = await result.current.deleteItem('2', deleteFn);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data.find((item) => item.id === '2')).toBeUndefined();
      expect(deleteResult!.deletedItem).toEqual(mockItems[1]);
    });

    it('returns error when delete fails', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const deleteError = new Error('Delete failed');
      const deleteFn = vi.fn().mockResolvedValue({ error: deleteError });

      let deleteResult: { error: Error | string | null; deletedItem?: TestItem };
      await act(async () => {
        deleteResult = await result.current.deleteItem('2', deleteFn);
      });

      expect(deleteResult!.error).toBe(deleteError);
      expect(result.current.data).toHaveLength(3);
    });
  });

  describe('custom idField', () => {
    it('uses custom id field for operations', async () => {
      interface CustomItem {
        customId: string;
        name: string;
      }
      const customItems: CustomItem[] = [
        { customId: 'a', name: 'Item A' },
        { customId: 'b', name: 'Item B' },
      ];

      const fetchFn = vi.fn().mockResolvedValue({ data: customItems, error: null });
      const { result } = renderHook(() =>
        useDataManager<CustomItem>({
          fetchFn,
          errorMessage: 'Failed to fetch',
          idField: 'customId',
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const deleteFn = vi.fn().mockResolvedValue({ error: null });
      await act(async () => {
        await result.current.deleteItem('a', deleteFn);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].customId).toBe('b');
    });
  });

  describe('setData', () => {
    it('allows manual data updates', async () => {
      const fetchFn = createMockFetchFn();
      const { result } = renderHook(() =>
        useDataManager<TestItem>({ fetchFn, errorMessage: 'Failed to fetch' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newData: TestItem[] = [{ id: '99', name: 'Manual Item', value: 999 }];
      act(() => {
        result.current.setData(newData);
      });

      expect(result.current.data).toEqual(newData);
    });
  });
});
