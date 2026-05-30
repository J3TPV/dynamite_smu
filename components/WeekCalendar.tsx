import React from 'react';
import { ChevronLeft, ChevronRight, Trash2, Check } from 'lucide-react';
import { CATEGORY_META, PlanEvent } from '../lib/types';
import { addDays, durationToLabel, minutesToLabel, startOfWeek, toISODate, weekdayShort } from '../lib/datetime';
import { overlaps } from '../lib/analysis';

const VIEW_START = 6 * 60; // 6:00
const VIEW_END = 22 * 60; // 22:00
const HOUR_PX = 46;
const TOTAL_PX = ((VIEW_END - VIEW_START) / 60) * HOUR_PX;

interface Props {
  events: PlanEvent[];
  weekStart: Date;
  selectedDate: string;
  today: string;
  onSelectDate: (iso: string) => void;
  onShiftWeek: (delta: number) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
}

export const WeekCalendar: React.FC<Props> = ({
  events, weekStart, selectedDate, today, onSelectDate, onShiftWeek, onToggleDone, onDelete,
}) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: (VIEW_END - VIEW_START) / 60 + 1 }, (_, i) => VIEW_START + i * 60);
  const monthLabel = `${weekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;

  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body p-3 md:p-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="font-bold text-base">{monthLabel}</h2>
          <div className="join">
            <button className="btn btn-sm btn-ghost join-item" onClick={() => onShiftWeek(-1)} aria-label="Previous week">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-sm btn-ghost join-item" onClick={() => onShiftWeek(0)}>Today</button>
            <button className="btn btn-sm btn-ghost join-item" onClick={() => onShiftWeek(1)} aria-label="Next week">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Day header row */}
            <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
              <div />
              {days.map(d => {
                const iso = toISODate(d);
                const isToday = iso === today;
                const isSel = iso === selectedDate;
                return (
                  <button
                    key={iso}
                    onClick={() => onSelectDate(iso)}
                    className={`flex flex-col items-center py-1.5 rounded-t-lg transition-colors ${
                      isSel ? 'bg-primary text-primary-content' : 'hover:bg-base-300'
                    }`}
                  >
                    <span className="text-[0.65rem] uppercase opacity-70">{weekdayShort(d)}</span>
                    <span className={`text-sm font-bold ${isToday && !isSel ? 'text-primary' : ''}`}>
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
              {/* Hour labels */}
              <div className="relative" style={{ height: TOTAL_PX }}>
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute right-1 -translate-y-1/2 text-[0.6rem] text-base-content/40"
                    style={{ top: ((h - VIEW_START) / 60) * HOUR_PX }}
                  >
                    {minutesToLabel(h).replace(':00', '')}
                  </div>
                ))}
              </div>

              {days.map(d => {
                const iso = toISODate(d);
                const dayEvents = events.filter(e => e.date === iso).sort((a, b) => a.start - b.start);
                return (
                  <div
                    key={iso}
                    className={`relative border-l border-base-300 ${iso === selectedDate ? 'bg-primary/5' : ''}`}
                    style={{ height: TOTAL_PX }}
                    onClick={() => onSelectDate(iso)}
                  >
                    {/* hour lines */}
                    {hours.map(h => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-base-300/60"
                        style={{ top: ((h - VIEW_START) / 60) * HOUR_PX }}
                      />
                    ))}
                    {dayEvents.map(e => (
                      <EventBlock
                        key={e.id}
                        e={e}
                        siblings={dayEvents}
                        onToggleDone={onToggleDone}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventBlock: React.FC<{
  e: PlanEvent;
  siblings: PlanEvent[];
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ e, siblings, onToggleDone, onDelete }) => {
  const meta = CATEGORY_META[e.category];
  const clampedStart = Math.max(e.start, VIEW_START);
  const clampedEnd = Math.min(e.start + e.duration, VIEW_END);
  const top = ((clampedStart - VIEW_START) / 60) * HOUR_PX;
  const height = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_PX, 16);

  // Side-by-side layout for overlapping events
  const group = siblings.filter(s => overlaps(s, e));
  const idx = group.findIndex(s => s.id === e.id);
  const cols = group.length;
  const widthPct = 100 / cols;
  const leftPct = widthPct * idx;

  const conflict = group.length > 1;

  return (
    <div
      className="absolute px-0.5"
      style={{ top, height, left: `${leftPct}%`, width: `${widthPct}%` }}
      onClick={ev => ev.stopPropagation()}
    >
      <div
        className={`group relative h-full rounded-md px-1.5 py-1 overflow-hidden text-white shadow-sm cursor-default ${e.done ? 'opacity-50' : ''}`}
        style={{ backgroundColor: meta.color, outline: conflict ? '2px solid #9e3d32' : 'none' }}
        title={`${e.title} · ${minutesToLabel(e.start)} · ${durationToLabel(e.duration)}${conflict ? ' · ⚠ overlaps another event' : ''}`}
      >
        <div className={`text-[0.7rem] font-semibold leading-tight truncate ${e.done ? 'line-through' : ''}`}>
          {e.priority === 'high' && '🔴 '}{meta.emoji} {e.title}
        </div>
        {height > 28 && (
          <div className="text-[0.6rem] opacity-90 leading-tight">{minutesToLabel(e.start)}</div>
        )}
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
          <button
            className="rounded bg-black/30 hover:bg-black/50 p-0.5"
            onClick={() => onToggleDone(e.id)}
            aria-label="Mark done"
          >
            <Check size={11} />
          </button>
          <button
            className="rounded bg-black/30 hover:bg-error p-0.5"
            onClick={() => onDelete(e.id)}
            aria-label="Delete event"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};
