export type BPGuidelineKey = 'aha2017' | 'esc2018' | 'jnc7';

export interface Settings {
  bpGuideline: BPGuidelineKey;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}
