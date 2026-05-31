import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, Trash2, CalendarClock, MapPin, AlignLeft } from 'lucide-react';
import { Category, ParsedCommand, PlanEvent, Priority } from '../lib/types';
import { durationToLabel, minutesToLabel } from '../lib/datetime';
import { evaluateFeasibility } from '../lib/analysis';
import { newId } from '../lib/storage';
import { useSettings } from './SettingsContext';
import { workingHours } from '../lib/settings';

interface Props {
  open: boolean;
  /** The event being edited, or null when creating a new one. */
  event: PlanEvent | null;
  defaultDate: string;
  /** Initial start time (minutes) for a new event, e.g. a clicked day-view slot. */
  defaultStart?: number;
  events: PlanEvent[];
  now: Date;
  onClose: () => void;
  onSave: (event: PlanEvent) => void;
  onDelete?: (id: string) => void;
}

interface Draft {
  title: string;
  date: string;
  start: number;
  duration: number;
  category: Category;
  priority: Priority;
  allDay: boolean;
  location: string;
  description: string;
}

const minToInput = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const inputToMin = (v: string): number | null => {
  const mm = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!mm) return null;
  return (+mm[1]) * 60 + (+mm[2]);
};

function draftFrom(event: PlanEvent | null, defaultDate: string, defaultStart?: number): Draft {
  if (event) {
    return {
      title: event.title,
      date: event.date,
      start: event.start,
      duration: event.duration,
      category: event.category,
      priority: event.priority,
      allDay: !!event.allDay,
      location: event.location ?? '',
      description: event.description ?? '',
    };
  }
  return { title: '', date: defaultDate, start: defaultStart ?? 9 * 60, duration: 60, category: 'work', priority: 'medium', allDay: false, location: '', description: '' };
}

export const EventEditor: React.FC<Props> = ({ open, event, defaultDate, defaultStart, events, now, onClose, onSave, onDelete }) => {
  const { settings, categoryMeta } = useSettings();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(event, defaultDate, defaultStart));

  // Re-seed whenever the editor opens for a different event/date.
  useEffect(() => {
    if (open) setDraft(draftFrom(event, defaultDate, defaultStart));
  }, [open, event, defaultDate, defaultStart]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const patch = (p: Partial<Draft>) => setDraft(d => ({ ...d, ...p }));

  // Toggling all-day off restores a sensible time when the draft carried 0/0.
  const toggleAllDay = (allDay: boolean) => setDraft(d => {
    if (!allDay && d.start === 0 && d.duration === 0) {
      return { ...d, allDay, start: defaultStart ?? 9 * 60, duration: 60 };
    }
    return { ...d, allDay };
  });

  const feasibility = useMemo(() => {
    if (!open || draft.allDay) return null;
    const candidate: ParsedCommand = {
      title: draft.title || 'Untitled',
      date: draft.date,
      start: draft.start,
      duration: draft.duration,
      category: draft.category,
      priority: draft.priority,
      confidence: 1,
      notes: [],
      assumedTime: false,
    };
    // Exclude the event being edited so it doesn't conflict with itself.
    const others = event ? events.filter(e => e.id !== event.id) : events;
    return evaluateFeasibility(candidate, others, now, workingHours(settings));
    // Depend only on fields that affect feasibility (not title/location/notes).
  }, [open, draft.allDay, draft.date, draft.start, draft.duration, draft.category, draft.priority, events, event, now, settings]);

  if (!open) return null;

  const save = () => {
    const merged: PlanEvent = {
      id: event?.id ?? newId(),
      title: draft.title.trim() || 'Untitled event',
      date: draft.date,
      start: draft.allDay ? 0 : draft.start,
      duration: draft.allDay ? 0 : Math.max(5, draft.duration),
      category: draft.category,
      priority: draft.priority,
      done: event?.done ?? false,
      createdVia: event?.createdVia ?? 'manual',
      allDay: draft.allDay || undefined,
      location: draft.location.trim() || undefined,
      description: draft.description.trim() || undefined,
      source: event?.source,
      importUid: event?.importUid,
    };
    onSave(merged);
    onClose();
  };

  const verdictTone: Record<string, string> = {
    feasible: 'text-success', tight: 'text-warning', conflict: 'text-error', overloaded: 'text-error',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="card bg-base-100 shadow-2xl w-full max-w-lg my-auto" role="dialog" aria-modal="true" aria-label={event ? 'Edit event' : 'New event'} onClick={e => e.stopPropagation()}>
        <div className="card-body p-5 gap-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg flex items-center gap-2">
              <CalendarClock size={20} className="text-primary" /> {event ? 'Edit event' : 'New event'}
            </h2>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>

          <input
            autoFocus
            value={draft.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder="Event title"
            className="input input-bordered w-full font-semibold"
          />

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={draft.allDay} onChange={e => toggleAllDay(e.target.checked)} />
              All day
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="form-control">
              <span className="text-[0.65rem] text-base-content/50 mb-0.5">Date</span>
              <input type="date" value={draft.date} onChange={e => patch({ date: e.target.value })} className="input input-bordered input-sm" />
            </label>
            {!draft.allDay && (
              <label className="form-control">
                <span className="text-[0.65rem] text-base-content/50 mb-0.5">Start</span>
                <input type="time" value={minToInput(draft.start)} onChange={e => { const m = inputToMin(e.target.value); if (m != null) patch({ start: m }); }} className="input input-bordered input-sm" />
              </label>
            )}
            {!draft.allDay && (
              <label className="form-control">
                <span className="text-[0.65rem] text-base-content/50 mb-0.5">Duration</span>
                <select value={draft.duration} onChange={e => patch({ duration: Number(e.target.value) })} className="select select-bordered select-sm">
                  {[15, 30, 45, 60, 90, 120, 180, 240, 360, 480].map(d => <option key={d} value={d}>{durationToLabel(d)}</option>)}
                </select>
              </label>
            )}
            <label className="form-control">
              <span className="text-[0.65rem] text-base-content/50 mb-0.5">Category</span>
              <select value={draft.category} onChange={e => patch({ category: e.target.value as Category })} className="select select-bordered select-sm">
                {(Object.keys(categoryMeta) as Category[]).map(k => <option key={k} value={k}>{categoryMeta[k].emoji} {categoryMeta[k].label}</option>)}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] text-base-content/50">Priority</span>
            <div className="join">
              {(['low', 'medium', 'high'] as Priority[]).map(p => (
                <button key={p} className={`btn btn-xs join-item ${draft.priority === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patch({ priority: p })}>{p}</button>
              ))}
            </div>
          </div>

          <label className="input input-bordered input-sm flex items-center gap-2">
            <MapPin size={14} className="opacity-50" />
            <input value={draft.location} onChange={e => patch({ location: e.target.value })} placeholder="Location (optional)" className="grow" />
          </label>

          <label className="textarea textarea-bordered flex items-start gap-2 text-sm">
            <AlignLeft size={14} className="opacity-50 mt-1" />
            <textarea value={draft.description} onChange={e => patch({ description: e.target.value })} placeholder="Notes (optional)" rows={2} className="grow resize-none bg-transparent focus:outline-none" />
          </label>

          {feasibility && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className={`text-xs flex items-center gap-1.5 ${verdictTone[feasibility.verdict]}`}>
                <span className="font-semibold">{feasibility.headline}</span>
                <span className="opacity-70">· health {feasibility.healthBefore} → {feasibility.healthAfter}</span>
              </div>
              {feasibility.suggestedStart != null && (
                <button
                  type="button"
                  className="btn btn-xs btn-primary gap-1"
                  onClick={() => patch({ start: feasibility.suggestedStart })}
                >
                  <CalendarClock size={13} /> Move to {minutesToLabel(feasibility.suggestedStart)}
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button className="btn btn-primary btn-sm flex-1 gap-1" onClick={save}><Check size={16} /> {event ? 'Save' : 'Add event'}</button>
            {event && onDelete && (
              <button className="btn btn-ghost btn-sm text-error gap-1" onClick={() => { onDelete(event.id); onClose(); }}><Trash2 size={16} /> Delete</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};
