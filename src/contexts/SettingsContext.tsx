import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppSettings, ThemeMode, AccentColor, CardDensity, CalendarSystem } from '../types';
import { loadAppSettings, saveAppSettings, DEFAULT_APP_SETTINGS } from '../services/storage';

interface AccentConfig {
  id: AccentColor;
  label: string;
  hex: string;
  borderClass: string;
  bgSubtleClass: string;
  textClass: string;
}

export const ACCENT_PRESETS: AccentConfig[] = [
  {
    id: 'violet',
    label: 'بنفش کار روز (پیش‌فرض)',
    hex: '#8B5CF6',
    borderClass: 'border-violet-500',
    bgSubtleClass: 'bg-violet-950/30',
    textClass: 'text-violet-400',
  },
  {
    id: 'indigo',
    label: 'نیلی موقر',
    hex: '#6366F1',
    borderClass: 'border-indigo-500',
    bgSubtleClass: 'bg-indigo-950/30',
    textClass: 'text-indigo-400',
  },
  {
    id: 'emerald',
    label: 'زمردی آرام',
    hex: '#10B981',
    borderClass: 'border-emerald-500',
    bgSubtleClass: 'bg-emerald-950/30',
    textClass: 'text-emerald-400',
  },
  {
    id: 'amber',
    label: 'کهربایی گرم',
    hex: '#F59E0B',
    borderClass: 'border-amber-500',
    bgSubtleClass: 'bg-amber-950/30',
    textClass: 'text-amber-400',
  },
  {
    id: 'rose',
    label: 'سرخ ارغوانی',
    hex: '#F43F5E',
    borderClass: 'border-rose-500',
    bgSubtleClass: 'bg-rose-950/30',
    textClass: 'text-rose-400',
  },
  {
    id: 'blue',
    label: 'آبی اقیانوسی',
    hex: '#3B82F6',
    borderClass: 'border-blue-500',
    bgSubtleClass: 'bg-blue-950/30',
    textClass: 'text-blue-400',
  },
];

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (accent: AccentColor) => void;
  setCardDensity: (density: CardDensity) => void;
  setCalendarSystem: (cal: CalendarSystem) => void;
  generateTelegramPairingCode: () => string;
  disconnectTelegram: () => void;
  activeAccent: AccentConfig;
  effectiveTheme: 'dark' | 'light';
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');

  // Sync theme changes to DOM and resolve 'system'
  useEffect(() => {
    const root = document.documentElement;

    const determineTheme = (): 'dark' | 'light' => {
      if (settings.themeMode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? 'dark' : 'light';
      }
      return settings.themeMode;
    };

    const applyTheme = (theme: 'dark' | 'light') => {
      setEffectiveTheme(theme);
      if (theme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      }
    };

    const currentTheme = determineTheme();
    applyTheme(currentTheme);

    root.setAttribute('data-accent', settings.accentColor);
    root.setAttribute('data-density', settings.cardDensity);

    // Dynamic accent CSS variables for smooth adaptation
    const accent = ACCENT_PRESETS.find((a) => a.id === settings.accentColor) || ACCENT_PRESETS[0];
    root.style.setProperty('--app-accent', accent.hex);

    // Listener for system theme change if mode is 'system'
    if (settings.themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const theme = e.matches ? 'dark' : 'light';
        applyTheme(theme);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.themeMode, settings.accentColor, settings.cardDensity]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated: AppSettings = {
        ...prev,
        ...patch,
        telegram: {
          ...prev.telegram,
          ...(patch.telegram || {}),
        },
      };
      saveAppSettings(updated);
      return updated;
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    updateSettings({ themeMode: mode });
  }, [updateSettings]);

  const setAccentColor = useCallback((accent: AccentColor) => {
    updateSettings({ accentColor: accent });
  }, [updateSettings]);

  const setCardDensity = useCallback((density: CardDensity) => {
    updateSettings({ cardDensity: density });
  }, [updateSettings]);

  const setCalendarSystem = useCallback((cal: CalendarSystem) => {
    updateSettings({ calendarSystem: cal });
  }, [updateSettings]);

  // Generate secure random short-lived pairing token for Telegram
  const generateTelegramPairingCode = useCallback((): string => {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    const pairingCode = `KR-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

    updateSettings({
      telegram: {
        ...settings.telegram,
        pendingPairingCode: pairingCode,
        pairingCodeExpiresAt: expiresAt,
      },
    });

    return pairingCode;
  }, [settings.telegram, updateSettings]);

  const disconnectTelegram = useCallback(() => {
    updateSettings({
      telegram: {
        linked: false,
        telegramChatId: undefined,
        telegramUsername: undefined,
        linkedAt: undefined,
        pendingPairingCode: undefined,
        pairingCodeExpiresAt: undefined,
      },
    });
  }, [updateSettings]);

  const activeAccent = useMemo(() => {
    return ACCENT_PRESETS.find((a) => a.id === settings.accentColor) || ACCENT_PRESETS[0];
  }, [settings.accentColor]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      setThemeMode,
      setAccentColor,
      setCardDensity,
      setCalendarSystem,
      generateTelegramPairingCode,
      disconnectTelegram,
      activeAccent,
      effectiveTheme,
    }),
    [
      settings,
      updateSettings,
      setThemeMode,
      setAccentColor,
      setCardDensity,
      setCalendarSystem,
      generateTelegramPairingCode,
      disconnectTelegram,
      activeAccent,
      effectiveTheme,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
