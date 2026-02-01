import { createDataContext } from '@/lib/contextUtils';
import { useSleepEntries } from '../hooks/useSleepEntries';

const { Provider, useData } = createDataContext(useSleepEntries, 'Sleep');

export const SleepProvider = Provider;
export const useSleep = useData;
