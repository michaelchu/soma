import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Settings {
  bpGuideline: string;
}

interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULT_SETTINGS: Settings = {
  bpGuideline: 'aha2017', // Default to AHA 2017 guidelines
};

const VALID_BP_GUIDELINES = ['aha2017', 'esc2018', 'ish2020'];

/**
 * Validates parsed settings object against expected schema
 */
function isValidSettings(parsed: unknown): parsed is Partial<Settings> {
  if (typeof parsed !== 'object' || parsed === null) {
    return false;
  }

  const obj = parsed as Record<string, unknown>;

  // Validate bpGuideline if present
  if ('bpGuideline' in obj && typeof obj.bpGuideline === 'string') {
    if (!VALID_BP_GUIDELINES.includes(obj.bpGuideline)) {
      return false;
    }
  }

  return true;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem('soma-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (isValidSettings(parsed)) {
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
        return DEFAULT_SETTINGS;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('soma-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
