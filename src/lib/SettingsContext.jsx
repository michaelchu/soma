import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  bpGuideline: 'aha2017', // Default to AHA 2017 guidelines
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('soma-settings');
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('soma-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
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
