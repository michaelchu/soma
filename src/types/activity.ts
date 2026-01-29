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
