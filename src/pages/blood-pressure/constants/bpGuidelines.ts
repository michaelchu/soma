// Blood Pressure Classification Guidelines
// Different medical organizations use different thresholds

export type BPGuidelineKey = 'htnCanada2025' | 'simple';

export type BPCategoryKey =
  | 'normal'
  | 'elevated'
  | 'hypertension1'
  | 'hypertension2'
  | 'crisis'
  | 'optimal'
  | 'highNormal'
  | 'hypertension3'
  | 'prehypertension'
  | 'hypertension'
  | 'hypertensionCanada'
  | 'hypertensionTreat';

interface BPThreshold {
  systolic: { min?: number; max?: number };
  diastolic: { min?: number; max?: number };
}

interface BPReferenceLine {
  value: number;
  label: string;
  color: string;
}

interface BPGuideline {
  key: string;
  name: string;
  description: string;
  categories: string[];
  thresholds: Record<string, BPThreshold>;
  referenceLines: {
    systolic: BPReferenceLine[];
    diastolic: BPReferenceLine[];
  };
}

export const BP_GUIDELINES: Record<string, BPGuideline> = {
  htnCanada2025: {
    key: 'htnCanada2025',
    name: 'HTN Canada 2025',
    description: 'Hypertension Canada 2025 Primary Care Guideline',
    categories: ['normal', 'hypertensionCanada', 'hypertensionTreat'],
    thresholds: {
      normal: { systolic: { max: 129 }, diastolic: { max: 79 } },
      hypertensionCanada: { systolic: { min: 130, max: 139 }, diastolic: { min: 80, max: 89 } },
      hypertensionTreat: { systolic: { min: 140 }, diastolic: { min: 90 } },
    },
    referenceLines: {
      systolic: [
        { value: 130, label: '130', color: '#f59e0b' },
        { value: 140, label: '140', color: '#ef4444' },
      ],
      diastolic: [
        { value: 80, label: '80', color: '#f59e0b' },
        { value: 90, label: '90', color: '#ef4444' },
      ],
    },
  },
  simple: {
    key: 'simple',
    name: 'Simple',
    description: 'Binary classification: Normal (<120/80) or Hypertension (≥120 or ≥80)',
    categories: ['normal', 'hypertension'],
    thresholds: {
      normal: { systolic: { max: 119 }, diastolic: { max: 79 } },
      hypertension: { systolic: { min: 120 }, diastolic: { min: 80 } },
    },
    referenceLines: {
      systolic: [{ value: 120, label: '120', color: '#ef4444' }],
      diastolic: [{ value: 80, label: '80', color: '#ef4444' }],
    },
  },
};

interface BPCategoryInfo {
  key: string;
  label: string;
  shortLabel?: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  chartColor: string;
}

// Category display info for all possible categories across guidelines
export const BP_CATEGORY_INFO: Record<string, BPCategoryInfo> = {
  // AHA 2017 categories
  normal: {
    key: 'normal',
    label: 'Normal',
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
    borderClass: 'border-green-200 dark:border-green-800',
    chartColor: '#22c55e',
  },
  elevated: {
    key: 'elevated',
    label: 'Elevated',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    chartColor: '#f59e0b',
  },
  hypertension1: {
    key: 'hypertension1',
    label: 'Hypertension Stage 1',
    shortLabel: 'Stage 1',
    color: 'orange',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-400',
    borderClass: 'border-orange-200 dark:border-orange-800',
    chartColor: '#f97316',
  },
  hypertension2: {
    key: 'hypertension2',
    label: 'Hypertension Stage 2',
    shortLabel: 'Stage 2',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
    chartColor: '#ef4444',
  },
  crisis: {
    key: 'crisis',
    label: 'Hypertensive Crisis',
    shortLabel: 'Crisis',
    color: 'red',
    bgClass: 'bg-red-200 dark:bg-red-900/50',
    textClass: 'text-red-800 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700',
    chartColor: '#dc2626',
  },
  // ESC 2018 categories
  optimal: {
    key: 'optimal',
    label: 'Optimal',
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
    borderClass: 'border-green-200 dark:border-green-800',
    chartColor: '#22c55e',
  },
  highNormal: {
    key: 'highNormal',
    label: 'High Normal',
    shortLabel: 'High Normal',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    chartColor: '#f59e0b',
  },
  hypertension3: {
    key: 'hypertension3',
    label: 'Hypertension Grade 3',
    shortLabel: 'Grade 3',
    color: 'red',
    bgClass: 'bg-red-200 dark:bg-red-900/50',
    textClass: 'text-red-800 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700',
    chartColor: '#dc2626',
  },
  // JNC 7 categories
  prehypertension: {
    key: 'prehypertension',
    label: 'Prehypertension',
    shortLabel: 'Pre-HTN',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    chartColor: '#f59e0b',
  },
  // Simple categories
  hypertension: {
    key: 'hypertension',
    label: 'Hypertension',
    shortLabel: 'HTN',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
    chartColor: '#ef4444',
  },
  // HTN Canada 2025 categories
  hypertensionCanada: {
    key: 'hypertensionCanada',
    label: 'Hypertension',
    shortLabel: 'HTN',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    chartColor: '#f59e0b',
  },
  hypertensionTreat: {
    key: 'hypertensionTreat',
    label: 'HTN (Treat)',
    shortLabel: 'HTN (Treat)',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
    chartColor: '#ef4444',
  },
};

export const DEFAULT_GUIDELINE = 'htnCanada2025';
