export type Arm = 'L' | 'R' | null;

// Time of day categories for BP readings (stored in database)
export type BPTimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface BPReading {
  id: string;
  date: string; // YYYY-MM-DD format
  timeOfDay: BPTimeOfDay;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  arm: Arm;
  sessionId: string;
}

export interface BPSession {
  sessionId: string;
  date: string; // YYYY-MM-DD format
  timeOfDay: BPTimeOfDay;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  readings: BPReading[];
  readingCount: number;
}

export interface BPSessionInput {
  date: string; // YYYY-MM-DD format
  timeOfDay: BPTimeOfDay;
  readings: Array<{
    systolic: number;
    diastolic: number;
    arm?: Arm;
    pulse?: number | null;
  }>;
  notes?: string | null;
}

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

export interface BPCategory {
  key: BPCategoryKey;
  label: string;
  shortLabel?: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  chartColor: string;
  description: string;
}

export interface BPThreshold {
  min?: number;
  max?: number;
}

export interface BPThresholds {
  systolic: Record<string, BPThreshold>;
  diastolic: Record<string, BPThreshold>;
}

export interface BPReferenceLine {
  value: number;
  label: string;
  color: string;
}

export type TimeOfDay = 'all' | 'am' | 'pm' | 'morning' | 'afternoon' | 'evening';

export interface DateRangeOption {
  value: string;
  label: string;
}

export interface TimeOfDayOption {
  value: TimeOfDay | 'all';
  label: string;
}

export interface BPFilters {
  dateRange: string;
  timeOfDay: TimeOfDay | 'all';
}

export interface BPContextValue {
  sessions: BPSession[];
  loading: boolean;
  error: string | null;
  addSession: (session: BPSessionInput) => Promise<{ data?: BPSession; error?: Error }>;
  updateSession: (
    sessionId: string,
    session: BPSessionInput
  ) => Promise<{ data?: BPSession; error?: Error }>;
  deleteSession: (sessionId: string) => Promise<{ error?: Error }>;
  refetch: () => Promise<void>;
}

// Simplified BP reading type for dashboard/summary use
export type BPReadingSummary = Pick<
  BPReading,
  'date' | 'timeOfDay' | 'systolic' | 'diastolic' | 'pulse' | 'sessionId'
>;
