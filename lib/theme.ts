// Theme engine. A small set of curated presets, each just an accent triple; the
// light/dark base ramps and semantic colors are shared so every preset stays
// cohesive. The active theme is applied by overriding daisyUI CSS variables on
// :root, plus a root font-size for density. Dependency-free.

export type ThemeMode = 'system' | 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'alfred', name: 'Alfred', primary: '#4f6f52', secondary: '#ff7f50', accent: '#ff7f50' },
  { id: 'indigo', name: 'Indigo', primary: '#5b6cff', secondary: '#22d3ee', accent: '#a855f7' },
  { id: 'ocean', name: 'Ocean', primary: '#0ea5b7', secondary: '#3b82f6', accent: '#14b8a6' },
  { id: 'sunset', name: 'Sunset', primary: '#f97316', secondary: '#ec4899', accent: '#f59e0b' },
  { id: 'forest', name: 'Forest', primary: '#3d8b6e', secondary: '#84cc16', accent: '#10b981' },
  { id: 'rose', name: 'Rose', primary: '#e11d48', secondary: '#fb7185', accent: '#f43f5e' },
  { id: 'grape', name: 'Grape', primary: '#7c3aed', secondary: '#d946ef', accent: '#8b5cf6' },
  { id: 'mono', name: 'Mono', primary: '#52525b', secondary: '#71717a', accent: '#a1a1aa' },
];

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
}

const LIGHT_BASE: Record<string, string> = {
  '--color-base-100': '#ffffff',
  '--color-base-200': '#f4f4f6',
  '--color-base-300': '#e6e6ea',
  '--color-base-content': '#1c1c1e',
  '--color-neutral': '#1f2430',
  '--color-neutral-content': '#f5f6f8',
};

const DARK_BASE: Record<string, string> = {
  '--color-base-100': '#101014',
  '--color-base-200': '#18181d',
  '--color-base-300': '#26262e',
  '--color-base-content': '#f3f4f6',
  '--color-neutral': '#e6e7ea',
  '--color-neutral-content': '#18181b',
};

const SEMANTIC: Record<string, string> = {
  '--color-info': '#3b82f6', '--color-info-content': '#ffffff',
  '--color-success': '#16a34a', '--color-success-content': '#ffffff',
  '--color-warning': '#d97706', '--color-warning-content': '#ffffff',
  '--color-error': '#dc2626', '--color-error-content': '#ffffff',
};

const SHAPE: Record<string, string> = {
  '--radius-selector': '0.5rem', '--radius-field': '0.5rem', '--radius-box': '0.9rem',
  '--size-selector': '0.25rem', '--size-field': '0.25rem', '--border': '1px', '--depth': '1', '--noise': '0',
};

/** Relative luminance of a #rrggbb color (0..1). */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const DARK_TEXT = '#1c1c1e';
const DARK_TEXT_LUM = luminance(DARK_TEXT);

/** Readable foreground (#1c1c1e or #ffffff) for a background color — picks whichever
 *  yields the higher WCAG contrast ratio, so light accents get dark text. */
export function contentColor(hex: string): string {
  const L = luminance(hex);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastDark = (L + 0.05) / (DARK_TEXT_LUM + 0.05);
  return contrastDark >= contrastWhite ? DARK_TEXT : '#ffffff';
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export function isValidHex(hex: string | undefined): hex is string {
  return !!hex && HEX_RE.test(hex);
}

export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function buildThemeVars(presetId: string, resolved: 'light' | 'dark', accent?: string): Record<string, string> {
  const preset = getPreset(presetId);
  const primary = isValidHex(accent) ? accent : preset.primary;
  const base = resolved === 'dark' ? DARK_BASE : LIGHT_BASE;
  return {
    ...base,
    ...SEMANTIC,
    ...SHAPE,
    '--color-primary': primary,
    '--color-primary-content': contentColor(primary),
    '--color-secondary': preset.secondary,
    '--color-secondary-content': contentColor(preset.secondary),
    '--color-accent': isValidHex(accent) ? accent : preset.accent,
    '--color-accent-content': contentColor(isValidHex(accent) ? accent : preset.accent),
  };
}

export interface ThemeConfig {
  preset: string;
  mode: ThemeMode;
  accent?: string;
  density: Density;
}

/** Apply a theme to the document root. Safe to call repeatedly. */
export function applyTheme(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveMode(theme.mode);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved === 'dark' ? 'cadence-dark' : 'cadence-light');
  root.style.colorScheme = resolved;
  const vars = buildThemeVars(theme.preset, resolved, theme.accent);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.fontSize = theme.density === 'compact' ? '14.5px' : '16px';
}
