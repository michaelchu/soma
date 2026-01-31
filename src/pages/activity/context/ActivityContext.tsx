import { createDataContext } from '@/lib/contextUtils';
import { useActivityEntries } from '../hooks/useActivityEntries';
import type { ActivityContextValue } from '@/types/activity';

const { Provider, useData } = createDataContext<ActivityContextValue>(
  useActivityEntries,
  'Activity'
);

export const ActivityProvider = Provider;
export const useActivity = useData;
