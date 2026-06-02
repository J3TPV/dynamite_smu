import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Keyboard, Check, X, Wand2, AlertTriangle, CheckCircle2, Ban, Zap, CalendarClock, Pencil, Undo2 } from 'lucide-react';
import { useSpeech } from '../lib/useSpeech';
import { parseCommand } from '../lib/parser';
import { evaluateFeasibility } from '../lib/analysis';
import { Category, ParsedCommand, PlanEvent, Priority } from '../lib/types';
import { durationToLabel, minutesToLabel, relativeDayLabel } from '../lib/datetime';
import { newId } from '../lib/storage';
import { useCategoryMeta, useSettings } from './SettingsContext';
import { workingHours } from '../lib/settings';

interface Props {
  events: PlanEvent[];
  now: Date;
  onAdd: (e: PlanEvent) => void;
  onEdit?: (e: PlanEvent) => void;
  onDelete?: (id: string) => void;
}

const EXAMPLES = [
  'Schedule a team meeting tomorrow at 2pm for 1 hour',
  'Gym for 45 minutes this evening',
  'Study for the exam Monday morning, high priority',
  'Dinner with friends Friday at 7',
];

function minutesToTimeInput(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
function timeInputToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

export const VoiceCommand: React.FC<Props> = ({ events, now, onAdd, onEdit, onDelete }) => {
  const categoryMeta = useCategoryMeta();
  const { settings } = useSettings();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ParsedCommand | null>(null);
  const [autoAdd, setAutoAdd] = useState(true);
  const [lastAdded, setLastAdded] = useState<PlanEvent | null>(null);

  const autoAddRef = useRef(autoAdd); autoAddRef.current = autoAdd;
  const textRef = useRef('');
  useEffect(() => { textRef.current = text; }, [text]);
  const speechRef = useRef<ReturnType<typeof useSpeech> | null>(null);

  // After a spoken phrase, add it straight to the calendar (no confirm step).
  // Falls back to the editable draft if the phrase was too vague to parse.
  const doAutoAdd = (src: string) => {
    const s = src.trim();
    if (!s) return;
    const parsed = parseCommand(s, now);
    if (parsed.title === 'Untitled' && parsed.confidence < 0.4) {
      setText(s); textRef.current = s; setDraft(parsed);
      return;
    }
    const ev: PlanEvent = {
      id: newId(), title: parsed.title, date: parsed.date, start: parsed.start, duration: parsed.duration,
      category: parsed.category, priority: parsed.priority, done: false, createdVia: 'voice', source: s,
    };
    onAdd(ev);
    setLastAdded(ev);
    setText(''); textRef.current = ''; setDraft(null);
    speechRef.current?.reset();
  };

  const handleFinal = (finalText: string) => {
    const next = (textRef.current ? textRef.current + ' ' : '') + finalText;
    textRef.current = next;
    setText(next);
    if (autoAddRef.current) setTimeout(() => doAutoAdd(next), 0);
  };

  const speech = useSpeech(handleFinal);
  speechRef.current = speech;

  // Auto-dismiss the "added" confirmation after a few seconds.
  useEffect(() => {
    if (!lastAdded) return;
    const t = setTimeout(() => setLastAdded(null), 9000);
    return () => clearTimeout(t);
  }, [lastAdded]);

  // The textbox is the single source of truth (handleFinal appends final chunks).
  // Interim words are shown as a separate preview, never folded into the editable value.
  const liveText = (speech.listening && speech.interim ? `${text} ${speech.interim}` : text).trim();

  const interpret = () => {
    const source = liveText.trim();
    if (!source) return;
    const parsed = parseCommand(source, now);
    setDraft(parsed);
  };

  const feasibility = useMemo(() => {
    if (!draft) return null;
    return evaluateFeasibility(draft, events, now, workingHours(settings));
  }, [draft, events, now, settings]);

  const updateDraft = (patch: Partial<ParsedCommand>) => {
    setDraft(d => (d ? { ...d, ...patch } : d));
  };

  const confirm = () => {
    if (!draft) return;
    const event: PlanEvent = {
      id: newId(),
      title: draft.title,
      date: draft.date,
      start: draft.start,
      duration: draft.duration,
      category: draft.category,
      priority: draft.priority,
      done: false,
      createdVia: speech.transcript ? 'voice' : 'manual',
      source: liveText.trim(),
    };
    onAdd(event);
    setDraft(null);
    setText('');
    speech.reset();
  };

  const cancel = () => {
    setDraft(null);
  };

  const clearAll = () => {
    setText('');
    setDraft(null);
    speech.reset();
  };

  return (
    <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-base-300 shadow-md">
      <div className="card-body p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="card-title text-lg flex items-center gap-2">
            <Wand2 size={20} className="text-primary" /> Plan by voice
          </h2>
          <div className="flex items-center gap-2">
            {speech.supported && (
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" title="Add spoken events straight to the calendar without a confirmation step">
                <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={autoAdd} onChange={e => setAutoAdd(e.target.checked)} />
                Auto-add
              </label>
            )}
            {!speech.supported && (
              <span className="badge badge-warning badge-sm gap-1"><Keyboard size={12} /> Type mode</span>
            )}
          </div>
        </div>
        <p className="text-xs text-base-content/60 -mt-1">
          {speech.supported && autoAdd
            ? 'Tap the mic, say your plan, and it’s added to your calendar automatically.'
            : 'Say something like “book a dentist appointment next Tuesday at 3pm”.'}
        </p>

        {/* Mic + input row */}
        <div className="flex items-stretch gap-2 mt-2">
          {speech.supported && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              className={`btn btn-circle btn-lg shrink-0 ${speech.listening ? 'btn-error animate-pulse' : 'btn-primary'}`}
              aria-label={speech.listening ? 'Stop listening' : 'Start voice command'}
            >
              {speech.listening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) interpret(); }}
            placeholder={speech.listening ? 'Listening…' : 'Type or speak a plan, then Interpret'}
            rows={2}
            className="textarea textarea-bordered flex-1 text-sm resize-none"
          />
        </div>
        {speech.listening && speech.interim && (
          <div className="text-xs italic text-base-content/50 mt-1">🎙 {speech.interim}</div>
        )}

        {speech.error && (
          <div className="alert alert-warning py-2 px-3 text-xs mt-1">
            <AlertTriangle size={14} /> {speech.error}
          </div>
        )}

        {lastAdded && (
          <div className="alert alert-success py-2 px-3 text-xs mt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="truncate">Added “{lastAdded.title}” · {relativeDayLabel(lastAdded.date, now)}{lastAdded.allDay ? '' : ` at ${minutesToLabel(lastAdded.start)}`}</span>
            </span>
            <span className="flex gap-1 shrink-0">
              {/* Resolve the live event by id so Edit opens any drag/resize changes
                  made since it was added, not the stale just-added snapshot (#8). */}
              <button className="btn btn-ghost btn-xs gap-1" onClick={() => { const live = events.find(ev => ev.id === lastAdded.id); if (live) onEdit?.(live); setLastAdded(null); }}><Pencil size={12} /> Edit</button>
              <button className="btn btn-ghost btn-xs gap-1" onClick={() => { onDelete?.(lastAdded.id); setLastAdded(null); }}><Undo2 size={12} /> Undo</button>
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          <button className="btn btn-secondary btn-sm gap-1" onClick={interpret} disabled={!liveText.trim()}>
            <Zap size={15} /> Interpret
          </button>
          {(text || draft) && (
            <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear</button>
          )}
        </div>

        {/* Example chips */}
        {!draft && !liveText && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                className="badge badge-outline badge-sm hover:badge-primary cursor-pointer py-2.5 font-normal"
                onClick={() => setText(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Parsed draft + feasibility */}
        {draft && (
          <div className="mt-3 rounded-xl bg-base-100 p-4 border border-base-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Interpreted plan</span>
              <span className="badge badge-sm badge-ghost">{Math.round(draft.confidence * 100)}% confident</span>
            </div>

            <input
              value={draft.title}
              onChange={e => updateDraft({ title: e.target.value })}
              className="input input-bordered input-sm w-full font-semibold"
            />

            <div className="grid grid-cols-2 gap-2">
              <label className="form-control">
                <span className="text-[0.65rem] text-base-content/50 mb-0.5">Date</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={e => updateDraft({ date: e.target.value })}
                  className="input input-bordered input-sm"
                />
              </label>
              <label className="form-control">
                <span className="text-[0.65rem] text-base-content/50 mb-0.5">Start</span>
                <input
                  type="time"
                  value={minutesToTimeInput(draft.start)}
                  onChange={e => updateDraft({ start: timeInputToMinutes(e.target.value) })}
                  className="input input-bordered input-sm"
                />
              </label>
              <label className="form-control">
                <span className="text-[0.65rem] text-base-content/50 mb-0.5">Duration</span>
                <select
                  value={draft.duration}
                  onChange={e => updateDraft({ duration: Number(e.target.value) })}
                  className="select select-bordered select-sm"
                >
                  {[15, 30, 45, 60, 90, 120, 180, 240].map(d => (
                    <option key={d} value={d}>{durationToLabel(d)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="text-[0.65rem] text-base-content/50 mb-0.5">Category</span>
                <select
                  value={draft.category}
                  onChange={e => updateDraft({ category: e.target.value as Category })}
                  className="select select-bordered select-sm"
                >
                  {Object.entries(categoryMeta).map(([k, m]) => (
                    <option key={k} value={k}>{m.emoji} {m.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] text-base-content/50">Priority</span>
              <div className="join">
                {(['low', 'medium', 'high'] as Priority[]).map(p => (
                  <button
                    key={p}
                    className={`btn btn-xs join-item ${draft.priority === p ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => updateDraft({ priority: p })}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Feasibility */}
            {feasibility && (
              <FeasibilityBox
                f={feasibility}
                onApplySuggestion={feasibility.suggestedStart != null ? () => updateDraft({ start: feasibility.suggestedStart }) : undefined}
              />
            )}

            <div className="flex gap-2 pt-1">
              <button className="btn btn-primary btn-sm flex-1 gap-1" onClick={confirm}>
                <Check size={16} /> Add to calendar
              </button>
              <button className="btn btn-ghost btn-sm gap-1" onClick={cancel}>
                <X size={16} /> Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FeasibilityBox: React.FC<{ f: ReturnType<typeof evaluateFeasibility>; onApplySuggestion?: () => void }> = ({ f, onApplySuggestion }) => {
  const tone = {
    feasible: { cls: 'border-success/40 bg-success/10 text-success', Icon: CheckCircle2 },
    tight: { cls: 'border-warning/40 bg-warning/10 text-warning', Icon: AlertTriangle },
    conflict: { cls: 'border-error/40 bg-error/10 text-error', Icon: Ban },
    overloaded: { cls: 'border-error/40 bg-error/10 text-error', Icon: AlertTriangle },
  }[f.verdict];
  const Icon = tone.Icon;
  const delta = f.healthAfter - f.healthBefore;

  return (
    <div className={`rounded-lg border p-3 ${tone.cls}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-sm">
          <Icon size={16} /> {f.headline}
        </div>
        <div className="text-xs font-mono opacity-80" title="Day Time-Health before → after">
          {f.healthBefore} → {f.healthAfter}
          {delta !== 0 && <span className="ml-1">({delta > 0 ? '+' : ''}{delta})</span>}
        </div>
      </div>
      <ul className="mt-1.5 space-y-1">
        {f.reasons.map((r, i) => (
          <li key={i} className="text-xs text-base-content/75">{r}</li>
        ))}
      </ul>
      {f.suggestions.length > 0 && (
        <ul className="mt-1.5 space-y-1 border-t border-current/15 pt-1.5">
          {f.suggestions.map((s, i) => (
            <li key={i} className="text-xs text-base-content/70 flex gap-1">💡 <span>{s}</span></li>
          ))}
        </ul>
      )}
      {onApplySuggestion && f.suggestedStart != null && (
        <button
          className="btn btn-xs btn-primary gap-1 mt-2"
          onClick={onApplySuggestion}
        >
          <CalendarClock size={13} /> Move to {minutesToLabel(f.suggestedStart)}
        </button>
      )}
    </div>
  );
};
