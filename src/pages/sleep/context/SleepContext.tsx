import { createContext, useContext } from 'react';
import { useSleepEntries } from '../hooks/useSleepEntries';

const SleepContext = createContext(null);

export function SleepProvider({ children }) {
  const sleepState = useSleepEntries();

  return <SleepContext.Provider value={sleepState}>{children}</SleepContext.Provider>;
}

export function useSleep() {
  const context = useContext(SleepContext);
  if (!context) {
    throw new Error('useSleep must be used within a SleepProvider');
  }
  return context;
}
