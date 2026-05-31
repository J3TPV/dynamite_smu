import React, { useRef } from 'react';
import { Palette, Clock, Tag, Database, Download, Upload, RotateCcw, Sun, Moon, Monitor, Trash2, Check } from 'lucide-react';
import { Category, PlanEvent } from '../lib/types';
import { THEME_PRESETS, getPreset, ThemeMode, Density } from '../lib/theme';
import { useSettings } from './SettingsContext';
import { mergeSettings } from '../lib/settings';
import { sanitizeEvents } from '../lib/storage';

interface Props {
  events: PlanEvent[];
  onReplaceEvents: (events: PlanEvent[]) => void;
}

const minToInput = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/** Parse an <input type=time> value, returning null for empty/invalid (so a cleared field is ignored). */
const parseTimeInput = (v: string): number | null => {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const mins = (+m[1]) * 60 + (+m[2]);
  return mins >= 0 && mins <= 1439 ? mins : null;
};
/** First grapheme cluster, so ZWJ/variation-selector emoji aren't truncated into a different glyph. */
const firstGrapheme = (v: string): string => {
  if (!v) return '';
  try {
    const seg = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
    for (const s of seg.segment(v)) return s.segment;
    return '';
  } catch {
    return [...v][0] || '';
  }
};

export const SettingsPage: React.FC<Props> = ({ events, onReplaceEvents }) => {
  const { settings, setSettings, resetSettings, categoryMeta } = useSettings();
  const importRef = useRef<HTMLInputElement>(null);

  const patchTheme = (p: Partial<typeof settings.theme>) => setSettings(s => ({ ...s, theme: { ...s.theme, ...p } }));
  const patchCategory = (cat: Category, p: { label?: string; color?: string; emoji?: string }) =>
    setSettings(s => ({ ...s, categories: { ...s.categories, [cat]: { ...s.categories[cat], ...p } } }));
  const resetCategory = (cat: Category) => setSettings(s => { const c = { ...s.categories }; delete c[cat]; return { ...s, categories: c }; });

  const activeAccent = settings.theme.accent || getPreset(settings.theme.preset).primary;

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, events, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const restored = sanitizeEvents(data.events);
      const restoredSettings = data.settings ? mergeSettings(data.settings) : null;
      if (data.events === undefined && !restoredSettings) {
        alert('That file isn’t a valid Cadence backup.');
      } else {
        if (data.events !== undefined) onReplaceEvents(restored);
        if (restoredSettings) setSettings(() => restoredSettings);
      }
    } catch {
      alert('That file isn’t a valid Cadence backup.');
    }
    if (importRef.current) importRef.current.value = '';
  };

  const clearAll = () => {
    if (confirm(`Delete all ${events.length} events? This can’t be undone.`)) onReplaceEvents([]);
  };

  const modes: { id: ThemeMode; label: string; Icon: React.FC<{ size?: number }> }[] = [
    { id: 'system', label: 'System', Icon: Monitor }, { id: 'light', label: 'Light', Icon: Sun }, { id: 'dark', label: 'Dark', Icon: Moon },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Theme studio */}
      <Section icon={<Palette size={18} className="text-primary" />} title="Theme studio">
        <div className="space-y-4">
          <div>
            <Label>Appearance</Label>
            <div className="join">
              {modes.map(({ id, label, Icon }) => (
                <button key={id} className={`btn btn-sm join-item gap-1 ${settings.theme.mode === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patchTheme({ mode: id })}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Preset</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEME_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => patchTheme({ preset: p.id, accent: undefined })}
                  className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${settings.theme.preset === p.id && !settings.theme.accent ? 'border-primary ring-1 ring-primary' : 'border-base-300 hover:bg-base-200'}`}
                >
                  <span className="flex -space-x-1">
                    <span className="w-4 h-4 rounded-full border border-base-100" style={{ backgroundColor: p.primary }} />
                    <span className="w-4 h-4 rounded-full border border-base-100" style={{ backgroundColor: p.secondary }} />
                    <span className="w-4 h-4 rounded-full border border-base-100" style={{ backgroundColor: p.accent }} />
                  </span>
                  <span className="text-sm">{p.name}</span>
                  {settings.theme.preset === p.id && !settings.theme.accent && <Check size={14} className="text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Custom accent</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={activeAccent} onChange={e => patchTheme({ accent: e.target.value })} className="w-10 h-9 rounded cursor-pointer bg-base-200 border border-base-300" aria-label="Accent color" />
                <code className="text-xs">{activeAccent}</code>
                {settings.theme.accent && <button className="btn btn-ghost btn-xs gap-1" onClick={() => patchTheme({ accent: undefined })}><RotateCcw size={12} /> Reset</button>}
              </div>
            </div>
            <div>
              <Label>Density</Label>
              <div className="join">
                {(['comfortable', 'compact'] as Density[]).map(d => (
                  <button key={d} className={`btn btn-sm join-item capitalize ${settings.theme.density === d ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patchTheme({ density: d })}>{d}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Working hours */}
      <Section icon={<Clock size={18} className="text-primary" />} title="Schedule preferences">
        <div className="flex flex-wrap gap-4">
          <div>
            <Label>Day starts</Label>
            <input type="time" value={minToInput(settings.dayStart)} onChange={e => { const m = parseTimeInput(e.target.value); if (m != null) setSettings(s => ({ ...s, dayStart: Math.min(m, s.dayEnd - 15) })); }} className="input input-bordered input-sm" />
          </div>
          <div>
            <Label>Day ends</Label>
            <input type="time" value={minToInput(settings.dayEnd)} onChange={e => { const m = parseTimeInput(e.target.value); if (m != null) setSettings(s => ({ ...s, dayEnd: Math.max(m, s.dayStart + 15) })); }} className="input input-bordered input-sm" />
          </div>
          <div>
            <Label>Week starts on</Label>
            <div className="join">
              <button className={`btn btn-sm join-item ${settings.weekStartsOn === 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSettings({ weekStartsOn: 1 })}>Monday</button>
              <button className={`btn btn-sm join-item ${settings.weekStartsOn === 0 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSettings({ weekStartsOn: 0 })}>Sunday</button>
            </div>
          </div>
        </div>
        <p className="text-xs text-base-content/50 mt-2">These define the calendar window and the “healthy hours” used in your Time-Health score.</p>
      </Section>

      {/* Category editor */}
      <Section icon={<Tag size={18} className="text-primary" />} title="Categories">
        <div className="space-y-2">
          {(Object.keys(categoryMeta) as Category[]).map(k => {
            const meta = categoryMeta[k];
            const overridden = !!settings.categories[k];
            return (
              <div key={k} className="flex items-center gap-2">
                <input type="color" value={meta.color} onChange={e => patchCategory(k, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-base-200 border border-base-300" aria-label={`${meta.label} color`} />
                <input value={meta.emoji} onChange={e => patchCategory(k, { emoji: firstGrapheme(e.target.value) })} className="input input-bordered input-sm w-14 text-center" aria-label={`${meta.label} emoji`} />
                <input value={meta.label} onChange={e => patchCategory(k, { label: e.target.value })} className="input input-bordered input-sm flex-1" aria-label={`${k} label`} />
                <span className={`badge badge-sm ${meta.demanding ? 'badge-warning' : 'badge-ghost'}`}>{meta.demanding ? 'demanding' : 'recovery'}</span>
                {overridden && <button className="btn btn-ghost btn-xs btn-square" onClick={() => resetCategory(k)} aria-label="Reset category"><RotateCcw size={13} /></button>}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Data */}
      <Section icon={<Database size={18} className="text-primary" />} title="Your data">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm btn-outline gap-1" onClick={exportData}><Download size={15} /> Export backup</button>
          <button className="btn btn-sm btn-outline gap-1" onClick={() => importRef.current?.click()}><Upload size={15} /> Restore backup</button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); }} />
          <button className="btn btn-sm btn-ghost text-error gap-1" onClick={clearAll}><Trash2 size={15} /> Clear all events</button>
        </div>
        <p className="text-xs text-base-content/50 mt-2">Backups include your events and all settings as a JSON file. Everything stays on this device.</p>
        <button className="btn btn-ghost btn-xs gap-1 mt-3" onClick={() => { if (confirm('Reset all settings to defaults?')) resetSettings(); }}><RotateCcw size={12} /> Reset settings to defaults</button>
      </Section>
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="card bg-base-200 shadow-sm">
    <div className="card-body p-4">
      <h3 className="font-bold flex items-center gap-2 mb-1">{icon} {title}</h3>
      {children}
    </div>
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[0.7rem] uppercase tracking-wide text-base-content/50 mb-1">{children}</div>
);
