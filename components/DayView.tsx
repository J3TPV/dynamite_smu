import React from 'react';
import { Check, Trash2, Plus, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { PlanEvent } from '../lib/types';
import { durationToLabel, minutesToLabel } from '../lib/datetime';
import { overlaps } from '../lib/analysis';
import { packColumns, clockHourLines, snap, Slot } from '../lib/layout';
import { useCategoryMeta } from './SettingsContext';

const HOUR_PX = 56;

interface Props {
  dateISO: string;
  events: PlanEvent[];
  dayStart: number;
  dayEnd: number;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEventClick: (e: PlanEvent) => void;
  onAddAt: (startMinutes: number) => void;
  onMoveEvent: (id: string, patch: { date: string; start: number }) => void;
}

export const DayView: React.FC<Props> = ({ dateISO, events, dayStart, dayEnd, onToggleDone, onDelete, onEventClick, onAddAt, onMoveEvent }) => {
  const categoryMeta = useCategoryMeta();
  const dayEvents = events.filter(e => e.date === dateISO && !e.allDay).sort((a, b) => a.start - b.start);
  const allDay = events.filter(e => e.date === dateISO && e.allDay);
  const totalPx = ((dayEnd - dayStart) / 60) * HOUR_PX;
  const hourCount = Math.max(1, Math.round((dayEnd - dayStart) / 60));
  const lines = clockHourLines(dayStart, dayEnd);
  const slots = Array.from({ length: hourCount }, (_, i) => dayStart + i * 60); // clickable add-slots, excludes the dayEnd boundary
  const layout = packColumns(dayEvents);
  const earlier = dayEvents.filter(e => e.start + e.duration <= dayStart);
  const later = dayEvents.filter(e => e.start >= dayEnd);

  return (
    <div className="space-y-3">
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allDay.map(e => {
            const meta = categoryMeta[e.category];
            return (
              <button key={e.id} onClick={() => onEventClick(e)} className={`badge gap-1 text-white border-0 ${e.done ? 'opacity-50 line-through' : ''}`} style={{ backgroundColor: meta.color }}>
                {meta.emoji} {e.title}
              </button>
            );
          })}
        </div>
      )}

      {earlier.length > 0 && (
        <button className="btn btn-ghost btn-xs gap-1 text-base-content/60" onClick={() => onEventClick(earlier[0])}>
          <ChevronUp size={12} /> {earlier.length} earlier event{earlier.length > 1 ? 's' : ''} before {minutesToLabel(dayStart)}
        </button>
      )}

      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: '60px 1fr' }}>
          <div className="relative" style={{ height: totalPx }}>
            {lines.map(h => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[0.7rem] text-base-content/40" style={{ top: ((h - dayStart) / 60) * HOUR_PX }}>{minutesToLabel(h).replace(':00', '')}</div>
            ))}
          </div>
          <div
            className="relative border-l border-base-300"
            style={{ height: totalPx }}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={e => {
              e.preventDefault();
              const raw = e.dataTransfer.getData('text/plain'); if (!raw) return;
              try {
                const { id, grabMin } = JSON.parse(raw);
                const r = e.currentTarget.getBoundingClientRect();
                const start = Math.max(0, Math.min(snap(dayStart + ((e.clientY - r.top) / HOUR_PX) * 60 - (grabMin || 0)), 1440 - 15));
                onMoveEvent(id, { date: dateISO, start });
              } catch { /* ignore malformed drag payload */ }
            }}
          >
            {lines.map(h => (
              <div key={h} className="absolute left-0 right-0 border-t border-base-300/60 pointer-events-none" style={{ top: ((h - dayStart) / 60) * HOUR_PX }} />
            ))}
            {slots.map(s => {
              const top = ((s - dayStart) / 60) * HOUR_PX;
              return (
                <div
                  key={s}
                  className="absolute left-0 right-0 group/slot cursor-pointer hover:bg-primary/5"
                  style={{ top, height: Math.min(HOUR_PX, totalPx - top) }}
                  onClick={() => onAddAt(s)}
                >
                  <Plus size={12} className="opacity-0 group-hover/slot:opacity-40 absolute left-1 top-1" />
                </div>
              );
            })}
            {dayEvents.map(e => (
              <DayBlock key={e.id} e={e} slot={layout[e.id]} conflict={dayEvents.some(s => s.id !== e.id && overlaps(s, e))} meta={categoryMeta[e.category]} dayStart={dayStart} dayEnd={dayEnd} totalPx={totalPx} onToggleDone={onToggleDone} onDelete={onDelete} onEventClick={onEventClick} />
            ))}
            {dayEvents.length === 0 && allDay.length === 0 && (
              <div className="absolute inset-0 grid place-items-center text-sm text-base-content/40 pointer-events-none">Nothing scheduled — click a slot to add.</div>
            )}
          </div>
        </div>
      </div>

      {later.length > 0 && (
        <button className="btn btn-ghost btn-xs gap-1 text-base-content/60" onClick={() => onEventClick(later[0])}>
          <ChevronDown size={12} /> {later.length} later event{later.length > 1 ? 's' : ''} after {minutesToLabel(dayEnd)}
        </button>
      )}
    </div>
  );
};

const DayBlock: React.FC<{
  e: PlanEvent; slot?: Slot; conflict: boolean; meta: { color: string; emoji: string };
  dayStart: number; dayEnd: number; totalPx: number;
  onToggleDone: (id: string) => void; onDelete: (id: string) => void; onEventClick: (e: PlanEvent) => void;
}> = ({ e, slot, conflict, meta, dayStart, dayEnd, totalPx, onToggleDone, onDelete, onEventClick }) => {
  const clampedStart = Math.max(e.start, dayStart);
  const clampedEnd = Math.min(e.start + e.duration, dayEnd);
  if (clampedEnd <= clampedStart) return null;
  const top = ((clampedStart - dayStart) / 60) * HOUR_PX;
  const height = Math.max(Math.min(((clampedEnd - clampedStart) / 60) * HOUR_PX, totalPx - top), 16);

  const cols = slot?.cols ?? 1;
  const widthPct = 100 / cols;

  return (
    <div className="absolute px-1" style={{ top, height, left: `${widthPct * (slot?.col ?? 0)}%`, width: `${widthPct}%` }} onClick={ev => ev.stopPropagation()}>
      <div
        draggable
        onDragStart={ev => {
          const r = ev.currentTarget.getBoundingClientRect();
          const grabMin = ((ev.clientY - r.top) / HOUR_PX) * 60;
          ev.dataTransfer.setData('text/plain', JSON.stringify({ id: e.id, grabMin }));
          ev.dataTransfer.effectAllowed = 'move';
        }}
        className={`group relative h-full rounded-lg px-2 py-1 overflow-hidden text-white shadow cursor-grab active:cursor-grabbing ${e.done ? 'opacity-50' : ''}`}
        style={{ backgroundColor: meta.color, outline: conflict ? '2px solid var(--color-error)' : 'none' }}
        onClick={() => onEventClick(e)}
      >
        <div className={`text-sm font-semibold leading-tight truncate ${e.done ? 'line-through' : ''}`}>{e.priority === 'high' && '🔴 '}{meta.emoji} {e.title}</div>
        {height > 34 && <div className="text-[0.7rem] opacity-90">{minutesToLabel(e.start)} · {durationToLabel(e.duration)}</div>}
        {height > 60 && e.location && <div className="text-[0.7rem] opacity-90 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {e.location}</div>}
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
          <button className="rounded bg-black/30 hover:bg-black/50 p-1" onClick={ev => { ev.stopPropagation(); onToggleDone(e.id); }} aria-label="Mark done"><Check size={12} /></button>
          <button className="rounded bg-black/30 hover:bg-error p-1" onClick={ev => { ev.stopPropagation(); onDelete(e.id); }} aria-label="Delete"><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
};
