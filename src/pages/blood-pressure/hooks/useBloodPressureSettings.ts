import { useCallback, useMemo } from 'react';
import { useSettings } from '@/lib/SettingsContext';
import { getBPCategory, getCategoryInfo, getReferenceLines } from '../utils/bpHelpers';
import { BP_GUIDELINES, BP_CATEGORY_INFO, DEFAULT_GUIDELINE } from '../constants/bpGuidelines';

export function useBloodPressureSettings() {
  const { settings } = useSettings();
  const guidelineKey = settings.bpGuideline || DEFAULT_GUIDELINE;
  const guideline = BP_GUIDELINES[guidelineKey];

  // Memoize getCategory to prevent unnecessary re-renders in child components
  const getCategory = useCallback(
    (systolic, diastolic) => getBPCategory(systolic, diastolic, guidelineKey),
    [guidelineKey]
  );

  // Memoize getReferenceLines as well
  const getReferenceLinesForGuideline = useCallback(
    () => getReferenceLines(guidelineKey),
    [guidelineKey]
  );

  // Memoize categories array
  const categories = useMemo(
    () => guideline?.categories.map((cat) => BP_CATEGORY_INFO[cat]) || [],
    [guideline]
  );

  return {
    guidelineKey,
    guideline,
    getCategory,
    getCategoryInfo,
    getReferenceLines: getReferenceLinesForGuideline,
    categories,
  };
}
