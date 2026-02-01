// Heart rate zone data (time in minutes for each zone)
export interface HeartRateZones {
  zone1Minutes: number | null; // Warm Up (100-119 bpm)
  zone2Minutes: number | null; // Easy (120-139 bpm)
  zone3Minutes: number | null; // Aerobic (140-159 bpm)
  zone4Minutes: number | null; // Threshold (160-179 bpm)
  zone5Minutes: number | null; // Maximum (>179 bpm)
}

// Database representation (snake_case)
export interface ActivityRow {
  id: string;
  user_id: string;
  date: string;
  time_of_day: string;
  activity_type: string;
  duration_minutes: number;
  intensity: number;
  notes: string | null;
  // HR zone data (optional)
  zone1_minutes: number | null;
  zone2_minutes: number | null;
  zone3_minutes: number | null;
  zone4_minutes: number | null;
  zone5_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// App representation (camelCase)
export interface Activity {
  id: string;
  userId: string;
  date: string;
  timeOfDay: ActivityTimeOfDay;
  activityType: ActivityType;
  durationMinutes: number;
  intensity: number;
  notes: string | null;
  // HR zone data (optional)
  zone1Minutes: number | null;
  zone2Minutes: number | null;
  zone3Minutes: number | null;
  zone4Minutes: number | null;
  zone5Minutes: number | null;
  createdAt: string;
  updatedAt: string;
}

// Form input
export interface ActivityInput {
  date: string;
  timeOfDay: ActivityTimeOfDay;
  activityType: ActivityType;
  durationMinutes: number;
  intensity: number;
  notes?: string | null;
  // HR zone data (optional - use when available from watch)
  zone1Minutes?: number | null;
  zone2Minutes?: number | null;
  zone3Minutes?: number | null;
  zone4Minutes?: number | null;
  zone5Minutes?: number | null;
}

// Activity types
export type ActivityType = 'walking' | 'badminton' | 'pickleball' | 'other';

// Time of day
export type ActivityTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late_evening';

// Constants for dropdowns
export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'other', label: 'Other' },
];

export const TIME_OF_DAY_OPTIONS: {
  value: ActivityTimeOfDay;
  label: string;
  description: string;
}[] = [
  { value: 'morning', label: 'Morning', description: '5am - 12pm' },
  { value: 'afternoon', label: 'Afternoon', description: '12pm - 5pm' },
  { value: 'evening', label: 'Evening', description: '5pm - 8pm' },
  { value: 'late_evening', label: 'Late Evening', description: '8pm+' },
];

export const INTENSITY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Very light' },
  { value: 2, label: 'Light' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Hard' },
  { value: 5, label: 'All out' },
];

// Heart rate zone definitions (based on typical Strava zones)
export const HR_ZONE_OPTIONS: {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  bpmRange: string;
  description: string;
}[] = [
  { zone: 1, label: 'Zone 1', bpmRange: '100-119', description: 'Warm Up' },
  { zone: 2, label: 'Zone 2', bpmRange: '120-139', description: 'Easy' },
  { zone: 3, label: 'Zone 3', bpmRange: '140-159', description: 'Aerobic' },
  { zone: 4, label: 'Zone 4', bpmRange: '160-179', description: 'Threshold' },
  { zone: 5, label: 'Zone 5', bpmRange: '>179', description: 'Maximum' },
];

// Context value type
export interface ActivityContextValue {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  addActivity: (
    activity: ActivityInput
  ) => Promise<{ data?: Activity | null; error?: Error | string | null }>;
  updateActivity: (
    id: string,
    activity: ActivityInput
  ) => Promise<{ data?: Activity | null; error?: Error | string | null }>;
  deleteActivity: (
    id: string
  ) => Promise<{ error?: Error | string | null; deletedItem?: Activity }>;
  refetch: () => Promise<void>;
}
