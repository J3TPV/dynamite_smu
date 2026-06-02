// App settings: theme, working hours, week start, and per-category overrides.
// Persisted to localStorage independently of events.

import { Category, CategoryMeta, CATEGORY_META } from './types';
import { ThemeMode, Density, getPreset, isValidHex } from './theme';

export interface CategoryOverride {
  label?: string;
  color?: string;
  emoji?: string;
}

export interface AppSettings {
  theme: {
    preset: string;
    mode: ThemeMode;
    /** Optional custom accent (#rrggbb) overriding the preset's primary/accent. */
    accent?: string;
    density: Density;
  };
  /** Start of the healthy waking day, minutes from midnight. */
  dayStart: number;
  /** Protected wind-down boundary, minutes from midnight. */
  dayEnd: number;
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1;
  /** Per-category label/color/emoji overrides (demanding flag stays fixed). */
  categories: Partial<Record<Category, CategoryOverride>>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: { preset: 'alfred', mode: 'system', accent: undefined, density: 'comfortable' },
  dayStart: 6 * 60,
  dayEnd: 22 * 60,
  weekStartsOn: 1,
  categories: {},
};

const KEY = 'cadence.settings.v1';

const clampMin = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;

/**
 * Merge an arbitrary parsed blob onto the defaults, validating every field so a
 * stale/partial/foreign settings object (e.g. a restored backup) can't poison
 * state — unknown preset → Alfred, invalid accent dropped, inverted day window
 * reset, categories coerced to an object.
 */
export function mergeSettings(parsed: any): AppSettings {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  const t = p.theme && typeof p.theme === 'object' ? p.theme : {};
  const mode: ThemeMode = t.mode === 'light' || t.mode === 'dark' || t.mode === 'system' ? t.mode : DEFAULT_SETTINGS.theme.mode;
  const density: Density = t.density === 'compact' || t.density === 'comfortable' ? t.density : DEFAULT_SETTINGS.theme.density;

  let dayStart = clampMin(p.dayStart, 0, 1439, DEFAULT_SETTINGS.dayStart);
  let dayEnd = clampMin(p.dayEnd, 1, 1440, DEFAULT_SETTINGS.dayEnd);
  if (dayEnd <= dayStart) { dayStart = DEFAULT_SETTINGS.dayStart; dayEnd = DEFAULT_SETTINGS.dayEnd; }

  return {
    theme: {
      preset: getPreset(t.preset).id, // coerce unknown ids to a real preset
      mode,
      accent: isValidHex(t.accent) ? t.accent : undefined,
      density,
    },
    dayStart,
    dayEnd,
    weekStartsOn: p.weekStartsOn === 0 ? 0 : 1,
    categories: p.categories && typeof p.categories === 'object' ? { ...p.categories } : {},
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return mergeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage may be unavailable */
  }
}

/** Merge built-in category metadata with the user's overrides. */
export function effectiveCategoryMeta(settings: AppSettings): Record<Category, CategoryMeta> {
  const out = {} as Record<Category, CategoryMeta>;
  (Object.keys(CATEGORY_META) as Category[]).forEach(key => {
    const base = CATEGORY_META[key];
    const ov = settings.categories[key] || {};
    out[key] = {
      ...base,
      label: ov.label ?? base.label,
      color: ov.color ?? base.color,
      emoji: ov.emoji ?? base.emoji,
    };
  });
  return out;
}

/** Working-hours window in the shape the analysis engine consumes. */
export function workingHours(settings: AppSettings): { dayStart: number; dayEnd: number } {
  return { dayStart: settings.dayStart, dayEnd: settings.dayEnd };
}
