import React, { useEffect, useMemo, useState } from 'react';
import { Mic, MicOff, Keyboard, Check, X, Wand2, AlertTriangle, CheckCircle2, Ban, Zap } from 'lucide-react';
import { useSpeech } from '../lib/useSpeech';
import { parseCommand } from '../lib/parser';
import { evaluateFeasibility } from '../lib/analysis';
import { CATEGORY_META, Category, ParsedCommand, PlanEvent, Priority } from '../lib/types';
import { durationToLabel, minutesToLabel } from '../lib/datetime';
import { newId } from '../lib/storage';

interface Props {
  events: PlanEvent[];
  now: Date;
  onAdd: (e: PlanEvent) => void;
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

export const VoiceCommand: React.FC<Props> = ({ events, now, onAdd }) => {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ParsedCommand | null>(null);

  const handleFinal = (finalText: string) => {
    setText(prev => (prev ? prev + ' ' : '') + finalText);
  };

  const speech = useSpeech(handleFinal);

  // Keep the textbox in sync with live transcript while listening
  useEffect(() => {
    if (speech.transcript) setText(speech.transcript);
  }, [speech.transcript]);

  const liveText = speech.listening && speech.interim ? `${text} ${speech.interim}`.trim() : text;

  const interpret = () => {
    const source = liveText.trim();
    if (!source) return;
    const parsed = parseCommand(source, now);
    setDraft(parsed);
  };

  const feasibility = useMemo(() => {
    if (!draft) return null;
    return evaluateFeasibility(draft, events, now);
  }, [draft, events, now]);

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
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg flex items-center gap-2">
            <Wand2 size={20} className="text-primary" /> Plan by voice
          </h2>
          {!speech.supported && (
            <span className="badge badge-warning badge-sm gap-1"><Keyboard size={12} /> Type mode</span>
          )}
        </div>
        <p className="text-xs text-base-content/60 -mt-1">
          Say something like “book a dentist appointment next Tuesday at 3pm”.
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
            value={liveText}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) interpret(); }}
            placeholder={speech.listening ? 'Listening…' : 'Type or speak a plan, then Interpret'}
            rows={2}
            className="textarea textarea-bordered flex-1 text-sm resize-none"
          />
        </div>

        {speech.error && (
          <div className="alert alert-warning py-2 px-3 text-xs mt-1">
            <AlertTriangle size={14} /> {speech.error}
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
                  {Object.entries(CATEGORY_META).map(([k, m]) => (
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
            {feasibility && <FeasibilityBox f={feasibility} />}

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

const FeasibilityBox: React.FC<{ f: ReturnType<typeof evaluateFeasibility> }> = ({ f }) => {
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
    </div>
  );
};
