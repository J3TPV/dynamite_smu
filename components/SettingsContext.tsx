import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings, effectiveCategoryMeta } from '../lib/settings';
import { applyTheme, resolveMode } from '../lib/theme';
import { Category, CategoryMeta } from '../lib/types';

interface SettingsCtx {
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => void;
  resetSettings: () => void;
  categoryMeta: Record<Category, CategoryMeta>;
}

const Ctx = createContext<SettingsCtx | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());

  const setSettings = useCallback((patch: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState(prev => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => setSettingsState(DEFAULT_SETTINGS), []);

  // Persist + apply theme whenever settings change.
  useEffect(() => {
    saveSettings(settings);
    applyTheme(settings.theme);
  }, [settings]);

  // React to OS light/dark changes while in "system" mode.
  useEffect(() => {
    if (settings.theme.mode !== 'system' || typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(settings.theme);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  const categoryMeta = useMemo(() => effectiveCategoryMeta(settings), [settings]);

  const value = useMemo<SettingsCtx>(
    () => ({ settings, setSettings, resetSettings, categoryMeta }),
    [settings, setSettings, resetSettings, categoryMeta],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

/** Convenience hook for the effective (override-merged) category metadata. */
export function useCategoryMeta(): Record<Category, CategoryMeta> {
  return useSettings().categoryMeta;
}

export { resolveMode };
