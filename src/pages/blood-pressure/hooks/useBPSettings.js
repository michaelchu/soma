import { useSettings } from '@/lib/SettingsContext';
import { getBPCategory, getCategoryInfo, getReferenceLines } from '../utils/bpHelpers';
import { BP_GUIDELINES, BP_CATEGORY_INFO, DEFAULT_GUIDELINE } from '../constants/bpGuidelines';

export function useBPSettings() {
  const { settings } = useSettings();
  const guidelineKey = settings.bpGuideline || DEFAULT_GUIDELINE;
  const guideline = BP_GUIDELINES[guidelineKey];

  return {
    guidelineKey,
    guideline,
    getCategory: (systolic, diastolic) => getBPCategory(systolic, diastolic, guidelineKey),
    getCategoryInfo,
    getReferenceLines: () => getReferenceLines(guidelineKey),
    categories: guideline?.categories.map((cat) => BP_CATEGORY_INFO[cat]) || [],
  };
}
