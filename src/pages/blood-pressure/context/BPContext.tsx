import { createContext, useContext } from 'react';
import { useReadings } from '../hooks/useReadings';

const BPContext = createContext(null);

export function BPProvider({ children }) {
  const readingsState = useReadings();

  return <BPContext.Provider value={readingsState}>{children}</BPContext.Provider>;
}

export function useBP() {
  const context = useContext(BPContext);
  if (!context) {
    throw new Error('useBP must be used within a BPProvider');
  }
  return context;
}
