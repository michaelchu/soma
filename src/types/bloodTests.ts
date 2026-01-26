export interface MetricReference {
  min?: number;
  max?: number;
  raw?: string;
}

export interface MetricValue {
  value: number;
  unit: string;
  reference?: MetricReference;
}

export interface BloodTestReport {
  id: string;
  date: string;
  orderNumber: string;
  orderedBy: string;
  metrics: Record<string, MetricValue>;
}

export interface BloodTestReportInput {
  date: string;
  orderNumber?: string;
  orderedBy?: string;
  notes?: string;
  metrics: Record<string, MetricValue>;
}

export interface ReferenceRangeInfo {
  name: string;
  min: number | null;
  max: number | null;
  unit: string;
  category: string;
  description: string;
  clinicalNotes: string;
  optimalRange: { min: number; max: number };
}

export type MetricStatus = 'low' | 'normal' | 'high' | 'critical-low' | 'critical-high';

export type MetricCategory =
  | 'cbc'
  | 'wbc'
  | 'metabolic'
  | 'lipid'
  | 'liver'
  | 'thyroid'
  | 'inflammatory'
  | 'urine';

export interface CategoryInfo {
  label: string;
  description: string;
}
