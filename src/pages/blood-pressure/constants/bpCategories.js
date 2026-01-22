// Blood Pressure Categories based on American Heart Association guidelines
// https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings

export const BP_CATEGORIES = {
  normal: {
    key: 'normal',
    label: 'Normal',
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
    borderClass: 'border-green-200 dark:border-green-800',
    chartColor: '#22c55e',
    description: 'Systolic < 120 AND Diastolic < 80',
  },
  elevated: {
    key: 'elevated',
    label: 'Elevated',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    chartColor: '#f59e0b',
    description: 'Systolic 120-129 AND Diastolic < 80',
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
    description: 'Systolic 130-139 OR Diastolic 80-89',
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
    description: 'Systolic ≥ 140 OR Diastolic ≥ 90',
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
    description: 'Systolic > 180 AND/OR Diastolic > 120 — Seek immediate care',
  },
};

export const BP_THRESHOLDS = {
  systolic: {
    normal: { max: 119 },
    elevated: { min: 120, max: 129 },
    hypertension1: { min: 130, max: 139 },
    hypertension2: { min: 140, max: 179 },
    crisis: { min: 180 },
  },
  diastolic: {
    normal: { max: 79 },
    hypertension1: { min: 80, max: 89 },
    hypertension2: { min: 90, max: 119 },
    crisis: { min: 120 },
  },
};

// Chart reference lines
export const BP_REFERENCE_LINES = {
  systolic: [
    { value: 120, label: '120', color: '#f59e0b' },
    { value: 130, label: '130', color: '#f97316' },
    { value: 140, label: '140', color: '#ef4444' },
  ],
  diastolic: [
    { value: 80, label: '80', color: '#f59e0b' },
    { value: 90, label: '90', color: '#ef4444' },
  ],
};
