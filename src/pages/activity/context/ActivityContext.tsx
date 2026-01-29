import { createContext, useContext, ReactNode } from 'react';
import { useActivityEntries } from '../hooks/useActivityEntries';
import type { ActivityContextValue } from '@/types/activity';

const ActivityContext = createContext<ActivityContextValue | null>(null);

interface ActivityProviderProps {
  children: ReactNode;
}

export function ActivityProvider({ children }: ActivityProviderProps) {
  const activityState = useActivityEntries();

  return <ActivityContext.Provider value={activityState}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}
