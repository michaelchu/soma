import { createContext, useContext, type FC, type ReactNode } from 'react';

/**
 * Factory function to create a data context with Provider and hook
 * Eliminates boilerplate for context creation across different data types
 *
 * @param useDataHook - The hook that provides the data and operations
 * @param displayName - Name used for error messages
 * @returns Provider component and useData hook
 */
export function createDataContext<T>(
  useDataHook: () => T,
  displayName: string
): {
  Provider: FC<{ children: ReactNode }>;
  useData: () => T;
} {
  const Context = createContext<T | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const data = useDataHook();
    return <Context.Provider value={data}>{children}</Context.Provider>;
  }

  Provider.displayName = `${displayName}Provider`;

  function useData(): T {
    const context = useContext(Context);
    if (!context) {
      throw new Error(`use${displayName} must be used within a ${displayName}Provider`);
    }
    return context;
  }

  return { Provider, useData };
}
