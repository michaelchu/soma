import { createContext, useContext } from 'react';
import { useReadings } from '../hooks/useReadings';

const BPContext = createContext(null);

export function BPProvider({ children }) {
  const readingsState = useReadings();

  return <BPContext.Provider value={readingsState}>{children}</BPContext.Provider>;
}

export function useBloodPressure() {
  const context = useContext(BPContext);
  if (!context) {
    throw new Error('useBloodPressure must be used within a BPProvider');
  }
  return context;
}

// Backwards compatibility alias
export const useBP = useBloodPressure;
