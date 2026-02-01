import { createDataContext } from '@/lib/contextUtils';
import { useReadings } from '../hooks/useReadings';

const { Provider, useData } = createDataContext(useReadings, 'BloodPressure');

export const BPProvider = Provider;
export const useBloodPressure = useData;

// Backwards compatibility alias
export const useBP = useBloodPressure;
