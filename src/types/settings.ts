export type BPGuidelineKey = 'htnCanada2025' | 'simple';

export interface Settings {
  bpGuideline: BPGuidelineKey;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}
