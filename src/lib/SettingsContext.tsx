import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { secureGetItem, secureSetItem } from './secureStorage';

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
  bpGuideline: 'htnCanada2025', // Default to HTN Canada 2025 guidelines
};

const VALID_BP_GUIDELINES = ['htnCanada2025', 'simple'];

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
    const stored = secureGetItem<Partial<Settings>>('soma-settings');
    if (stored && isValidSettings(stored)) {
      return { ...DEFAULT_SETTINGS, ...stored };
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    secureSetItem('soma-settings', settings);
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
